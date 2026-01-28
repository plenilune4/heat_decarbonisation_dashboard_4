import fs from 'fs'

import Logger from '../logger'
import LogEntryModel, { ILogEntry } from '../models/logging.model'

export interface LoggingOptions {
    writeLogFile?: boolean
}

class LoggingService {
    static async log({ level, service, message, error, data }: ILogEntry, options?: LoggingOptions): Promise<void> {
        const loggingMessage = JSON.stringify(
            {
                service,
                message,
                error: error ? this.serializeError(error) : undefined,
                data,
            },
            undefined,
            4
        )

        switch (level) {
            case 'error':
                Logger.error('[ Logging Service ]\n' + loggingMessage)
                break
            case 'warn':
                Logger.warn('[ Logging Service ]\n' + loggingMessage)
                break
            case 'log':
                Logger.info('[ Logging Service ]\n' + loggingMessage)
                break
            case 'debug':
                Logger.debug('[ Logging Service ]\n' + loggingMessage)
                break
            default:
                Logger.info('[ Logging Service ]\n' + loggingMessage)
                break
        }

        if (options?.writeLogFile) {
            const fileName = [service, level, Date.now()].join('_').replace(/ /g, '-')
            fs.writeFile(
                `logs/${fileName}.json`,
                JSON.stringify({ service, level, message, error, data }, undefined, 4),
                () => {}
            )
        }

        try {
            new LogEntryModel({
                level,
                service,
                message,
                error: error ? this.serializeError(error) : undefined,
                data,
            }).save()
        } catch (error) {
            console.error('[ Logging Service ] Failed to save log entry:', error)
        }
    }

    static async crashReport(message: string, error: any, data?: any): Promise<string | null> {
        try {
            const entry = new LogEntryModel({
                level: 'error',
                service: 'crash-report',
                message,
                error: error ? this.serializeError(error) : undefined,
                data: data ?? {},
            })
            await entry.save()
            return entry._id
        } catch (error) {
            console.error('[ Logging Service ] Failed to save log entry:', error)
            return null
        }
    }

    static serializeError(error: any) {
        if (typeof error === 'string') {
            return {
                name: 'Error Message',
                message: error,
            }
        }

        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: this.formatStackTrace(error.stack),
            }
        }

        if (typeof error === 'object' && error !== null) {
            return {
                ...error,
            }
        }

        return {
            message: 'Unknown Error',
        }
    }

    static formatStackTrace(stack: string | undefined): string[] | undefined {
        if (!stack) return undefined

        return stack
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                // Remove "at " prefix if present
                return line.startsWith('at ') ? line.substr(3) : line
            })
    }
}

export default LoggingService
