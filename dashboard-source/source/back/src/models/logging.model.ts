import mongoose from 'mongoose'

export interface ILogEntry {
    _id?: string
    timestamp?: Date
    level: 'log' | 'warn' | 'error' | 'debug'
    message: string
    service?: string
    error?: any
    data?: any
}

const logEntrySchema = new mongoose.Schema<ILogEntry>({
    timestamp: { type: Date, required: true, default: Date.now },
    level: { type: String, required: true },
    message: { type: String, required: true },
    service: { type: String },
    error: { type: Object },
    data: { type: Object },
})

const LogEntryModel = mongoose.model<ILogEntry>('LogEntry', logEntrySchema)

export default LogEntryModel
