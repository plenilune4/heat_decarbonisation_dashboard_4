import { model, Schema } from 'mongoose'

export interface IExecutionLog {
    _id: string
    scriptId: string
    startTime: Date
    endTime?: Date
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    error?: {
        message: string
        stack?: string
        code?: string
    }
    executionTimeMs?: number
    memoryUsageMb?: number
    logs?: {
        timestamp: Date
        level: 'info' | 'warn' | 'error'
        message: string
    }[]
    metadata?: {
        containerInfo?: {
            id: string
            exitCode?: number
        }
    }
    createdAt: Date
    updatedAt: Date
}

const executionLogSchema = new Schema<IExecutionLog>(
    {
        scriptId: { type: String },
        startTime: { type: Date },
        endTime: { type: Date },
        status: { type: String },
        error: {
            message: { type: String },
            stack: { type: String },
            code: { type: String },
        },
        executionTimeMs: { type: Number },
        memoryUsageMb: { type: Number },
        logs: [
            {
                timestamp: { type: Date },
                level: { type: String },
                message: { type: String },
            },
        ],
        metadata: {
            containerInfo: {
                id: { type: String },
                exitCode: { type: Number },
            },
        },
    },
    {
        timestamps: true,
    }
)

const ExecutionLog = model<IExecutionLog>('ExecutionLog', executionLogSchema)
export default ExecutionLog
