import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Readable } from 'stream'
import { parsers } from 'date-fns'

import ExecutionLog from '../models/executionLog.model'
import { ScenarioConfiguration } from '../models/types'
import { DockerServiceImplementation, IDockerService } from './docker.service'
import LoggingService from './logging.service'

interface ExecutionStatus {
    status: 'running' | 'complete' | 'error'
    logs?: string[]
    output?: Record<string, any>
    error?: string
    outputTypes?: Record<string, any>
}

export class PythonServiceImplementation {
    private static readonly DEFAULT_PYTHON_IMAGE = 'python:3.11-slim'
    private executions: Map<string, ExecutionStatus> = new Map()
    private dockerService: IDockerService
    private containerId: string

    constructor(containerId: string) {
        this.dockerService = new DockerServiceImplementation(PythonServiceImplementation.DEFAULT_PYTHON_IMAGE)
        this.containerId = containerId
    }

    // Package Management

    async installPackages(...packageNames: string[]): Promise<string> {
        await this.ensureContainerRunning(this.containerId)
        try {
            console.log('Executing command:', ['pip', 'install', ...packageNames])
            return await this.dockerService.executeCommand(this.containerId, ['pip', 'install', ...packageNames])
        } catch (error) {
            const errorString = `Failed to install Python packages: "${packageNames.join(', ')}" -> ${error.message}`
            throw new Error(errorString)
        }
    }

    async uninstallPackages(...packageNames: string[]): Promise<string> {
        try {
            await LoggingService.log({
                level: 'log',
                service: 'DockerService',
                message: `Uninstalling Python package: ${packageNames.join(', ')}`,
                data: { containerId: this.containerId },
            })

            return await this.dockerService.executeCommand(this.containerId, [
                'pip',
                'uninstall',
                '-y',
                ...packageNames,
            ])
        } catch (error) {
            await LoggingService.log({
                level: 'error',
                service: 'DockerService',
                message: `Failed to uninstall Python package ${packageNames.join(', ')}`,
                error,
                data: { containerId: this.containerId },
            })
            throw new Error(`Failed to uninstall Python package ${packageNames.join(', ')}: ${error.message}`)
        }
    }

    // Script Execution

