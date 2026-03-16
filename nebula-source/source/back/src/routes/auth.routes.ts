import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Request, Response, Router } from 'express'
import { createUserContainer } from 'src/services/docker.service'

import Client from '../models/client.model'
import RefreshToken from '../models/refreshToken.model'
import Token from '../models/token.model'
import User from '../models/user.model'
import {
    ACCESS_TOKEN_LIFETIME,
    createTokenForUser,
    encodeAccessToken,
    SALT_ROUNDS,
    verifyAccessTokenClaims,
} from '../services/authentication.service'
import { EMAIL_TEMPLATES } from '../services/email.config'
import { SendEmail } from '../services/email.service'
import LoggingService from '../services/logging.service'
import { ENDPOINTS } from './_endpoints'

/* ROUTER
 */
const AUTH_ROUTES = ENDPOINTS.auth

const router = Router()

// router.post(AUTH_ROUTES.register, async (req: Request, res: Response) => {
//     if (!req.body || !req.body.email || !req.body.password) {
//         return res.status(400).json({ error: 'Missing required data' })
//     }

//     const existing_user = await User.findOne({ $or: [{ email: req.body.email }] })
//     if (existing_user) {
//         if (existing_user.email == req.body.email) {
//             return res.status(409).json({
//                 error: 'An account with this email already exists. Please log in or enter a different address.',
//             })
//         }
//     }

//     const { clientName, email, firstName, lastName } = req.body

//     const new_client = new Client({ name: clientName })
//     await new_client.save()

//     const new_user = new User({
//         email,
//         firstName,
//         lastName,
//         passwordHash: await bcrypt.hash(req.body.password, SALT_ROUNDS),
//         client: new_client._id,
//         isClientAdmin: true,
//         // dockerService: { containerId },
//     })

//     try {
//         const containerId = await createUserContainer(new_user)
//         new_user.dockerService = { containerId }
//         await new_user.save()
//     } catch (dockerError) {
//         LoggingService.log({
//             level: 'error',
//             service: 'AUTH',
//             message: 'Failed to create Docker container during registration',
//             data: {
//                 user: new_user,
//                 error: dockerError.message,
//             },
//         })
//     }

//     const [jwt, err] = await createTokenForUser(new_user)
//     if (err) {
//         LoggingService.log({
//             level: 'error',
//             service: 'AUTH',
//             message: 'Failed to create token during registration',
//             data: {
//                 user: new_user,
//                 error: err.message,
//             },
//         })
//         return res.status(400).json({ error: err.message })
//     }

//     return res.status(201).json({
//         token: jwt,
//     })
// })

router.post(AUTH_ROUTES.login, async (req: Request, res: Response) => {
    if (!req.body || !req.body.email || !req.body.password) {
        return res.status(400).json({ error: 'Missing required data' })
    }

    const user: any = await User.findOne({ email: req.body.email })
    if (!user || !user._id) {
        return res.status(400).json({
            error: 'No account with that email address was found. Please check your details, or sign up for an account.',
        })
    }

    const matches = await bcrypt.compare(req.body.password, user.passwordHash)
    if (!matches) {
        return res.status(409).json({ error: 'Incorrect Password' })
    }

    const [jwt, err] = await createTokenForUser(user)
    if (err) {
        LoggingService.log({
            level: 'error',
            service: 'AUTH',
            message: 'Failed to create token during login',
            data: {
                user,
                error: err.message,
            },
        })
        return res.status(400).json({ error: err.message })
    }

    user.lastLoginAt = new Date()
    await user.save()

    if (!user.dockerService?.containerId) {
        try {
            const containerId = await createUserContainer(user)
            user.dockerService = { containerId }
            await user.save()
        } catch (dockerError) {
            LoggingService.log({
                level: 'error',
                service: 'AUTH',
                message: 'Failed to create Docker container during login',
                data: {
                    user,
                    error: dockerError.message,
                },
            })
        }
    }

    let redirect = undefined
    if (user.permissions.isAdmin) {
        redirect = '/admin'
    }

    return res.status(200).json({
        redirectUrl: redirect,
        token: jwt,
    })
})

