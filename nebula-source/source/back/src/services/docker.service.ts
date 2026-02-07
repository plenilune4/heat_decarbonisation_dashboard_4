import * as fs from 'fs'
import Docker from 'dockerode'
import { IUser } from 'src/models/user.model'
import * as tar from 'tar-stream'

import LoggingService from './logging.service'

interface ContainerConfig {
    image: string
    name: string
    volumes?: { [hostPath: string]: string } // host:container paths
    env?: { [key: string]: string }
    memory?: string
    cpus?: number
}

export interface IDockerService {
    // Container Management
    listContainers(): Promise<Docker.ContainerInfo[]>
    createContainer(config: ContainerConfig): Promise<string>
    removeContainer(containerId: string): Promise<void>
    startContainer(containerId: string): Promise<void>
    stopContainer(containerId: string): Promise<void>
    inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo>
    executeCommand(containerId: string, command: string[]): Promise<string>
    getContainer(containerId: string): Docker.Container
    copyFileToContainer(containerId: string, localPath: string, containerPath: string): Promise<void>
    readFileFromContainer(containerId: string, filePath: string): Promise<string>
}

export class DockerServiceImplementation implements IDockerService {
    private docker: Docker
    private defaultImage: string

    constructor(defaultImage: string = 'python:3.11-slim') {
        this.defaultImage = defaultImage
        this.docker = new Docker({socketPath: '/var/run/docker.sock'})
    }

    private formatContainerConfig(config: ContainerConfig): Docker.ContainerCreateOptions {
        const volumes: { [key: string]: {} } = {}
        const binds: string[] = []

        // Format volumes
        if (config.volumes) {
            Object.entries(config.volumes).forEach(([hostPath, containerPath]) => {
                volumes[containerPath] = {}
                binds.push(`${hostPath}:${containerPath}`)
            })
        }

        return {
            Image: config.image,
            name: config.name,
            Env: config.env ? Object.entries(config.env).map(([key, value]) => `${key}=${value}`) : [],
            HostConfig: {
                Memory: config.memory ? parseInt(config.memory) : undefined,
                NanoCpus: config.cpus ? config.cpus * 1e9 : undefined,
                Binds: binds,
            },
            Tty: true,
            OpenStdin: true,
            Cmd: ['/bin/sh', '-c', 'tail -f /dev/null'], // Keep container running
        }
    }

    async createContainer(config: ContainerConfig): Promise<string> {
        try {
            // Use default Python image if none specified
            if (!config.image) {
                config.image = this.defaultImage
            }

            await LoggingService.log({
                level: 'log',
                service: 'DockerService',
                message: `Creating container with config`,
                data: { config },
            })

            // Pull image if it doesn't exist
            try {
                await LoggingService.log({
                    level: 'log',
                    service: 'DockerService',
                    message: `Pulling image: ${config.image}`,
                    data: { config },
                })
                await this.docker.pull(config.image)
            } catch (error) {
                await LoggingService.log({
                    level: 'warn',
                    service: 'DockerService',
                    message: `Failed to pull image: ${config.image}`,
                    data: { config },
                    error,
                })
            }

            const containerConfig = this.formatContainerConfig(config)
            const container = await this.docker.createContainer(containerConfig)

            await LoggingService.log({
                level: 'log',
                service: 'DockerService',
                message: `Container created successfully`,
                data: { containerId: container.id },
            })

            return container.id
        } catch (error) {
            await LoggingService.log({
                level: 'error',
                service: 'DockerService',
                message: 'Failed to create container',
                error,
                data: { config },
            })
            throw new Error(`Failed to create container: ${error.message}`)
        }
    }

    async startContainer(containerId: string): Promise<void> {
        try {
            await LoggingService.log({
                level: 'log',
                service: 'DockerService',
                message: `Starting container`,
                data: { containerId },
            })

            const container = this.docker.getContainer(containerId)
            await container.start()

            await LoggingService.log({
                level: 'log',
                service: 'DockerService',
                message: `Container started successfully`,
                data: { containerId },
            })
        } catch (error) {
            await LoggingService.log({
                level: 'error',
                service: 'DockerService',
                message: 'Failed to start container',
                error,
                data: { containerId },
            })
            throw new Error(`Failed to start container: ${error.message}`)
        }
    }

