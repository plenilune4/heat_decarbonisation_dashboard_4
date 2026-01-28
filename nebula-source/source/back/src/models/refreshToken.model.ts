import { model, Schema } from 'mongoose'

import { IUser } from './user.model'

export interface IRefreshTokenEntry {
    _id: Schema.Types.ObjectId
    user: IUser
    tokenHash: string
    issuedAt: Date
    expiresAt: Date
    revoked: boolean
}

const tokenSchema = new Schema<IRefreshTokenEntry>({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    tokenHash: { type: String, required: true },
    issuedAt: Date,
    expiresAt: Date,
    revoked: Boolean,
})

const RefreshToken = model<IRefreshTokenEntry>('RefreshToken', tokenSchema)

export default RefreshToken