    private sanitizePythonScript(scriptContent: string): void {
        // List of dangerous patterns that could allow breaking out of the container
        const dangerousPatterns = [
            // /open\s*\(/, // File operations
            // /\.write\s*\(/, // File writing
            // /pathlib/, // Path manipulation
            // /subprocess\./, // Subprocess execution
        ]

        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
            if (pattern.test(scriptContent)) {
                throw new Error('Script contains file system operations that are not allowed')
            }
        }
    }

    private formatImportStatements(requiredPackages: { name: string; alias?: string; version?: string }[]): string[] {
        return requiredPackages && requiredPackages.length > 0
            ? requiredPackages.map((pkg) => {
                  if (pkg.alias) {
                      return `import ${pkg.name} as ${pkg.alias}`
                  }
                  return `import ${pkg.name}`
              })
            : []
    }

    async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
        const status = this.executions.get(executionId)
        if (!status) {
            throw new Error('Execution not found')
        }
        return status
    }

    async ensureContainerRunning(containerId: string): Promise<void> {
        try {
            const containerInfo = await this.dockerService.inspectContainer(containerId)
            if (!containerInfo.State.Running) {
                await this.dockerService.startContainer(containerId)
            }
        } catch (error) {
            throw new Error(`Failed to ensure container is running: ${error.message}`)
        }
    }

    /**
     * Executes a Python script in parallel across multiple configurations
     * @param scriptId - Unique identifier for the script
     * @param scriptContent - The Python script content to execute
     * @param configurationsArray - Array of configurations, each containing inputs, outputs and packages
     * @param maxWorkers - Maximum number of worker processes to use (defaults to CPU count)
     * @returns Promise with an array of results corresponding to each configuration
     */
    async executeScriptParallel(
        scriptId = undefined,
        scriptContent: string,
        configurationsArray: Array<{
            index: number
            inputs: ScenarioConfiguration
        }>,
        requiredPackages: { name: string; alias?: string; version?: string }[],
        streamCallback?: (data: { log?: string; error?: string; dev?: string }) => void
    ): Promise<Array<Record<string, any>>> {
        // Ensure container is running before executing script
        await this.ensureContainerRunning(this.containerId)

        const startTime = new Date()
        const mainScriptPath = `/tmp/parallel_script_${scriptId}.py`
        const configsPath = `/tmp/configs_${scriptId}.json`
        const resultsPath = `/tmp/results_${scriptId}.json`

        const scriptLog = new ExecutionLog({
            scriptId: scriptId,
            startTime,
            status: 'running',
        })

        // Sanitize the script before execution
        this.sanitizePythonScript(scriptContent)

        // Process all configurations
        const processedConfigs: {
            index: number
            inputs: ScenarioConfiguration
        }[] = configurationsArray.map(({ index, inputs }) => {
            let sanitizedInputs = {}
            for (const [key, value] of Object.entries(inputs)) {
                const sanitizedKey = key
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_{2,}/g, '_')
                    .replace(/^_+|_+$/g, '')
                    .replace(/^\d/, '_$&')
                sanitizedInputs[sanitizedKey] = value
            }
            return {
                index,
                inputs: sanitizedInputs,
            }
        })

        console.log(`[python][config] Processed ${processedConfigs.length} configurations`)

        // Write configurations to JSON file in Node, then copy to container
        const localTmpPath = path.join(os.tmpdir(), `configs_${scriptId}.json`)
        fs.writeFileSync(localTmpPath, JSON.stringify(processedConfigs), 'utf8')
        // Copy the file into the container
        await this.dockerService.copyFileToContainer(this.containerId, localTmpPath, configsPath)

        console.log(`[python][config] Wrote ${processedConfigs.length} configurations to ${configsPath}`)

        // Create the parallel execution script
        const parallelScript = this.createParallelExecutionScript(
            scriptContent,
            configsPath,
            resultsPath,
            this.formatImportStatements(requiredPackages),
            8
        )

        console.log(`[python][script] Created parallel execution script`)

        // Write the parallel script to the container
        await this.dockerService.executeCommand(this.containerId, [
            'sh',
            '-c',
            `echo '${parallelScript.replace(/'/g, "'\\''")}' > ${mainScriptPath}`,
        ])

        console.log(`[python][script] Wrote parallel execution script to ${mainScriptPath}`)

        // Execute the parallel script
        const container = this.dockerService.getContainer(this.containerId)
        console.log(`[python][execution] Starting parallel execution of ${processedConfigs.length} configurations`)

        const exec = await container.exec({
            Cmd: ['python', mainScriptPath],
            AttachStdout: true,
            AttachStderr: true,
        })

        const stream = await exec.start({ hijack: true })

        console.log(`[python][execution] Started streaming output`)

        // Stream output and collect results
        let output = ''

        await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => {
                const data = chunk.toString()
                output += data

                if (data?.split('\n')?.length > 0) {
                    const lines = data.split('\n')
                    const log = lines
                        .filter((line) => line.trim().length > 0 && line.includes('PYLOG:'))
                        .map((line) => {
                            let sanitizedLine = line.replace(/[^\x00-\x7F]/g, '')
                            if (sanitizedLine.includes('PYLOG:')) {
                                let index = sanitizedLine.indexOf('PYLOG:')
                                return sanitizedLine.slice(index).trim()
                            }
                        })

                    const err = lines
                        .filter((line) => line.trim().length > 0 && line.includes('PYERR:'))
                        .map((line) => {
                            let sanitizedLine = line.replace(/[^\x00-\x7F]/g, '')
                            if (sanitizedLine.includes('PYERR:')) {
                                let index = sanitizedLine.indexOf('PYERR:')
                                return sanitizedLine.slice(index).trim()
                            }
                        })

                    if (log.length > 0 || err.length > 0) {
                        streamCallback?.({
                            log: log.join('\n'),
                            error: err.join('\n'),
                        })
                    }

                    const dev = lines
                        .filter((line) => line.trim().length > 0 && line.includes('PYDEV:'))
                        .map((line) => {
                            let sanitizedLine = line.replace(/[^\x00-\x7F]/g, '')
                            let index = sanitizedLine.indexOf('PYDEV:')
                            return sanitizedLine.slice(index).trim()
                        })
                        .join('\n')

                    console.log(dev)
                }
            })

            stream.on('end', () => {
                resolve()
            })

            stream.on('error', (error) => {
                reject(new Error(`Failed to execute parallel script: ${error.message}`))
            })
        })

        // Wait for completion marker to ensure file is fully written
        const completionMarker = `${resultsPath}.done`

        let attempts = 0
        const maxAttempts = 30 // Wait up to 30 seconds
        while (attempts < maxAttempts) {
            try {
                await this.dockerService.executeCommand(this.containerId, ['test', '-f', completionMarker])
                console.log(`[python][debug] Completion marker found, file writing is complete`)
                break
            } catch (error) {
                attempts++
                if (attempts >= maxAttempts) {
                    console.error(`[python][error] Timeout waiting for completion marker: ${completionMarker}`)
                    throw new Error(`Timeout waiting for results file completion: ${resultsPath}`)
                }
                console.log(`[python][debug] Waiting for completion marker... attempt ${attempts}/${maxAttempts}`)
                await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
            }
        }

        // Check if results file exists before trying to read it
        try {
            await this.dockerService.executeCommand(this.containerId, ['test', '-f', resultsPath])
        } catch (error) {
            console.error(`[python][error] Results file does not exist: ${resultsPath}`)
            throw new Error(`Results file was not created by Python script: ${resultsPath}`)
        }

        // Read results file
        const resultsContent = await this.dockerService.readFileFromContainer(this.containerId, resultsPath)

        console.log(`[python][debug] Successfully read results file, size: ${resultsContent.length} characters`)

        // Node-side: Parse JSONL (JSON Lines) incrementally for multiple results
        let cleanContent = resultsContent.replace(/^\uFEFF/, '') // Remove BOM if present

        const results = []
        const lines = cleanContent.split('\n')

        // Clean up any corruption characters that might have been introduced by the stream
        // But do this per line to preserve newlines
        const cleanLines = lines.map((line) => {
            return line
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
                .replace(/\uFFFD/g, '') // Remove replacement characters ()
                .replace(/[\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFEFF]/g, '') // Remove various Unicode spaces and symbols
                .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable ASCII and common Unicode
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2') // Fix malformed escape sequences
                .replace(/},L\s*{/g, '},{') // Fix random 'L' characters between JSON objects
                .replace(/},[A-Z]\s*{/g, '},{') // Fix any other random single letters between JSON objects
                .replace(/":\s*:\s*{/g, '": {') // Fix double colons like "outputs": : {
                .replace(/,\s*,/g, ',') // Fix double commas
                .replace(/{\s*,/g, '{') // Fix leading commas in objects
                .replace(/,\s*}/g, '}') // Fix trailing commas in objects
        })

        let successCount = 0
        let errorCount = 0

        for (let i = 0; i < cleanLines.length; i++) {
            const line = cleanLines[i].trim()

            if (line.length === 0) {
                continue // Skip empty lines
            }

            try {
                const parsed = JSON.parse(line)
                results.push(parsed)
                successCount++
            } catch (e) {
                errorCount++
                // console.warn(`[JSONL SKIP] Line ${i + 1} failed to parse:`, e.message)
                // console.log(`[JSONL DEBUG] Problematic line: ${line.substring(0, 100)}...`)

                // Try to fix common issues and retry
                try {
                    // Remove any leading/trailing garbage
                    const cleanedLine = line.replace(/^[^{]*/, '').replace(/[^}]*$/, '')
                    if (cleanedLine.startsWith('{') && cleanedLine.endsWith('}')) {
                        const parsed = JSON.parse(cleanedLine)
                        results.push(parsed)
                        successCount++
                        errorCount--
                        console.log(`[JSONL RECOVERY] Line ${i + 1} recovered after cleaning`)
                    }
                } catch (e2) {
                    // Give up on this line
                    console.log(`[JSONL FAILED] Line ${i + 1} could not be recovered`)
                }
            }
        }

        // console.log(`[JSONL SUMMARY] Successfully parsed ${successCount} results, ${errorCount} errors`)

        // Clean up temporary files
        await this.dockerService.executeCommand(this.containerId, ['rm', mainScriptPath])
        await this.dockerService.executeCommand(this.containerId, ['rm', configsPath])
        await this.dockerService.executeCommand(this.containerId, ['rm', resultsPath])
        await this.dockerService.executeCommand(this.containerId, ['rm', completionMarker])

        // Update script log
        if (scriptLog) {
            scriptLog.status = 'completed'
            scriptLog.endTime = new Date()
            scriptLog.executionTimeMs = scriptLog.endTime.getTime() - startTime.getTime()
            await scriptLog.save()
        }

        return results
    }

    private createParallelExecutionScript(
        scriptContent: string,
        configsPath: string,
        resultsPath: string,
        importPackages: string[],
        maxWorkers?: number
    ): string {
        return `
# Packages for operating the script
import json
import time
import traceback
import sys
from concurrent.futures import ProcessPoolExecutor
import os
import multiprocessing as mp

# Common imports needed for most scripts
import math
import base64
from datetime import datetime

# Imports defined for this evaluation function
${importPackages.join(`
`)}


results_path = '${resultsPath}'

# Clean up any existing results file before writing
if os.path.exists(results_path):
    os.remove(results_path)

def log_with_timestamp(message, run_index=None):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    prefix = f"[Run {str(run_index).zfill(3)}]" if run_index is not None else ""
    print(f"PYDEV: [{timestamp}] {prefix} {message}")

def process_single_config(config):
    """Process a single configuration in a separate process"""
    try:
        run_index = config['index']
        # log_with_timestamp(f"Starting execution", run_index)
        
        # Create the input container
        class InputContainer:
            def __init__(self, **kwargs):
                for key, details in kwargs.items():
                    if 'value' not in details:
                        print(f"PYERR: Input value is required for {key}", file=sys.stderr)
                        continue
                    if 'type' not in details:
                        print(f"PYERR: Input type is required for {key}", file=sys.stderr)
                        continue

                    value = details['value']
                    value_type = details['type']
                    try:
                        if value_type == 'str':
                            setattr(self, key, str(value))
                        elif value_type == 'int':
                            setattr(self, key, int(value))
                        elif value_type == 'float':
                            setattr(self, key, float(value))
                        elif value_type == 'bool':
                            setattr(self, key, bool(value))
                        elif value_type == 'dict':
                            setattr(self, key, json.loads(value) if isinstance(value, str) else value)
                        elif value_type == 'array':
                            setattr(self, key, value)
                        elif value_type == 'csv':
                            setattr(self, key, str(value))
                        elif value_type == 'any':
                            setattr(self, key, json.loads(value) if isinstance(value, str) else value)
                        else:
                            print(f"PYERR: Unsupported type: {str(value_type)}", file=sys.stderr)
                    except ValueError as e:
                        print(f"PYERR: Error setting attribute {key} with value {value} as {value_type}: {e}", file=sys.stderr)

            def to_dict(self):
                return {k: v for k, v in vars(self).items() if not k.startswith('_')}

        class OutputContainer:
            def __init__(self):
                pass

            def to_dict(self):
                return {k: v for k, v in vars(self).items() if not k.startswith('_')}

        # Set up environment for this execution
        input = InputContainer(**config['inputs'])
        output = OutputContainer()

        start_time = time.time()

        user_script = '''${scriptContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}'''
        exec(user_script)
        
        execution_time = time.time() - start_time
        
        # log_with_timestamp(f"Execution completed in {execution_time:.2f} seconds", run_index)
        
        # Convert output to dictionary
        output_dict = output.to_dict()
        
        # Clean the output for JSON serialization
        def clean_for_json(obj):
            if isinstance(obj, (int, float)):
                return str(obj)  # Convert numbers to strings to avoid precision issues
            elif isinstance(obj, (list, tuple)):
                return [clean_for_json(item) for item in obj]
            elif isinstance(obj, dict):
                return {str(key): clean_for_json(value) for key, value in obj.items()}
            return obj
        
        clean_outputs = clean_for_json(output_dict)

        # Return the results with configuration index
        result = {
            "index": run_index,
            "success": True,
            "outputs": clean_outputs,
            "execution_time_ms": int(execution_time * 1000)
        }
        
        return result
        
    except Exception as e:
        error_trace = traceback.format_exc()
        log_with_timestamp(f"Error: {str(e)}", run_index)
        
        # Extract exception type and message
        exception_type = e.__class__.__name__
        error_message = str(e)
        
        # Try to extract the code context from the traceback
        code_context = ""
        traceback_lines = error_trace.splitlines()
        
        # Find lines that look like code (indented, not part of the traceback machinery)
        for i, line in enumerate(traceback_lines):
            if line.startswith('    ') and not line.strip().startswith('File "'):
                # This looks like a code line in the traceback
                code_context = line.strip()
                # If there's a line after this with a caret (^), this is definitely our culprit
                if i+1 < len(traceback_lines) and '^' in traceback_lines[i+1]:
                    break
        
        # Create a meaningful error message combining the exception type, actual error, and code context
        meaningful_error = f"PYERR: [RUN {run_index}] {exception_type}: {error_message}"
        if code_context:
            meaningful_error += f" in code: {code_context}"
        
        print(' '.join(meaningful_error.splitlines()), file=sys.stderr)
        
        return {
            "index": run_index,
            "success": False,
            "error": str(e),
            "traceback": error_trace
        }

def main():
    # Load configurations
    with open('${configsPath}', 'r') as f:
        configs = json.load(f)

    log_with_timestamp(f"Starting parallel execution of {len(configs)} configurations")
    
    # Determine number of workers
    cpu_count = mp.cpu_count()
    max_workers = ${maxWorkers || 'cpu_count'}
    workers = min(max_workers, cpu_count, len(configs))
    
    log_with_timestamp(f"Using {workers} worker processes (out of {cpu_count} CPUs available)")
    
    # Process configurations in parallel
    results = []
    start_time = time.time()
    
    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(process_single_config, config) for config in configs]
        for future in futures:
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                log_with_timestamp(f"Unhandled exception in worker: {str(e)}")
                results.append({
                    "success": False,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                })
    
    total_time = time.time() - start_time
    log_with_timestamp(f"All executions completed in {total_time:.2f} seconds")
    
    # Write results to file as JSONL (JSON Lines)
    # Split large results across multiple lines to avoid buffer issues
    with open(results_path, 'w') as f:
        for i, result in enumerate(results):
            # Write each result as a single JSON line (JSONL format)
            json_str = json.dumps(result, ensure_ascii=False)
            f.write(json_str + '''
''') # newline defined in the ONLY WAY THAT WILL EVER WORK. NEVER CHANGE THIS.
            
            f.flush()  # Force write to disk

    # Create completion marker file to signal that writing is done
    completion_marker = results_path + '.done'
    with open(completion_marker, 'w') as f:
        f.write(f"completed_{len(results)}_results")
        f.flush()
        os.fsync(f.fileno())  # Force sync to disk

    log_with_timestamp(f"Results written to {results_path}")


if __name__ == "__main__":
    main()
`
    }
}
