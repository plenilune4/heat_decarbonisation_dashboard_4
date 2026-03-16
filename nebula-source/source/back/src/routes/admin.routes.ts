import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Request, Response, Router } from 'express'

import Analysis from '../models/analysis.model'
import Client from '../models/client.model'
import ClientEvaluationFunction from '../models/clientEvaluationFunction.model'
import EvaluationFunction from '../models/evaluationFunction.model'
import Token from '../models/token.model'
import User from '../models/user.model'
import { SALT_ROUNDS } from '../services/authentication.service'
import { EMAIL_TEMPLATES } from '../services/email.config'
import { SendEmail } from '../services/email.service'
import LoggingService from '../services/logging.service'
import { ENDPOINTS } from './_endpoints'
import BaseRoutes from './helper'

const router = Router()
const ROUTES = ENDPOINTS.admin

BaseRoutes(router, {
    model: User,
    route: ROUTES.user,
    excludedRoutes: ['post', 'delete'],
    populate: ['client'],
    filter: { isArchived: { $ne: true } },
})

router.post(ROUTES.user, async (req, res) => {
    const { _id, ...body } = req.body

    const user = await User.findById(_id)
    if (user) {
        const update = {
            ...body,
            passwordHash: undefined,
        }

        await User.findByIdAndUpdate(_id, update)

        return res.status(200).json({ message: 'User updated successfully' })
    }

    // Create a new user
    const { email, client, permissions, ...rest } = body

    if (!permissions?.isAdmin && !client?._id) {
        return res.status(400).json({ error: 'A client is required for non-admin users' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' })
    }

    const isGlobalAdminInvite = !!permissions?.isAdmin
    const clientRecord = !isGlobalAdminInvite ? await Client.findById(client._id) : null
    if (!isGlobalAdminInvite && !clientRecord) {
        return res.status(404).json({ error: 'Client not found' })
    }
    if (clientRecord) {
        const currentUserCount = await User.countDocuments({ client: client._id, isArchived: { $ne: true } })
        if (currentUserCount >= clientRecord.maxUsers) {
            return res.status(400).json({ error: 'This client has reached the maximum number of users' })
        }
    }

    const randomBytes = crypto.randomBytes(32)
    const placeholderPassword = await bcrypt.hash(randomBytes.toString('hex'), 10)

    const newUser = new User({
        email,
        ...rest,
        permissions: permissions ?? { isAdmin: false },
        passwordHash: placeholderPassword,
        client: permissions?.isAdmin ? undefined : clientRecord._id,
    })

    await newUser.save()

    // Send email to user with link to reset password
    const token = crypto.randomBytes(32).toString('hex')
    const hash = await bcrypt.hash(token, SALT_ROUNDS)
    await new Token({ userId: newUser._id, token: hash, createdAt: Date.now(), expiresAt: Date.now() + 3600*48*1000 }).save()

    try {
        await SendEmail(
            [{ Email: newUser.email, Name: newUser.firstName }],
            {
                name: newUser.firstName,
                client: clientRecord?.name ?? 'Nebula',
                link: `${process.env.SITE_URL}/confirm-account?token=${token}&id=${newUser._id}`,
            },
            `${process.env.PROJECT_NAME} - Confirm Account`,
            EMAIL_TEMPLATES.confirmAccount
        )
        console.log(`Created new user ${newUser.firstName} for client ${clientRecord?.name ?? 'Nebula'}.`)
        console.log(`Their invite link ${process.env.SITE_URL}/confirm-account?token=${token}&id=${newUser._id}`)
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send invitation email' })
    }

    return res.status(201).json({ message: 'User invited successfully' })
})

router.post(ROUTES.user + '/:id/resend-invite', async (req, res) => {
    const user = await User.findById(req.params.id).populate('client')
    if (!user) {
        return res.status(404).json({ error: 'User not found' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const hash = await bcrypt.hash(token, SALT_ROUNDS)

    // Invalidate any outstanding invite/reset token and issue a fresh one.
    await Token.deleteMany({ userId: user._id })
    await new Token({ userId: user._id, token: hash, createdAt: Date.now(), expiresAt: Date.now() + 1000*3600*48 }).save()

    try {
        await SendEmail(
            [{ Email: user.email, Name: user.firstName }],
            {
                name: user.firstName,
                client: user.client?.name ?? 'Nebula',
                link: `${process.env.SITE_URL}/confirm-account?token=${token}&id=${user._id}`,
            },
            `${process.env.PROJECT_NAME} - Confirm Account`,
            EMAIL_TEMPLATES.confirmAccount
        )
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send invitation email' })
    }

    console.log(`Resending invite email to ${user.firstName} for client ${user.client?.name ?? 'Nebula'}.`)
    console.log(`Their invite link ${process.env.SITE_URL}/confirm-account?token=${token}&id=${user._id}`)

    return res.status(200).json({ message: 'Invitation re-sent successfully' })
})

router.delete(ROUTES.user + '/:id', async (req, res) => {
    const targetUser = await User.findById(req.params.id)
    if (!targetUser) {
        return res.status(404).json({ error: 'User not found' })
    }

    try {
        // Create soft delete user
        const softDeleteUser = new User({
            firstName: 'Deleted',
            lastName: 'User',
            email: 'deleted-user@nebula',
            passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
            permissions: {
                isAdmin: false,
            },
            client: targetUser.client,
            isArchived: true,
        })
        await softDeleteUser.save()

        // Update user owned resources
        await Analysis.updateMany({ owner: targetUser._id }, { owner: softDeleteUser._id })

        // Delete user
        await User.findByIdAndDelete(req.params.id)
    } catch (error) {
        LoggingService.log({
            level: 'error',
            service: 'admin',
            message: 'Failed to delete user',
            error,
            data: {
                targetUser,
                sessionUser: res.locals.sessionUser,
            },
        })
        return res.status(500).json({ error: 'Failed to delete user' })
    }

    return res.status(200).json({ message: 'User deleted' })
})

BaseRoutes(router, {
    model: Analysis,
    route: ROUTES.analysis,
    excludedRoutes: ['post'],
    populate: ['evaluationFunction', 'owner', 'client'],
})

BaseRoutes(router, {
    model: EvaluationFunction,
    route: ROUTES.evaluationFunction,
    excludedRoutes: ['delete'],
})

router.delete(ROUTES.evaluationFunction + '/:id', async (req, res) => {
    const targetFunction = await EvaluationFunction.findById(req.params.id)
    if (!targetFunction) {
        return res.status(404).json({ error: 'Evaluation function not found' })
    }

    await Analysis.updateMany(
        { evaluationFunction: targetFunction._id },
        { evaluationFunction: null, isReadOnly: true }
    )
    await EvaluationFunction.findByIdAndDelete(req.params.id)

    return res.status(200).json({ message: 'Evaluation function deleted' })
})

BaseRoutes(router, {
    model: Client,
    route: ROUTES.client,
    excludedRoutes: ['delete'],
})

router.delete(ROUTES.client + '/:id', async (req, res) => {
    const targetClient = await Client.findById(req.params.id)
    if (!targetClient) {
        return res.status(404).json({ error: 'Client not found' })
    }

    try {
        await User.deleteMany({ client: targetClient._id })
        await Analysis.deleteMany({ client: targetClient._id })

        await Client.findByIdAndDelete(req.params.id)

        return res.status(200).json({ message: 'Client deleted' })
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete client' })
    }
})

router.get(ROUTES.client + '/:client_id/users', async (req, res) => {
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ error: 'Client not found' })
    }

    const users = await User.find({ client: targetClient._id, isArchived: { $ne: true } }).sort({ createdAt: -1 })
    return res.status(200).json(users)
})

router.get(ROUTES.client + '/:client_id/evaluation-functions', async (req: Request, res: Response) => {
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    const links = await ClientEvaluationFunction.find({ client: targetClient._id }).populate('evaluationFunction')
    const assignedFunctions = links
        .map((link) => link.evaluationFunction)
        .filter((fn) => !!fn)
        .filter((fn: any) => !fn.isArchived)
    const assignedFunctionIds = assignedFunctions.map((fn: any) => String(fn._id))

    return res.status(200).json({ assignedFunctionIds, assignedFunctions })
})

router.post(ROUTES.client + '/:client_id/evaluation-functions', async (req: Request, res: Response) => {
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    const nextFunctionIds: string[] = Array.isArray(req.body?.evaluationFunctionIds)
        ? req.body.evaluationFunctionIds
        : []

    const existingFunctions = await EvaluationFunction.find({
        _id: { $in: nextFunctionIds },
        isArchived: { $ne: true },
    }).select('_id')
    const validFunctionIds = existingFunctions.map((fn) => String(fn._id))
    const existingLinks = await ClientEvaluationFunction.find({ client: targetClient._id }).select('evaluationFunction')
    const previousFunctionIds = existingLinks.map((link) => String(link.evaluationFunction))

    await ClientEvaluationFunction.deleteMany({ client: targetClient._id })
    if (validFunctionIds.length > 0) {
        await ClientEvaluationFunction.insertMany(
            validFunctionIds.map((evaluationFunction) => ({
                client: targetClient._id,
                evaluationFunction,
            }))
        )
    }

    const revokedFunctionIds = previousFunctionIds.filter((id) => !validFunctionIds.includes(id))
    const grantedFunctionIds = validFunctionIds.filter((id) => !previousFunctionIds.includes(id))

    if (revokedFunctionIds.length > 0) {
        await Analysis.updateMany(
            {
                client: targetClient._id,
                evaluationFunction: { $in: revokedFunctionIds },
            },
            { isReadOnly: true }
        )
    }

    if (grantedFunctionIds.length > 0) {
        await Analysis.updateMany(
            {
                client: targetClient._id,
                evaluationFunction: { $in: grantedFunctionIds },
            },
            { isReadOnly: false }
        )
    }

    console.log({
        revokedFunctionIds,
        grantedFunctionIds,
    })

    return res.status(200).json({ assignedFunctionIds: validFunctionIds })
})

router.get(ROUTES.evaluationFunction + '/:id/clients', async (req: Request, res: Response) => {
    const targetFunction = await EvaluationFunction.findById(req.params.id)
    if (!targetFunction) {
        return res.status(404).json({ message: 'Evaluation function not found' })
    }

    const links = await ClientEvaluationFunction.find({ evaluationFunction: targetFunction._id }).populate('client')
    const assignedClients = links
        .map((link) => link.client)
        .filter((client) => !!client)
        .map((client: any) => ({
            _id: client._id,
            name: client.name,
        }))
    const assignedClientIds = assignedClients.map((client) => String(client._id))

    return res.status(200).json({ assignedClientIds, assignedClients })
})

router.post(ROUTES.evaluationFunction + '/:id/clients', async (req: Request, res: Response) => {
    const targetFunction = await EvaluationFunction.findById(req.params.id)
    if (!targetFunction) {
        return res.status(404).json({ message: 'Evaluation function not found' })
    }

    const nextClientIds: string[] = Array.isArray(req.body?.clientIds) ? req.body.clientIds : []
    const existingClients = await Client.find({ _id: { $in: nextClientIds } }).select('_id')
    const validClientIds = existingClients.map((client) => String(client._id))
    const existingLinks = await ClientEvaluationFunction.find({ evaluationFunction: targetFunction._id }).select(
        'client'
    )
    const previousClientIds = existingLinks.map((link) => String(link.client))

    await ClientEvaluationFunction.deleteMany({ evaluationFunction: targetFunction._id })
    if (validClientIds.length > 0) {
        await ClientEvaluationFunction.insertMany(
            validClientIds.map((client) => ({
                client,
                evaluationFunction: targetFunction._id,
            }))
        )
    }

    const revokedClientIds = previousClientIds.filter((id) => !validClientIds.includes(id))
    const grantedClientIds = validClientIds.filter((id) => !previousClientIds.includes(id))

    if (revokedClientIds.length > 0) {
        await Analysis.updateMany(
            {
                evaluationFunction: targetFunction._id,
                client: { $in: revokedClientIds },
            },
            { isReadOnly: true }
        )
    }

    if (grantedClientIds.length > 0) {
        await Analysis.updateMany(
            {
                evaluationFunction: targetFunction._id,
                client: { $in: grantedClientIds },
            },
            { isReadOnly: false }
        )
    }

    return res.status(200).json({ assignedClientIds: validClientIds })
})

// router.get(ROUTES.client + '/:client_id/analyses', async (req, res) => {
//     const targetClient = await Client.findById(req.params.client_id)
//     if (!targetClient) {
//         return res.status(404).json({ message: 'Client not found' })
//     }

//     const analyses = await Analysis.find({ client: targetClient._id })
//         .sort({ createdAt: -1 })
//         .populate('evaluationFunction')
//     return res.status(200).json(analyses)
// })

// router.post(ROUTES.client + '/:client_id/analyses', async (req, res) => {
//     const targetClient = await Client.findById(req.params.client_id)
//     if (!targetClient) {
//         return res.status(404).json({ message: 'Client not found' })
//     }

//     const { _id, ...body } = req.body

//     if (!_id || _id === 'new') {
//         const newAnalysis = new Analysis({
//             ...body,
//             client: targetClient._id,
//             owner: res.locals.sessionUser._id,
//         })
//         await newAnalysis.save()

//         return res
//             .status(201)
//             .json({ created: await Analysis.findById(newAnalysis._id).populate('evaluationFunction') })
//     } else {
//         const existingAnalysis = await Analysis.findOne({ _id, client: targetClient._id })
//         if (!existingAnalysis) {
//             return res.status(404).json({ message: 'Analysis not found' })
//         }
//         const update = {
//             ...body,
//             client: targetClient._id,
//             owner: res.locals.sessionUser._id,
//         }
//         await Analysis.findByIdAndUpdate(_id, update)

//         return res
//             .status(200)
//             .json({ updated: await Analysis.findById(existingAnalysis._id).populate('evaluationFunction') })
//     }
// })

export default router