    async stopContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId)
            await container.stop()
        } catch (error) {
            throw new Error(`Failed to stop container: ${error.message}`)
        }
    }

    async removeContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId)
            await container.remove({ force: true })
        } catch (error) {
            throw new Error(`Failed to remove container: ${error.message}`)
        }
    }

    async executeCommand(containerId: string, command: string[]): Promise<string> {
        try {
            const container = this.docker.getContainer(containerId)
            const exec = await container.exec({
                Cmd: command,
                AttachStdout: true,
                AttachStderr: true,
            })

            const stream = await exec.start({ hijack: true })

            return new Promise((resolve, reject) => {
                let stdout = ''
                let stderr = ''
                let buffer = Buffer.alloc(0) // Buffer to accumulate partial chunks

                stream.on('data', (chunk: Buffer) => {
                    // console.log(`[docker][executeCommand] Received chunk of ${chunk.length} bytes`)
                    // Add chunk to buffer
                    buffer = Buffer.concat([buffer, chunk] as any)
                    // console.log(`[docker][executeCommand] Buffer length: ${buffer.length}`)

                    // Check if this looks like a multiplexed stream (starts with 0x01 or 0x02)
                    if (buffer.length >= 8 && (buffer[0] === 0x01 || buffer[0] === 0x02)) {
                        // console.log(`[docker][executeCommand] Detected multiplexed stream`)

                        // Demultiplex Docker stream
                        let offset = 0
                        while (offset < buffer.length) {
                            if (offset + 8 > buffer.length) break

                            const header = buffer.slice(offset, offset + 8)
                            const streamType = header[0]
                            const payloadLength = header.readUInt32BE(4)

                            // console.log(
                            //     `[docker][executeCommand] Stream type: ${streamType}, Payload length: ${payloadLength}, Offset: ${offset}, Buffer length: ${buffer.length}`
                            // )

                            if (offset + 8 + payloadLength > buffer.length) {
                                // console.log(
                                //     `[docker][executeCommand] Payload extends beyond buffer, waiting for more data`
                                // )
                                break
                            }

                            const payload = buffer.slice(offset + 8, offset + 8 + payloadLength)

                            if (streamType === 1) {
                                // stdout
                                const payloadText = payload.toString('utf8')
                                stdout += payloadText
                                // console.log(`[docker][executeCommand] Added ${payload.length} bytes to stdout`)
                                // console.log(`[docker][executeCommand] Current stdout length: ${stdout.length}`)
                            } else if (streamType === 2) {
                                // stderr
                                const payloadText = payload.toString('utf8')
                                stderr += payloadText
                                // console.log(`[docker][executeCommand] Added ${payload.length} bytes to stderr`)
                                // console.log(`[docker][executeCommand] Current stderr length: ${stderr.length}`)
                            } else {
                                // console.log(`[docker][executeCommand] Unknown stream type: ${streamType}, skipping`)
                            }

                            offset += 8 + payloadLength
                        }

                        // Remove processed data from buffer
                        if (offset > 0) {
                            buffer = buffer.slice(offset)
                            // console.log(
                            //     `[docker][executeCommand] Removed ${offset} bytes from buffer, remaining: ${buffer.length}`
                            // )
                        }
                    } else {
                        const bufferText = buffer.toString('utf8')
                        stdout += bufferText
                        // console.log(`[docker][executeCommand] Added ${buffer.length} bytes to stdout as raw data`)
                        // console.log(`[docker][executeCommand] Raw data preview: ${bufferText.substring(0, 100)}...`)
                        buffer = Buffer.alloc(0) // Clear buffer
                    }
                })

                stream.on('end', () => {
                    // console.log(
                    //     `[docker][executeCommand] Stream ended. stdout length: ${stdout.length}, stderr length: ${stderr.length}`
                    // )
                    if (stderr.trim()) {
                        console.warn(`[docker] stderr: ${stderr.trim()}`)
                    }
                    resolve(stdout)
                })

                stream.on('error', (error) => {
                    console.error(`[docker][executeCommand] Stream error:`, error)
                    reject(new Error(`Failed to execute command: ${error.message}`))
                })
            })
        } catch (error) {
            throw new Error(`Failed to execute command: ${error.message}`)
        }
    }

    /**
     * Read a file from a container, optimized for JSONL format
     * @param containerId The ID of the container
     * @param filePath The path of the file to read
     * @returns The content of the file
     */
    async readFileFromContainer(containerId: string, filePath: string): Promise<string> {
        console.log(`[docker][readFile][info] PATH: ${filePath}`)
        try {
            // Check if file exists and get its size
            let fileSize = 0
            try {
                await this.executeCommand(containerId, ['test', '-f', filePath])
                fileSize = await this.getFileSize(containerId, filePath)
                console.log(`[docker][readFile][info] SIZE: ${fileSize} bytes`)
            } catch (error) {
                console.error(
                    `[docker][readFile][error] File ${filePath} does not exist or cannot be accessed in container ${containerId}`
                )

                // Debug: List files in the directory to see what's actually there
                try {
                    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'))
                    const files = await this.executeCommand(containerId, ['ls', '-la', parentDir])
                    console.log(`[docker][readFile][debug] Files in ${parentDir}:`, files)
                } catch (debugError) {
                    console.warn(`[docker][readFile][debug] Could not list directory contents:`, debugError.message)
                }

                throw new Error(`File ${filePath} does not exist in container`)
            }

            // For JSONL files, we can use cat directly since each line is a complete JSON object
            // This is more efficient than chunking and avoids splitting JSON lines
            try {
                // console.log(`[docker][readFile][debug] Using simple cat to read file ${filePath}`)
                const content = await this.executeCommand(containerId, ['cat', filePath])
                // Check if content is valid JSON
                if (content.length === 0 || !content.startsWith('{')) {
                    console.log(`[docker][readFile][debug] Content appears truncated or invalid`)
                    console.log(
                        `[docker][readFile][debug] File size reported: ${fileSize} bytes, but read: ${content.length} characters`
                    )
                }

                return content
            } catch (error) {
                console.error(`[docker][readFile][error] Failed to read file ${filePath}:`, error)
                throw new Error(`Failed to read file from container: ${error.message}`)
            }
        } catch (error) {
            console.error(`[docker][readFile][error] Failed to read file ${filePath} from container:`, error)
            throw new Error(`Failed to read file from container: ${error.message}`)
        }
    }

    async inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
        try {
            const container = this.docker.getContainer(containerId)
            return await container.inspect()
        } catch (error) {
            throw new Error(`Failed to inspect container: ${error.message}`)
        }
    }

    async listContainers(): Promise<Docker.ContainerInfo[]> {
        try {
            return await this.docker.listContainers({ all: true })
        } catch (error) {
            throw new Error(`Failed to list containers: ${error.message}`)
        }
    }

    getContainer(containerId: string): Docker.Container {
        return this.docker.getContainer(containerId)
    }

    async copyFileToContainer(containerId: string, localPath: string, containerPath: string): Promise<void> {
        const container = this.docker.getContainer(containerId)
        const pack = tar.pack()
        const fileName = require('path').basename(containerPath)
        pack.entry({ name: fileName }, fs.readFileSync(localPath))
        pack.finalize()
        await container.putArchive(pack, { path: require('path').dirname(containerPath) })
    }

    private async getFileSize(containerId: string, filePath: string): Promise<number> {
        // Try stat first (your existing method)
        try {
            const fileSizeStr = await this.executeCommand(containerId, ['stat', '--format=%s', filePath])
            const fileSize = parseInt(fileSizeStr, 10)
            if (!isNaN(fileSize)) return fileSize
        } catch (e) {
            console.warn(`stat command failed for ${filePath}: ${e.message}`)
        }

        // Try wc next
        try {
            const fileSizeStr = await this.executeCommand(containerId, [
                'bash',
                '-c',
                `wc -c < "${filePath}" | tr -d ' '`,
            ])
            const fileSize = parseInt(fileSizeStr, 10)
            if (!isNaN(fileSize)) return fileSize
        } catch (e) {
            console.warn(`wc command failed for ${filePath}: ${e.message}`)
        }

        // Try du as another alternative
        try {
            const fileSizeStr = await this.executeCommand(containerId, ['bash', '-c', `du -b "${filePath}" | cut -f1`])
            const fileSize = parseInt(fileSizeStr, 10)
            if (!isNaN(fileSize)) return fileSize
        } catch (e) {
            console.warn(`du command failed for ${filePath}: ${e.message}`)
        }

        // Last resort: use ls
        try {
            const lsOutput = await this.executeCommand(containerId, ['ls', '-l', filePath])
            const parts = lsOutput.trim().split(/\s+/)
            if (parts.length >= 5) {
                const fileSize = parseInt(parts[4], 10)
                if (!isNaN(fileSize)) return fileSize
            }
        } catch (e) {
            console.warn(`ls command failed for ${filePath}: ${e.message}`)
        }

        // If all methods fail, throw an error
        throw new Error(`Failed to determine file size for ${filePath} using any method`)
    }
}

export async function createUserContainer(user: IUser): Promise<string> {
    if (!user.dockerService?.containerId) {
        const dockerService = new DockerServiceImplementation()
        let containerId: string
        try {
            await LoggingService.log({
                level: 'log',
                service: 'AuthRoutes',
                message: 'Creating Docker container for new user',
                data: { email: user.email },
            })

            containerId = await dockerService.createContainer({
                name: `user-${user.email.toLowerCase().replace(/[^a-zA-Z0-9-]/g, '-')}`,
                image: undefined,
            })

            await LoggingService.log({
                level: 'log',
                service: 'AuthRoutes',
                message: 'Starting Docker container for new user',
                data: { email: user.email, containerId },
            })

            await dockerService.startContainer(containerId)

            await LoggingService.log({
                level: 'log',
                service: 'AuthRoutes',
                message: 'Docker container created and started successfully',
                data: { email: user.email, containerId },
            })

            return containerId
        } catch (error) {
            await LoggingService.log({
                level: 'error',
                service: 'AuthRoutes',
                message: 'Failed to create user environment',
                error,
                data: { email: user.email },
            })
            console.log(error)
            throw new Error(`Failed to create user environment: ${error.message}`)
        }
    }
}
