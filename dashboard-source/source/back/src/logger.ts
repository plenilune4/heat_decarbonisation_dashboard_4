import chalk from 'chalk'
import { Request, Response, Router } from 'express'
import morgan from 'morgan'
import winston from 'winston'

import LogEntryModel from './models/logging.model'

const Logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toISOString() }),
        winston.format.printf((info) => {
            const timestamp = chalk.gray(`[${info.timestamp}]`)
            let level: string, message: string
            switch (info.level) {
                case 'error':
                    message = chalk.red(info.message)
                    level = chalk.red(info.level.toUpperCase())
                    break
                case 'warn':
                    message = chalk.yellow(info.message)
                    level = chalk.yellow(info.level.toUpperCase())
                    break
                case 'info':
                    message = chalk.white(info.message)
                    level = chalk.white(info.level.toUpperCase())
                    break
                case 'http':
                    message = chalk.gray(info.message)
                    level = ''
                    break
                case 'debug':
                case 'silly':
                default:
                    message = chalk.white(info.message)
                    level = chalk.white(info.level.toUpperCase())
            }

            return `${timestamp} ${level ? level + ': ' : ''}${message}`
        })
    ),
    transports: [
        new winston.transports.Console(),
        // new winston.transports.File({
        //     filename: 'logs/error.log',
        //     level: 'error',
        // }),
        // new winston.transports.MongoDB({
        //     db: process.env.DB_CONNECTION_STRING,
        //     level: process.env.DB_LOGGING_LEVEL || 'error',
        //     collection: 'logs',
        // }),
    ],
})

export default Logger

// Define custom tokens with colors
morgan.token('method', (req: Request, res: Response) => {
    const method = req.method.padEnd(6, ' ') // Pad to length of longest HTTP method (DELETE)

    switch (req.method) {
        case 'DELETE':
            return chalk.red(method)
        default:
            return chalk.blue(method)
    }
})
morgan.token('status', (req: Request, res: Response) => {
    const status = res.statusCode
    const color =
        status >= 500
            ? chalk.red
            : status >= 400
              ? chalk.yellow
              : status >= 300
                ? chalk.cyan
                : status >= 200
                  ? chalk.green
                  : chalk.white
    return color(status)
})
morgan.token('url', (req: Request) => chalk.white(req.url))
morgan.token('res-content-length', (req: Request, res: Response) => chalk.cyan(res.get('Content-Length') || '0'))

// Create a Morgan middleware using custom format
const morganMiddleware = morgan(':method :status :url :response-time ms - :res[content-length]', {
    stream: {
        write: (message) => Logger.http(message.trim()),
    },
})

export { morganMiddleware }

const logRouter = Router()

logRouter.post('', async (req: Request, res: Response) => {
    const { level, message } = req.body

    switch (level) {
        case 'error':
            Logger.error(message)
            break
        case 'warn':
            Logger.warn(message)
            break
        case 'info':
            Logger.info(message)
            break
        case 'http':
            Logger.http(message)
            break
        case 'debug':
            Logger.debug(message)
            break
        case 'silly':
            Logger.silly(message)
            break
        default:
            Logger.info(message)
            break
    }

    return res.status(200).send()
})

logRouter.post('/crash-report', async (req: Request, res: Response) => {
    const { id, message, error, data } = req.body

    if (id && id !== 'new') {
        let entry = await LogEntryModel.findById(id)

        if (!entry) {
            return res.status(404).json({ error: 'Crash report not found' })
        }

        entry.message = message || 'Automatic Crash Report'
        entry.error = error || entry.error
        entry.data = {
            ...(entry.data ?? {}),
            ...data,
        }

        await entry.save()

        return res.status(200).json({ id })
    }

    const created = new LogEntryModel({
        level: 'error',
        service: 'crash-report',
        message: message || 'Automatic Crash Report',
        error: error,
        data,
    })

    await created.save()

    return res.status(200).json({ id: created._id })
})

export { logRouter }
