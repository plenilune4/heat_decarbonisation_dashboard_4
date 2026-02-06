import * as fs from 'fs'
import Docker from 'dockerode'
import { IUser } from 'src/models/user.model'
import * as tar from 'tar-stream'

import LoggingService from './logging.service'

interface ContainerConfig {4,416.70
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
        // this.docker = new Docker()
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

            console.log('RUNNING AS UID:', process.getuid?.())
            console.log('DOCKER SOCK EXISTS:', fs.existsSync('/var/run/docker.sock'))
            console.log('DOCKER SOCK STAT:', (() => {
              try { return fs.statSync('/var/run/docker.sock') }
              catch (e) { return e }
            })())




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
            let output = ''

            return new Promise((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => {
                    output += chunk.toString()
                })

                stream.on('end', () => {
                    resolve(output.trim())
                })

                stream.on('error', (error) => {
                    reject(new Error(`Failed to execute command: ${error.message}`))
                })
            })
        } catch (error) {
            throw new Error(`Failed to execute command: ${error.message}`)
        }
    }

    /**
     * Read a file from a container in chunks to handle large files
     * @param containerId The ID of the container
     * @param filePath The path of the file to read
     * @returns The content of the file
     */
    async readFileFromContainer(containerId: string, filePath: string): Promise<string> {
        try {
            // Check if file exists
            try {
                await this.executeCommand(containerId, ['test', '-f', filePath])
            } catch (error) {
                console.error(`File ${filePath} does not exist in container ${containerId}`)
                throw new Error(`File ${filePath} does not exist in container`)
            }

            // Try to get file size using stat
            let fileSize: number
            try {
                const fileSizeStr = await this.executeCommand(containerId, ['stat', '--format=%s', filePath])
                fileSize = parseInt(fileSizeStr, 10)

                if (isNaN(fileSize)) {
                    console.warn(`Could not parse file size for ${filePath}, falling back to cat`)
                    return await this.executeCommand(containerId, ['cat', filePath])
                }

                console.log(`File size of ${filePath}: ${fileSize} bytes`)
            } catch (error) {
                console.warn(
                    `Could not determine file size for ${filePath} using stat, falling back to cat: ${error.message}`
                )
                return await this.executeCommand(containerId, ['cat', filePath])
            }

            // If file is small enough, use cat directly
            if (fileSize < 1024 * 1024) {
                // Less than 1MB
                return await this.executeCommand(containerId, ['cat', filePath])
            }

            // For larger files, try to read in chunks
            try {
                const CHUNK_SIZE = 500000 // 500KB chunks
                let content = ''
                let bytesRead = 0

                while (bytesRead < fileSize) {
                    const remainingBytes = fileSize - bytesRead
                    const bytesToRead = Math.min(remainingBytes, CHUNK_SIZE)

                    // Use dd to read a chunk of the file
                    const chunkContent = await this.executeCommand(containerId, [
                        'dd',
                        `if=${filePath}`,
                        'bs=1',
                        `skip=${bytesRead}`,
                        `count=${bytesToRead}`,
                        'status=none',
                    ])

                    content += chunkContent
                    bytesRead += bytesToRead

                    console.log(`Read ${bytesRead} of ${fileSize} bytes from ${filePath}`)
                }

                return content
            } catch (error) {
                console.warn(`Failed to read file in chunks, falling back to cat: ${error.message}`)
                return await this.executeCommand(containerId, ['cat', filePath])
            }
        } catch (error) {
            console.error(`Failed to read file ${filePath} from container:`, error)
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
