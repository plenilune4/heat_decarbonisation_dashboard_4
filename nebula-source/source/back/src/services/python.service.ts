import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Readable } from 'stream'

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

    async executeScript(
        scriptId = undefined,
        scriptContent: string,
        inputs: Record<string, any>,
        requiredPackages: { name: string; alias?: string; version?: string }[],
        outputs: Record<string, any>,
        onOutput?: (data: any) => void,
        runIndex?: number
    ) {
        // Ensure container is running before executing script
        await this.ensureContainerRunning(this.containerId)

        const startTime = new Date()

        const scriptPath = `/tmp/script_${scriptId}.py`
        const outputPath = `/tmp/output_${scriptId}.json`

        const scriptLog = new ExecutionLog({
            scriptId: scriptId,
            startTime,
            status: 'running',
            runIndex,
        })

        try {
            // Sanitize the script before execution
            this.sanitizePythonScript(scriptContent)

            // Format inputs with sanitized names
            const sanitizedInputs = this.sanitizeInputs(inputs)

            // Generate import statements for required packages
            const importStatements = this.formatImportStatements(requiredPackages)

            // Wrap the script with input/output handling and timestamps
            const wrappedScript = this.wrapScript(scriptContent, sanitizedInputs, importStatements, outputPath)

            // console.log(`~~~~ SCRIPT ~~~~

            // ${wrappedScript}

            // ~~~~ SCRIPT END ~~~~
            // `)

            // Write the script
            await this.dockerService.executeCommand(this.containerId, [
                'sh',
                '-c',
                `echo '${wrappedScript.replace(/'/g, "'\\''")}' > ${scriptPath}`,
            ])

            // Execute with streaming
            const container = this.dockerService.getContainer(this.containerId)

            // LoggingService.log({
            //     level: 'log',
            //     service: 'PythonService',
            //     message: 'Executing script',
            //     data: {
            //         scriptId,
            //         runIndex,
            //         containerId: this.containerId,
            //     },
            // })
            console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][execution] Starting`)

            const exec = await container.exec({
                Cmd: ['python', scriptPath],
                AttachStdout: true,
                AttachStderr: true,
            })
            const stream = await exec.start({ hijack: true })

            // Stream output
            const output = await this.streamOutput(
                stream,
                scriptLog,
                outputPath,
                scriptPath,
                startTime,
                outputs,
                onOutput,
                runIndex
            )

            console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][execution] Completed`)

            // Clean up temporary files
            await this.dockerService.executeCommand(this.containerId, ['rm', scriptPath])
            await this.dockerService.executeCommand(this.containerId, ['rm', outputPath])

            // Update script log with success status if it exists
            if (scriptLog) {
                scriptLog.status = 'completed'
                scriptLog.endTime = new Date()
                scriptLog.executionTimeMs = scriptLog.endTime.getTime() - startTime.getTime()
                await scriptLog.save()
            }

            return output
        } catch (error) {
            // Update script log with error status
            if (scriptLog) {
                scriptLog.status = 'failed'
                scriptLog.endTime = new Date()
                scriptLog.error = {
                    message: error.message,
                    stack: error.stack,
                }
                scriptLog.executionTimeMs = scriptLog.endTime.getTime() - startTime.getTime()
                await scriptLog.save()
            }
            throw new Error(
                `[container][Run ${runIndex.toString().padStart(3, '0')}][execution] Failed: ${error.message}`
            )
        }
    }

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

    private sanitizeInputs(inputs: Record<string, any>): Record<string, any> {
        return Object.entries(inputs || {}).reduce(
            (acc, [key, value]) => {
                const sanitizedKey = key
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_{2,}/g, '_')
                    .replace(/^_+|_+$/g, '')
                    .replace(/^\d/, '_$&')
                acc[sanitizedKey] = value
                return acc
            },
            {} as Record<string, any>
        )
    }

    private formatImportStatements(requiredPackages: { name: string; alias?: string; version?: string }[]): string {
        return requiredPackages && requiredPackages.length > 0
            ? requiredPackages
                  .map((pkg) => {
                      if (pkg.alias) {
                          return `import ${pkg.name} as ${pkg.alias}`
                      }
                      return `import ${pkg.name}`
                  })
                  .join('\n')
            : ''
    }

    private wrapScript(
        scriptContent: string,
        inputs: Record<string, any>,
        importStatements: string,
        outputPath: string
    ): string {
        return `
import time
import json
import os
import base64
import math
import sys
import traceback
from datetime import datetime

${importStatements ? importStatements + '\n' : ''}

def log_with_timestamp(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    print(f"PYDEV: [{timestamp}] {message}")

def emit_error(message, exc=None):
    error_obj = {
        "error": True,
        "message": message,
        "type": type(exc).__name__ if exc else None,
        "traceback": traceback.format_exc() if exc else None
    }
    print("PYERR:" + json.dumps(error_obj), file=sys.stderr)

class InputContainer:
    def __init__(self, **kwargs):
        for key, details in kwargs.items():
            if 'value' not in details:
                emit_error(f'Input value is required for {key}')
            if 'type' not in details:
                emit_error(f'Input type is required for {key}')

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
                    setattr(self, key, json.loads(value))
                elif value_type == 'array':
                    # setattr(self, key, [{'date': '2025-07-01T11:01:00.000Z', 'value': 2}])
                    setattr(self, key, value)
                elif value_type == 'csv':
                    setattr(self, key, str(value))
                elif value_type == 'any':
                    setattr(self, key, json.loads(value))
                else:
                    emit_error(f"Unsupported type: {str(value_type)}")
            except ValueError as e:
                emit_error(f"Error setting attribute {key} with value {value} as {value_type}: {e}")

    def to_dict(self):
        return {k: v for k, v in vars(self).items() if not k.startswith('_')}



class OutputContainer:
    def __init__(self):
        pass

    def to_dict(self):
        return {k: v for k, v in vars(self).items() if not k.startswith('_')}

    def write_to_file(self, path):
        def clean_for_json(obj):
            if isinstance(obj, (int, float)):
                return str(obj)  # Convert ALL numbers to strings to avoid precision issues
            elif isinstance(obj, (list, tuple)):
                return [clean_for_json(item) for item in obj]
            elif isinstance(obj, dict):
                return {str(key): clean_for_json(value) for key, value in obj.items()}
            return obj
        
        output_dict = self.to_dict()
        clean_outputs = clean_for_json(output_dict)

        print(f"PYDEV: output_dict: {output_dict}")
        print(f"PYDEV: clean_outputs: {clean_outputs}")
        print(f"PYDEV: writing to: {path}")

        # Write using the most basic, reliable approach
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(clean_outputs, f, ensure_ascii=True)
        
        # Verify file was written correctly
        with open(path, 'r', encoding='utf-8') as f:
            loaded_output = json.load(f)  # This will raise an exception if JSON is invalid
            print(f"PYDEV: loaded_output: {loaded_output}")
    
input = InputContainer(**${JSON.stringify(inputs)})
output = OutputContainer()

try:
    print("PYDEV: Script execution started")
    start_time = time.time()

    # Original script with proper indentation
${scriptContent
    .split('\n')
    .map((line) => '    ' + line)
    .join('\n')}

    # print(f"PYDEV: input.to_dict(): {input.to_dict()}")
    # print(f"PYDEV: output.to_dict(): {output.to_dict()}")

    # Collect outputs
    execution_time = time.time() - start_time
    # print(f"PYDEV: Script execution completed in {execution_time:.2f} seconds")

    # Ensure the output is clean and properly formatted JSON
    try:
        # Write using the most basic, reliable approach
        output.write_to_file('${outputPath}')
    except Exception as e:
        emit_error(f"Error with JSON output: {str(e)}")

except Exception as e:
    emit_error(f"Error executing script: {str(e)}")
    raise
`
    }

    private streamOutput(
        stream: Readable,
        scriptLog: any,
        outputPath: string,
        scriptPath: string,
        startTime: Date,
        outputs: Record<string, any>,
        onOutput?: (data: { log?: string; error?: string; dev?: string }) => void,
        runIndex?: number
    ): Promise<Record<string, any>> {
        let output = ''
        let finalOutputs: Record<string, any> = {}
        let errors: any[] = []

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => {
                const data = chunk.toString()
                output += data

                // Log each line
                if (scriptLog) {
                    data.split('\n').forEach((line) => {
                        if (line.trim()) {
                            scriptLog.logs = scriptLog.logs || []
                            scriptLog.logs.push({
                                timestamp: new Date(),
                                level: 'info',
                                message: line.trim(),
                                runIndex,
                            })
                        }
                    })
                }

                const lines = data.split('\n')

                console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][streamOutput][RAW]`, data)

                for (const line of lines) {
                    if (line.includes('PYLOG:')) {
                        let message = line.trim()
                        // console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][stream][PYLOG]`, message)
                        onOutput({
                            log: message,
                        })
                        continue
                    }

                    if (line.includes('PYERR:')) {
                        let message = line.trim()
                        // console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][stream][PYERR]`, message)
                        onOutput({
                            error: message,
                        })
                        continue
                    }

                    if (line.includes('PYDEV:')) {
                        let message = line.trim()
                        // console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][stream][PYDEV]`, message)
                        onOutput({
                            dev: message,
                        })
                        continue
                    }

                    // console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][PYOUT]`, line)
                }
            })

            stream.on('end', async () => {
                try {
                    try {
                        // console.log('Reading output file...')
                        const outputFileContent = await this.dockerService.executeCommand(this.containerId, [
                            'cat',
                            outputPath,
                        ])

                        console.log(outputPath, outputFileContent)

                        // console.log(`Raw file content length: ${outputFileContent.length}`)
                        // console.log('Raw file content:', outputFileContent)

                        if (outputFileContent && outputFileContent.trim()) {
                            try {
                                // Try to parse exactly as received
                                finalOutputs = JSON.parse(outputFileContent.trim())
                                // console.log('Successfully parsed JSON from file')
                            } catch (parseError) {
                                // console.error(
                                //     `[container][Run ${runIndex.toString().padStart(3, '0')}][streamOutput][parseError] First parse attempt failed:`,
                                //     parseError.message
                                // )

                                // Try with additional trimming/cleaning if needed
                                try {
                                    const firstBraceIndex = outputFileContent.indexOf('{')
                                    const lastBraceIndex = outputFileContent.lastIndexOf('}')
                                    const trimmedContent = outputFileContent.substring(
                                        firstBraceIndex,
                                        lastBraceIndex + 1
                                    )
                                    // console.log('JSON content:', trimmedContent)

                                    // Remove any BOM or hidden characters
                                    const cleanedContent = trimmedContent
                                        .trim()
                                        .replace(/^\uFEFF/, '') // Remove BOM if present
                                        .replace(/[^\x20-\x7E\t\r\n]/g, '') // Keep only ASCII printable + whitespace

                                    finalOutputs = JSON.parse(cleanedContent)
                                    // console.log('Successfully parsed JSON after cleaning')
                                } catch (secondError) {
                                    console.error(
                                        `[container][Run ${runIndex.toString().padStart(3, '0')}][stream][end] ERROR:`,
                                        secondError.message
                                    )
                                    console.error(secondError)
                                    console.log(outputFileContent)
                                    // console.error(
                                    //     `[Run ${runIndex.toString().padStart(3, '0')}][streamOutput] File content sample:`,
                                    //     outputFileContent.substring(0, 200)
                                    // )

                                    // Create empty response structure as fallback
                                    finalOutputs = {}
                                }
                            }
                        } else {
                            console.error(
                                `[container][Run ${runIndex.toString().padStart(3, '0')}][stream][end] ERROR: Output file was empty or whitespace only`
                            )
                            finalOutputs = {}
                        }
                    } catch (error) {
                        console.error(
                            `[container][Run ${runIndex.toString().padStart(3, '0')}][stream][end] ERROR: Error reading output file:`,
                            error.message
                        )
                        finalOutputs = {}
                    }

                    // Clean up temporary files
                    await this.dockerService.executeCommand(this.containerId, ['rm', scriptPath])
                    await this.dockerService.executeCommand(this.containerId, ['rm', outputPath])

                    // Update script log with success status if it exists
                    if (scriptLog) {
                        const endTime = new Date()
                        scriptLog.status = 'completed'
                        scriptLog.endTime = endTime
                        scriptLog.executionTimeMs = endTime.getTime() - startTime.getTime()
                        scriptLog.outputs = Object.entries(finalOutputs).map(([name, value]) => ({
                            name,
                            value,
                            type: outputs?.[name]?.type ?? typeof value,
                        }))
                        await scriptLog.save()
                    }

                    console.log(`[container][Run ${runIndex.toString().padStart(3, '0')}][streamOutput]`, finalOutputs)

                    if (errors.length > 0) {
                        resolve({ ...finalOutputs, __errors: errors })
                    } else {
                        resolve(finalOutputs)
                    }
                } catch (error) {
                    reject(
                        new Error(
                            `[container][Run ${runIndex.toString().padStart(3, '0')}][streamOutput] Failed to cleanup or update log: ${error.message}`
                        )
                    )
                }
            })

            stream.on('error', (error) => {
                reject(
                    new Error(
                        `[container][Run ${runIndex.toString().padStart(3, '0')}][stream][error] Failed to execute script: ${error.message}`
                    )
                )
            })
        })
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
            requiredPackages: { name: string; alias?: string; version?: string }[]
            inputs: ScenarioConfiguration
        }>,
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

        try {
            // Sanitize the script before execution
            this.sanitizePythonScript(scriptContent)

            // Process all configurations
            const processedConfigs: {
                index: number
                inputs: ScenarioConfiguration
                importStatements: string
            }[] = configurationsArray.map(({ index, inputs, requiredPackages }) => {
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
                    importStatements: this.formatImportStatements(requiredPackages),
                }
            })

            console.log(
                `[container][Parallel Execution][execution] Processed ${processedConfigs.length} configurations`
            )

            // Write configurations to JSON file in Node, then copy to container
            const localTmpPath = path.join(os.tmpdir(), `configs_${scriptId}.json`)
            fs.writeFileSync(localTmpPath, JSON.stringify(processedConfigs), 'utf8')
            // Copy the file into the container
            await this.dockerService.copyFileToContainer(this.containerId, localTmpPath, configsPath)

            console.log(
                `[container][Parallel Execution][execution] Wrote ${processedConfigs.length} configurations to ${configsPath}`
            )

            // Create the parallel execution script
            const parallelScript = this.createParallelExecutionScript(scriptContent, configsPath, resultsPath, 8)

            console.log(`[container][Parallel Execution][execution] Created parallel execution script`)

            // Write the parallel script to the container
            await this.dockerService.executeCommand(this.containerId, [
                'sh',
                '-c',
                `echo '${parallelScript.replace(/'/g, "'\\''")}' > ${mainScriptPath}`,
            ])

            console.log(
                `[container][Parallel Execution][execution] Wrote parallel execution script to ${mainScriptPath}`
            )

            // Execute the parallel script
            const container = this.dockerService.getContainer(this.containerId)
            console.log(
                `[container][Parallel Execution][execution] Starting parallel execution of ${processedConfigs.length} configurations`
            )

            const exec = await container.exec({
                Cmd: ['python', mainScriptPath],
                AttachStdout: true,
                AttachStderr: true,
            })

            console.log(`[container][Parallel Execution][execution] Started parallel execution`)

            const stream = await exec.start({ hijack: true })

            console.log(`[container][Parallel Execution][execution] Started streaming output`)

            // Stream output and collect results
            let output = ''

            await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => {
                    const data = chunk.toString()
                    output += data

                    if (data?.split('\n')?.length > 0) {
                        const lines = data.split('\n')
                        const log = lines
                            .filter(
                                (line) => line.trim().length > 0 && (line.includes('PYLOG:') || line.includes('PYERR:'))
                            )
                            .map((line) => {
                                let sanitizedLine = line.replace(/[^\x00-\x7F]/g, '')
                                if (sanitizedLine.includes('PYLOG:')) {
                                    let index = sanitizedLine.indexOf('PYLOG:')
                                    return sanitizedLine.slice(index).trim()
                                }
                                if (sanitizedLine.includes('PYERR:')) {
                                    let index = sanitizedLine.indexOf('PYERR:')
                                    return sanitizedLine.slice(index).trim()
                                }
                            })

                        if (log.length > 0) {
                            streamCallback?.({
                                log: log.join('\n'),
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

                        console.log(`[container][Parallel Execution][output][DEV]`, dev)
                    }
                    // console.log(`[container][Parallel Execution][output]`, data)
                })

                stream.on('end', () => {
                    resolve()
                })

                stream.on('error', (error) => {
                    reject(new Error(`Failed to execute parallel script: ${error.message}`))
                })
            })

            // Read results file
            const resultsContent = await this.dockerService.readFileFromContainer(this.containerId, resultsPath)
            // console.log('[DEBUG] Raw results file content (first 500 chars):', resultsContent.slice(0, 500))

            // Node-side: Parse NDJSON
            let cleanContent = resultsContent.replace(/^\uFEFF/, '')
            const results = []
            cleanContent
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .forEach((line, idx) => {
                    const cleanLine = line.replace(/^[^\{\[]*/, '')
                    try {
                        results.push(JSON.parse(cleanLine))
                    } catch (e) {
                        console.warn(`[NDJSON SKIP] Line ${idx} is not valid JSON, skipping.`)
                    }
                })

            // Clean up temporary files
            await this.dockerService.executeCommand(this.containerId, ['rm', mainScriptPath])
            await this.dockerService.executeCommand(this.containerId, ['rm', configsPath])
            await this.dockerService.executeCommand(this.containerId, ['rm', resultsPath])

            // Update script log
            if (scriptLog) {
                scriptLog.status = 'completed'
                scriptLog.endTime = new Date()
                scriptLog.executionTimeMs = scriptLog.endTime.getTime() - startTime.getTime()
                await scriptLog.save()
            }

            return results
        } catch (error) {
            // Update script log with error status
            if (scriptLog) {
                scriptLog.status = 'failed'
                scriptLog.endTime = new Date()
                scriptLog.error = {
                    message: error.message,
                    stack: error.stack,
                }
                scriptLog.executionTimeMs = scriptLog.endTime.getTime() - startTime.getTime()
                await scriptLog.save()
            }
            console.error(error)
            throw new Error(`[container][Parallel Execution] Failed: ${error.message}`)
        }
    }

    private createParallelExecutionScript(
        scriptContent: string,
        configsPath: string,
        resultsPath: string,
        maxWorkers?: number
    ): string {
        return `
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
        
        # Import statements from the configuration
        import_code = config.get('importStatements', '')
        if import_code:
            exec(import_code)
        
        # Execute the user script
        user_script = """${scriptContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"""
        
        start_time = time.time()
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
        return {
            "index": run_index,
            "success": True,
            "outputs": clean_outputs,
            "execution_time_ms": int(execution_time * 1000)
        }
        
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
    
    # Write results to file as NDJSON
    with open(results_path, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + chr(10))
    
    log_with_timestamp(f"Results written to {results_path}")

if __name__ == "__main__":
    main()
`
    }
}
