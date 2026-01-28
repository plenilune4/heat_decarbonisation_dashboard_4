import { model, Schema } from 'mongoose'

import { IUser } from './user.model'

export interface IToken {
    _id: Schema.Types.ObjectId
    userId: IUser
    token: string
    createdAt: Date
}

const tokenSchema = new Schema<IToken>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
})

const Token = model<IToken>('Token', tokenSchema)

export default Token