router.get(AUTH_ROUTES.logout, async (req: Request, res: Response) => {
    const refreshTokenHeader = req.headers['x-refresh-token']
    if (!refreshTokenHeader || typeof refreshTokenHeader !== 'string') {
        return res.status(401).json({ error: 'Missing headers' })
    }

    const refreshTokenEntry = await RefreshToken.findOne({ tokenHash: refreshTokenHeader })
    if (refreshTokenEntry) {
        refreshTokenEntry.revoked = true
        await refreshTokenEntry.save()
    }

    return res.sendStatus(200)
})

router.get(AUTH_ROUTES.whoami, async (req: Request, res: Response) => {
    const accessTokenHeader = req.headers.authorization?.substring('Bearer '.length)
    if (!accessTokenHeader) return res.status(401).json({ error: 'Missing headers' })

    const [verificationError, payload] = await verifyAccessTokenClaims(accessTokenHeader)
    if (verificationError)
        if (verificationError.message === 'Expired token') return res.status(302).json({ shouldRefresh: true })
        else if (verificationError.message === 'missing_env') return res.sendStatus(503)
        else if (verificationError.message === 'Invalid token') return res.sendStatus(401)
        else return res.sendStatus(401)
    if (!payload) return res.status(401).json({ error: 'Invalid token' })

    const user = await User.findById(payload.uuid).populate('client')
    if (user) {
        user.lastLoginAt = new Date()
        await user.save()
        return res.status(200).json({
            isLoggedIn: true,
            user: user.toObject(),
        })
    } else return res.status(401).json({ isLoggedIn: false, error: 'Account not found' })
})

router.get(AUTH_ROUTES.refresh, async (req: Request, res: Response) => {
    const now = new Date()
    const refreshTokenHeader = req.headers['x-refresh-token']
    if (!refreshTokenHeader || typeof refreshTokenHeader !== 'string')
        return res.status(401).json({ error: 'Missing headers' })
    const refreshTokenEntry = await RefreshToken.findOne({ tokenHash: refreshTokenHeader }).populate('user')
    if (!refreshTokenEntry) return res.sendStatus(401)
    if (refreshTokenEntry.revoked) return res.sendStatus(401)
    if (new Date(refreshTokenEntry.expiresAt).valueOf() < now.valueOf()) {
        refreshTokenEntry.revoked = true
        await refreshTokenEntry.save()
        return res.sendStatus(401)
    }
    const [encodingError, accessToken] = await encodeAccessToken(refreshTokenEntry.user, now)
    if (encodingError || !accessToken)
        return res.sendStatus(500).json({ error: encodingError?.message ?? 'Failed to encode token' })

    return res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshTokenHeader,
        tokenType: 'Bearer',
        expiresAt: now.valueOf() + ACCESS_TOKEN_LIFETIME,
    })
})

router.post(AUTH_ROUTES.forgotPassword, async (req: Request, res: Response) => {
    const user = await User.findOne({ email: req.body.email })
    if (!user) return res.status(400).json({ error: 'User does not exist' })

    const token = await Token.findOne({ userId: user._id })
    if (token) await token.deleteOne()
    const resetToken = crypto.randomBytes(32).toString('hex')

    const hash = await bcrypt.hash(resetToken, SALT_ROUNDS)

    await new Token({ userId: user._id, token: hash, createdAt: Date.now(), expiresAt: Date.now() + 3600*1000 }).save()

    SendEmail(
        [{ Email: user.email, Name: `${user.firstName} ${user.lastName}` }],
        { link: `${process.env.SITE_URL}/reset-password?token=${resetToken}&id=${user._id}` },
        `${process.env.PROJECT_NAME} - Reset Password`,
        EMAIL_TEMPLATES.passwordReset
    )

    return res.sendStatus(201)
})

router.post(AUTH_ROUTES.resetPassword, async (req: Request, res: Response) => {
    const user = await User.findById(req.body.id)
    if (!user) return res.status(400).json({ error: 'User does not exist' })

    const passwordResetToken = await Token.findOne({ userId: user._id })
    if (!passwordResetToken) return res.status(401).json({ error: 'Invalid Token' })

    const isValid = await bcrypt.compare(req.body.token, passwordResetToken.token)
    if (!isValid) return res.status(401).json({ error: 'Invalid Token' })

    user.passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS)
    await user.save()

    await passwordResetToken.deleteOne()

    return res.status(200).json({ message: 'success' })
})

export default router
