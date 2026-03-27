import { model, Schema } from 'mongoose'

import { IPermissions } from '../services/authentication.service'
import { IClient } from './client.model'

export interface IUser {
    _id: string
    firstName: string
    lastName: string
    email: string
    passwordHash: string
    permissions: IPermissions
    profileImage?: string
    onboardingComplete?: boolean
    lastLoginAt?: Date
    createdAt: Date
    updatedAt: Date
    client?: IClient
    isClientAdmin?: boolean
    dockerService?: { containerId: string }
    isArchived?: boolean
}

const userSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        passwordHash: { type: String, required: true },
        permissions: { type: Object, required: true, default: { isAdmin: false } },
        profileImage: { type: String },
        onboardingComplete: { type: Boolean },
        lastLoginAt: { type: Date },
        client: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: function (this: IUser) {
                return !this.permissions?.isAdmin
            },
        },
        isClientAdmin: { type: Boolean, default: false },
        isArchived: { type: Boolean, default: false },
        dockerService: { type: Object },
    },
    {
        timestamps: true,
    }
)

const User = model<IUser>('User', userSchema)

userSchema.set('toObject', {
    transform(_, object) {
        // will not include passwordHash if this model is cast to an object (for example when being passed through a response body)
        delete object.passwordHash
        return object
    },
})

export default User
