import { model, Schema } from 'mongoose'

export interface IClient {
    _id: string
    name: string
    maxUsers: number
    accessStartAt?: Date
    accessEndAt?: Date
    accessReminderDaysBefore?: number
    lastAccessReminderSentAt?: Date
    createdAt: Date
    updatedAt: Date
}

const clientSchema = new Schema<IClient>(
    {
        name: { type: String, required: true },
        maxUsers: { type: Number, required: true, default: 5 },
        accessStartAt: { type: Date },
        accessEndAt: { type: Date },
        accessReminderDaysBefore: { type: Number, default: 2 },
        lastAccessReminderSentAt: { type: Date },
    },
    {
        timestamps: true,
    }
)

const Client = model<IClient>('Client', clientSchema)
export default Client
