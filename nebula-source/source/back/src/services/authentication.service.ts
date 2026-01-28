import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import RefreshToken, { IRefreshTokenEntry } from '../models/refreshToken.model'
import { IUser } from '../models/user.model'

export const SALT_ROUNDS = 10
export const ACCESS_TOKEN_LIFETIME = 1000 * 60 * 60 // one hour
const REFRESH_TOKEN_LIFETIME = 1000 * 60 * 60 * 24 * 365 // one year

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    throw 'Missing env variables - JWT_SECRET'
}
const REFRESH_SECRET = process.env.REFRESH_SECRET
if (!REFRESH_SECRET) {
    throw 'Missing env variables - REFRESH_SECRET'
}

export interface IPermissions {
    isAdmin: boolean
    // other permissions
}

export interface AccessTokenPayload extends jwt.JwtPayload {
    uuid: string
}

export async function encodeAccessToken(
    user: IUser,
    now: Date,
    options?: jwt.SignOptions
): Promise<[Error | null, string | null]> {
    const payload: AccessTokenPayload = {
        uuid: String(user._id),
        iat: now.valueOf(),
        exp: now.valueOf() + ACCESS_TOKEN_LIFETIME,
    }

    return new Promise((resolve, reject) => {
        jwt.sign(payload, JWT_SECRET, options ?? {}, (error: Error | null, token?: string) => {
            if (error || !token) {
                reject([error ?? new Error('Failed to make token'), null])
                return
            }
            resolve([null, token])
        })
    })
}

export async function decodeAccessToken(
    accessToken: string,
    key: string
): Promise<[Error | null, AccessTokenPayload | null]> {
    return new Promise((resolve, reject) => {
        jwt.verify(accessToken, key, {}, (error, decoded) => {
            if (error || !decoded) {
                reject([error ?? new Error('Invalid token'), null])
            }
            resolve([null, decoded as AccessTokenPayload])
        })
    })
}

export async function verifyAccessTokenClaims(accessToken: string): Promise<[Error | null, AccessTokenPayload | null]> {
    const [error, payload] = await decodeAccessToken(accessToken, JWT_SECRET)
        .then((x) => x)
        .catch((x: [Error, null]) => x)
    if (error || !payload || typeof payload !== 'object') {
        return [error ?? new Error('Invalid token'), null]
    }

    const now = new Date()

    if (!payload?.exp || payload.exp < now.valueOf()) {
        return [error ?? new Error('Expired token'), payload]
    }

    return [null, payload]
}

export async function generateRefreshToken(
    user: IUser,
    now: Date,
    key: string
): Promise<Omit<IRefreshTokenEntry, '_id'>> {
    const hash = await bcrypt.hash(key, SALT_ROUNDS)
    return {
        user: user,
        tokenHash: hash,
        issuedAt: now,
        expiresAt: new Date(now.valueOf() + REFRESH_TOKEN_LIFETIME),
        revoked: false,
    }
}

export async function createTokenForUser(user: any): Promise<[any, Error | null]> {
    // create an access token and refresh token
    const now = new Date()

    const [err, accessToken] = await encodeAccessToken(user, now)
    if (err || !accessToken) {
        return [null, new Error('Authentication failed, please try again')]
    }

    const refreshToken = await generateRefreshToken(user, now, REFRESH_SECRET)
    const refreshTokenEntry = new RefreshToken(refreshToken)
    await refreshTokenEntry.save()

    return [
        {
            accessToken: accessToken,
            refreshToken: refreshToken.tokenHash,
            tokenType: 'Bearer',
            expiresAt: now.valueOf() + ACCESS_TOKEN_LIFETIME,
        },
        null,
    ]
}
