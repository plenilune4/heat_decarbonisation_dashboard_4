import { model, Schema } from 'mongoose'

export interface IClient {
    _id: string
    name: string
    maxUsers: number
    createdAt: Date
    updatedAt: Date
}

const clientSchema = new Schema<IClient>(
    {
        name: { type: String, required: true },
        maxUsers: { type: Number, required: true, default: 5 },
    },
    {
        timestamps: true,
    }
)

const Client = model<IClient>('Client', clientSchema)
export default Client
