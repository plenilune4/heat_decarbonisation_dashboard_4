import { NextFunction, Request, Response } from 'express'

import User from './models/user.model'
import { verifyAccessTokenClaims } from './services/authentication.service'

export async function userMw(req: Request, res: Response, next: NextFunction) {
    const accessTokenHeader = req.headers.authorization
        ? req.headers.authorization.substring('Bearer '.length)
        : undefined
    if (!accessTokenHeader) {
        return res.status(401).json({ error: 'Missing Headers' })
    }

    const [verificationError, payload] = await verifyAccessTokenClaims(accessTokenHeader)
    if (verificationError) {
        if (verificationError.message === 'Expired token') {
            return res.status(302).json({
                shouldRefresh: true,
            })
        } else {
            return res.status(401).json({ error: verificationError?.message ?? 'Invalid token' })
        }
    }
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' })
    }

    const sessionUser = await User.findById(payload.uuid).populate('client')
    if (!sessionUser) {
        return res.sendStatus(401)
    }

    res.locals.sessionUser = sessionUser
    next()
}

export async function adminMw(req: Request, res: Response, next: NextFunction) {
    const accessTokenHeader = req.headers.authorization?.substring('Bearer '.length)
    if (!accessTokenHeader) {
        return res.status(401).json({ error: 'Missing Headers' })
    }

    const [verificationError, payload] = await verifyAccessTokenClaims(accessTokenHeader)
    if (verificationError) {
        if (verificationError.message === 'Expired token') {
            return res.status(302).json({
                shouldRefresh: true,
            })
        } else {
            return res.status(401).json({ error: verificationError?.message ?? 'Invalid token' })
        }
    }
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' })
    }

    const sessionUser = await User.findById(payload.uuid)
    if (!sessionUser) {
        return res.sendStatus(401)
    }

    if (!sessionUser?.permissions?.isAdmin) {
        // This is a heinous act, so kick the user out
        return res.status(401).json({ error: 'Invalid permissions' })
    }

    res.locals.sessionUser = sessionUser
    next()
}
