import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Router } from 'express'

import Analysis from '../models/analysis.model'
import Client from '../models/client.model'
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
    const { email, client, ...rest } = body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' })
    }

    const clientRecord = await Client.findById(client._id)
    if (!clientRecord) {
        return res.status(404).json({ message: 'Client not found' })
    }
    const currentUserCount = await User.countDocuments({ client: client._id, isArchived: { $ne: true } })
    if (currentUserCount >= clientRecord.maxUsers) {
        return res.status(400).json({ message: 'This client has reached the maximum number of users' })
    }

    const randomBytes = crypto.randomBytes(32)
    const placeholderPassword = await bcrypt.hash(randomBytes.toString('hex'), 10)

    const newUser = new User({
        email,
        ...rest,
        passwordHash: placeholderPassword,
        client: clientRecord._id,
        permissions: {
            isAdmin: false,
        },
    })

    await newUser.save()

    // Send email to user with link to reset password
    const token = crypto.randomBytes(32).toString('hex')
    const hash = await bcrypt.hash(token, SALT_ROUNDS)
    await new Token({ userId: newUser._id, token: hash, createdAt: Date.now() }).save()

    try {
        await SendEmail(
            [{ Email: newUser.email, Name: newUser.firstName }],
            {
                name: newUser.firstName,
                client: clientRecord.name,
                link: `${process.env.SITE_URL}/confirm-account?token=${token}&id=${newUser._id}`,
            },
            `${process.env.PROJECT_NAME} - Confirm Account`,
            EMAIL_TEMPLATES.confirmAccount
        )
    } catch (error) {
        return res.status(500).json({ message: 'Failed to send invitation email' })
    }

    return res.status(201).json({ message: 'User invited successfully' })
})

router.delete(ROUTES.user + '/:id', async (req, res) => {
    const targetUser = await User.findById(req.params.id)
    if (!targetUser) {
        return res.status(404).json({ message: 'User not found' })
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
        return res.status(500).json({ message: 'Failed to delete user' })
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
        return res.status(404).json({ message: 'Evaluation function not found' })
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
        return res.status(404).json({ message: 'Client not found' })
    }

    try {
        await User.deleteMany({ client: targetClient._id })
        await Analysis.deleteMany({ client: targetClient._id })

        await Client.findByIdAndDelete(req.params.id)

        return res.status(200).json({ message: 'Client deleted' })
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete client' })
    }
})

router.get(ROUTES.client + '/:client_id/users', async (req, res) => {
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    const users = await User.find({ client: targetClient._id, isArchived: { $ne: true } }).sort({ createdAt: -1 })
    return res.status(200).json(users)
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
