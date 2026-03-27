import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Request, Response, Router } from 'express'
import ExternalAnalysis from 'src/models/externalAnalysis.model'
import { computeScenarios } from 'src/services/analysis-utils'
import { makeScenariosFromExternalData } from 'src/services/external-analysis-utils'

import Analysis, { AnalysisInput } from '../models/analysis.model'
import Client from '../models/client.model'
import ClientEvaluationFunction from '../models/clientEvaluationFunction.model'
import EvaluationFunction from '../models/evaluationFunction.model'
import Token from '../models/token.model'
import {
    SamplingStrategy,
    ScenarioConfiguration,
    SimulationError,
    SimulationLog,
    SimulationResult,
    SimulationSetup,
} from '../models/types'
import User from '../models/user.model'
import { SALT_ROUNDS } from '../services/authentication.service'
import { createUserContainer, DockerServiceImplementation } from '../services/docker.service'
import { EMAIL_TEMPLATES } from '../services/email.config'
import { SendEmail } from '../services/email.service'
import LoggingService from '../services/logging.service'
import { PythonServiceImplementation } from '../services/python.service'
import { ENDPOINTS } from './_endpoints'
import BaseRoutes from './helper'

const router = Router()
const ROUTES = ENDPOINTS.app

const POPULATE_ANALYSIS = ['evaluationFunction', 'owner', 'client']
const POPULATE_EXTERNAL_ANALYSIS = ['owner', 'client']

function isClientAccessActive(client: { accessStartAt?: Date; accessEndAt?: Date } | null | undefined) {
    if (!client) return false
    const now = new Date()
    if (client.accessStartAt && new Date(client.accessStartAt).valueOf() > now.valueOf()) {
        return false
    }
    if (client.accessEndAt && new Date(client.accessEndAt).valueOf() < now.valueOf()) {
        return false
    }
    return true
}

// User routes with access control
BaseRoutes(router, {
    model: User,
    route: ROUTES.user,
    excludedRoutes: ['delete'],
    userSpecific: true,
    ownerField: '_id',
    populate: ['client'],
    excludedUpdateProperties: ['client', 'permissions', 'passwordHash', 'isClientAdmin'],
})

// Client User routes with access control
// All users can get all users in their client
BaseRoutes(router, {
    model: User,
    route: ROUTES.clientUser,
    excludedRoutes: ['post', 'delete'],
    userSpecific: true,
    ownerField: 'client',
    ownerComparisonFunction: (res) => res.locals.sessionUser?.client?._id?.toString(),
    filter: { isArchived: { $ne: true } },
})

// Client Admin routes with access control
// Only client admins can post or delete other users, only in their client
router.post(ROUTES.clientUser, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    if (!sessionUser.isClientAdmin) {
        return res.status(403).json({ error: 'You are not authorized to update users' })
    }

    const { _id, ...body } = req.body

    if (!_id || _id === 'new') {
        // Create a new user
        const client = await Client.findById(sessionUser.client._id)
        if (!client) {
            return res.status(404).json({ error: 'Client not found' })
        }
        const currentUserCount = await User.countDocuments({
            client: sessionUser.client._id,
            isArchived: { $ne: true },
        })
        if (currentUserCount >= client.maxUsers) {
            return res.status(400).json({ error: 'You have reached the maximum number of users for your organization' })
        }

        const { email } = req.body

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email address has already been invited' })
        }

        const randomBytes = crypto.randomBytes(32)
        const placeholderPassword = await bcrypt.hash(randomBytes.toString('hex'), 10)

        const newUser = new User({
            email,
            firstName: body.firstName,
            lastName: body.lastName,
            profileImage: body.profileImage,
            isClientAdmin: body.isClientAdmin,
            //
            passwordHash: placeholderPassword,
            client: sessionUser.client._id,
            permissions: {
                isAdmin: false,
            },
        })

        await newUser.save()

        // Send email to user with link to reset password
        const token = crypto.randomBytes(32).toString('hex')
        const hash = await bcrypt.hash(token, SALT_ROUNDS)
        await new Token({ userId: newUser._id, token: hash, createdAt: Date.now(), expiresAt: Date.now() + 3600*1000*48}).save()

        const clientRecord = await Client.findById(sessionUser.client?._id)

        try {
            await SendEmail(
                [{ Email: newUser.email, Name: newUser.firstName }],
                {
                    name: newUser.firstName,
                    client: clientRecord?.name,
                    link: `${process.env.SITE_URL}/confirm-account?token=${token}&id=${newUser._id}`,
                },
                `${process.env.PROJECT_NAME} - Confirm Account`,
                EMAIL_TEMPLATES.confirmAccount
            )
        } catch (error) {
            return res.status(500).json({ error: 'Failed to send invitation email' })
        }

        return res.status(201).json({ message: 'User invited successfully' })
    } else {
        const user = await User.findOne({ _id, client: sessionUser.client._id })
        if (user) {
            const update = {
                firstName: body.firstName,
                lastName: body.lastName,
                profileImage: body.profileImage,
                isClientAdmin: body.isClientAdmin,
            }

            await User.findByIdAndUpdate(_id, update)

            return res.status(200).json({ message: 'User updated successfully' })
        }
    }
})

router.post(ROUTES.clientUser + '/:id/resend-invite', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    if (!sessionUser.isClientAdmin) {
        return res.status(403).json({ message: 'You are not authorized to re-send user invitations' })
    }

    const user = await User.findOne({ _id: req.params.id, client: sessionUser.client._id }).populate('client')
    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const hash = await bcrypt.hash(token, SALT_ROUNDS)

    // Invalidate any outstanding invite/reset token and issue a fresh one.
    await Token.deleteMany({ userId: user._id })
    await new Token({ userId: user._id, token: hash, createdAt: Date.now(), expiresAt: Date.now() + 3600*1000*48 }).save()

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
        return res.status(500).json({ message: 'Failed to send invitation email' })
    }

    return res.status(200).json({ message: 'Invitation re-sent successfully' })
})

router.delete(ROUTES.clientUser + '/:id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    if (!sessionUser.isClientAdmin) {
        return res.status(403).json({ message: 'You are not authorized to delete users' })
    }

    const targetUser = await User.findOne({ _id: req.params.id, client: sessionUser.client._id })
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
        await User.findByIdAndDelete(targetUser._id)
    } catch (error) {
        LoggingService.log({
            level: 'error',
            service: 'client-admin',
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

// Analysis routes with access control
BaseRoutes(router, {
    model: Analysis,
    route: ROUTES.analysis,
    excludedRoutes: ['get'],
    userSpecific: true,
    ownerField: 'client',
    ownerComparisonFunction: (res) => res.locals.sessionUser?.client?._id?.toString(),
    populate: ['owner', 'client', 'evaluationFunction', 'evaluationFunction.name'],
})
router.get(ROUTES.analysis, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    const targetClient = await Client.findById(sessionUser.client._id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    const analyses = await Analysis.find({ client: targetClient._id })
        .sort({ createdAt: -1 })
        .select('-results')
        .populate(POPULATE_ANALYSIS)

    return res.status(200).json(analyses)
})

// External Analysis routes with access control
BaseRoutes(router, {
    model: ExternalAnalysis,
    route: ROUTES.externalAnalysis,
    excludedRoutes: ['get'],
    userSpecific: true,
    ownerField: 'client',
    ownerComparisonFunction: (res) => res.locals.sessionUser?.client?._id?.toString(),
    populate: ['owner', 'client'],
})
router.get(ROUTES.externalAnalysis, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    const targetClient = await Client.findById(sessionUser.client._id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    const analyses = await ExternalAnalysis.find({ client: targetClient._id })
        .sort({ createdAt: -1 })
        .select('-results')
        .populate(POPULATE_EXTERNAL_ANALYSIS)

    return res.status(200).json(analyses)
})

// EvaluationFunction routes
router.get(ROUTES.evaluationFunction, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (sessionUser?.permissions?.isAdmin) {
        const functions = await EvaluationFunction.find({ isArchived: { $ne: true } })
        return res.status(200).json(functions)
    }

    const targetClient = await Client.findById(sessionUser?.client?._id)
    if (!isClientAccessActive(targetClient)) {
        return res.status(200).json([])
    }

    const allowedLinks = await ClientEvaluationFunction.find({ client: targetClient._id }).select('evaluationFunction')
    const allowedFunctionIds = allowedLinks.map((link) => link.evaluationFunction)
    const functions = await EvaluationFunction.find({
        _id: { $in: allowedFunctionIds },
        isArchived: { $ne: true },
    })
    return res.status(200).json(functions)
})
router.get(ROUTES.evaluationFunction + '/:id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    const baseFilter: any = { _id: req.params.id, isArchived: { $ne: true } }

    if (!sessionUser?.permissions?.isAdmin) {
        const targetClient = await Client.findById(sessionUser?.client?._id)
        if (!isClientAccessActive(targetClient)) {
            return res.status(404).json({ message: 'Evaluation function not found' })
        }

        const link = await ClientEvaluationFunction.findOne({
            client: targetClient._id,
            evaluationFunction: req.params.id,
        })
        if (!link) {
            return res.status(404).json({ message: 'Evaluation function not found' })
        }
    }

    const targetFunction = await EvaluationFunction.findOne(baseFilter)
    if (!targetFunction) {
        return res.status(404).json({ message: 'Evaluation function not found' })
    }
    return res.status(200).json(targetFunction)
})

// Client Analyses routes
router.get(ROUTES.client + '/:client_id/analyses', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to view analyses for this client' })
    }

    const analyses = await Analysis.find({ client: targetClient._id })
        .sort({ createdAt: -1 })
        .populate(POPULATE_ANALYSIS)
    return res.status(200).json(analyses)
})
router.get(ROUTES.client + '/:client_id/analyses/make-reference', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to make a reference for this client' })
    }

    const analyses = await Analysis.find({ client: targetClient._id }).sort({ createdAt: -1 })

    const highestReference = analyses.reduce((max, analysis) => {
        const reference = parseInt(analysis.reference.split('-')[1])
        return reference > max ? reference : max
    }, 0)

    const nextReference = `${targetClient.name.slice(0, 4).toUpperCase()}-${(highestReference + 1).toString().padStart(3, '0')}`

    return res.status(200).json({ nextReference })
})
router.get(ROUTES.client + '/:client_id/analyses/:analysis_id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to view analyses for this client' })
    }

    const analysis = await Analysis.findOne({
        _id: req.params.analysis_id,
        client: targetClient._id,
    }).populate(POPULATE_ANALYSIS)

    if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' })
    }

    return res.status(200).json(analysis)
})

router.post(ROUTES.client + '/:client_id/analyses', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to create analyses for this client' })
    }

    const { _id, ...body } = req.body

    if (!_id || _id === 'new') {
        const newAnalysis = new Analysis({
            ...body,
            client: targetClient._id,
            owner: res.locals.sessionUser._id,
        })
        await newAnalysis.save()

        return res.status(201).json({ created: await Analysis.findById(newAnalysis._id).populate(POPULATE_ANALYSIS) })
    } else {
        const existingAnalysis = await Analysis.findOne({ _id, client: targetClient._id })
        if (!existingAnalysis) {
            return res.status(404).json({ message: 'Analysis not found' })
        }
        const update = {
            ...body,
            client: targetClient._id,
            owner: res.locals.sessionUser._id,
        }
        await Analysis.findByIdAndUpdate(_id, update)

        return res
            .status(200)
            .json({ updated: await Analysis.findById(existingAnalysis._id).populate(POPULATE_ANALYSIS) })
    }
})

router.post(ROUTES.client + '/:client_id/analyses/:analysis_id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to update analyses for this client' })
    }

    const analysis = await Analysis.findById(req.params.analysis_id)
    if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' })
    }

    const update = {
        scenarioInputs: req.body?.scenarioInputs ?? undefined,
        scenarioOutputs: req.body?.scenarioOutputs ?? undefined,
        results: req.body?.results ?? undefined,
        charts: req.body?.charts ?? undefined,
    }

    await Analysis.findByIdAndUpdate(req.params.analysis_id, update)

    return res.status(200).json({ updated: await Analysis.findById(analysis._id).populate(POPULATE_ANALYSIS) })
})

router.post(ROUTES.runAnalysis + '/parallel', async (req, res) => {
    let finished = false
    let aborted = false
    res.on('finish', () => {
        finished = true
        console.log('[server][stream] FINISH event fired (response sent normally)')
    })
    res.on('close', () => {
        if (!finished) {
            console.log('[server][stream] CLOSE event fired (client aborted or connection error)')
            aborted = true
        } else {
            console.log('[server][stream] CLOSE event fired after finish (normal)')
        }
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const { sessionUser } = res.locals
    if (!sessionUser.dockerService?.containerId) {
        const simError: SimulationError = {
            inputs: {},
            error: 'Your container is not running. You can re-start it from your profile page.',
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    const { analysisId, requiredPackages, inputs, script, exogenousSamplingStrategy, leverSamplingStrategy } =
        req.body as {
            analysisId: string
            requiredPackages: { name: string; alias?: string; version?: string }[]
            inputs: AnalysisInput[]
            script: string
            exogenousSamplingStrategy: SamplingStrategy
            leverSamplingStrategy: SamplingStrategy
        }

    if (!analysisId) {
        const simError: SimulationError = {
            inputs: {},
            error: 'Analysis ID is missing',
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }
    if (!script) {
        const simError: SimulationError = {
            inputs: {},
            error: 'Script is missing',
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    const [inputConfigurations, configurationError]: [ScenarioConfiguration[], Error | null] = computeScenarios(
        inputs,
        exogenousSamplingStrategy,
        leverSamplingStrategy
    )
    if (configurationError) {
        const simError: SimulationError = {
            inputs: {},
            error: configurationError.message,
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    if (!inputConfigurations?.length) {
        const simError: SimulationError = {
            inputs: {},
            error: 'No scenarios provided',
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    const pythonService = new PythonServiceImplementation(sessionUser.dockerService.containerId)

    try {
        await pythonService.ensureContainerRunning(sessionUser.dockerService.containerId)
    } catch (error) {
        const simError: SimulationError = {
            inputs: {},
            error: 'Your container is not running. You can re-start it from your profile page.',
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    console.log(`[server][config] Running ${inputConfigurations.length} scenarios`)

    try {
        if (requiredPackages?.length) {
            const simSetup: SimulationSetup = {
                inputs: {},
                installingPackages: requiredPackages.map((pkg) => pkg.name),
            }
            res.write(`event: setup\ndata: ${JSON.stringify(simSetup)}\n\n`)
            await pythonService.installPackages(
                ...requiredPackages.map((pkg) => {
                    if (pkg.version) {
                        return `--force-reinstall -v "${pkg.name}==${pkg.version}"`
                    }
                    return pkg.name
                })
            )
        }
    } catch (error) {
        console.error(`[server][config] Error installing packages`, error)
        const simError: SimulationError = {
            inputs: {},
            error: error.message,
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
        res.end()
        return
    }

    const simSetup: SimulationSetup = {
        inputs: {},
        numberOfScenarios: inputConfigurations.length,
    }
    res.write(`event: setup\ndata: ${JSON.stringify(simSetup)}\n\n`)

    try {
        // Execute in parallel within the Python process
        const results = await pythonService.executeScriptParallel(
            analysisId,
            script,
            inputConfigurations.map((inputs, index) => ({
                index,
                inputs,
            })),
            requiredPackages,
            (data) => {
                if (data.error) {
                    const simError: SimulationError = {
                        inputs: {},
                        error: data.error,
                    }
                    res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
                }
                if (data.log) {
                    const simLog: SimulationLog = {
                        inputs: {},
                        log: data.log,
                    }
                    res.write(`event: log\ndata: ${JSON.stringify(simLog)}\n\n`)
                }
            }
        )

        console.log(`[server][stream] Executed ${results.length} results`)

        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const { outputs, index } = result

            const parsedOutputs = {}
            for (const [reference, value] of Object.entries(outputs)) {
                let parsedNumber = parseFloat(value as string)
                if (!isNaN(parsedNumber) && isFinite(parsedNumber)) {
                    parsedOutputs[reference] = parsedNumber
                } else {
                    parsedOutputs[reference] = value
                }
            }

            const simulationResult: SimulationResult = {
                inputs: inputConfigurations[index] ?? {},
                result: parsedOutputs as { [reference: string]: any },
                index: i,
            }

            res.write(`event: result\ndata: ${JSON.stringify(simulationResult)}\n\n`)
        }

        console.log(`[server][stream] Streamed ${results.length} results`)
    } catch (error) {
        const simError: SimulationError = {
            inputs: {},
            error: error.message,
        }
        res.write(`event: error\ndata: ${JSON.stringify(simError)}\n\n`)
    }

    res.write(`event: done\n\n`)
    res.end()
})

// Client External Analyses

router.get(ROUTES.client + '/:client_id/external-analyses', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to view analyses for this client' })
    }

    const analyses = await ExternalAnalysis.find({ client: targetClient._id })
        .sort({ createdAt: -1 })
        .populate(POPULATE_EXTERNAL_ANALYSIS)
    return res.status(200).json(analyses)
})
router.get(ROUTES.client + '/:client_id/external-analyses/make-reference', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to make a reference for this client' })
    }

    const analyses = await ExternalAnalysis.find({ client: targetClient._id }).sort({ createdAt: -1 })

    const highestReference = analyses.reduce((max, analysis) => {
        const reference = parseInt(analysis.reference.split('-')[1])
        return reference > max ? reference : max
    }, 0)

    const nextReference = `${targetClient.name.slice(0, 4).toUpperCase()}-${(highestReference + 1).toString().padStart(3, '0')}`

    return res.status(200).json({ nextReference })
})
router.get(ROUTES.client + '/:client_id/external-analyses/:analysis_id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    if (!req.params.client_id || req.params.client_id === 'undefined') {
        return res.status(400).json({ message: 'Client ID is required' })
    }

    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }

    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to view analyses for this client' })
    }

    const analysis = await ExternalAnalysis.findOne({
        _id: req.params.analysis_id,
        client: targetClient._id,
    }).populate(POPULATE_EXTERNAL_ANALYSIS)

    if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' })
    }

    return res.status(200).json(analysis)
})

router.post(ROUTES.client + '/:client_id/external-analyses', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to create analyses for this client' })
    }

    const { _id } = req.body

    if (!_id || _id === 'new') {
        const { label, reference, inputData, inputColumnMappings } = req.body

        const { scenarioInputs, scenarioOutputs, results } = makeScenariosFromExternalData(
            inputData,
            inputColumnMappings
        )
        if (!scenarioInputs || !scenarioOutputs || !results) {
            return res.status(400).json({ message: 'Error creating analysis' })
        }

        const newAnalysis = new ExternalAnalysis({
            client: targetClient._id,
            owner: res.locals.sessionUser._id,
            label,
            reference,
            inputData,
            inputColumnMappings,
            scenarioInputs,
            scenarioOutputs,
            results,
        })
        await newAnalysis.save()

        return res
            .status(201)
            .json({ created: await ExternalAnalysis.findById(newAnalysis._id).populate(POPULATE_EXTERNAL_ANALYSIS) })
    } else {
        const existingAnalysis = await ExternalAnalysis.findOne({ _id, client: targetClient._id })
        if (!existingAnalysis) {
            return res.status(404).json({ message: 'Analysis not found' })
        }

        const { label, inputData, inputColumnMappings, filters, charts } = req.body

        const { scenarioInputs, scenarioOutputs, results } = makeScenariosFromExternalData(
            inputData,
            inputColumnMappings
        )
        if (!scenarioInputs || !scenarioOutputs || !results) {
            return res.status(400).json({ message: 'Error creating analysis' })
        }

        const update = {
            label,
            inputData,
            inputColumnMappings,
            scenarioInputs,
            scenarioOutputs,
            results,
            filters,
            charts,
            client: targetClient._id,
            owner: res.locals.sessionUser._id,
        }
        await ExternalAnalysis.findByIdAndUpdate(_id, update)

        return res.status(200).json({
            updated: await ExternalAnalysis.findById(existingAnalysis._id).populate(POPULATE_EXTERNAL_ANALYSIS),
        })
    }
})

router.post(ROUTES.client + '/:client_id/external-analyses/:analysis_id', async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    const targetClient = await Client.findById(req.params.client_id)
    if (!targetClient) {
        return res.status(404).json({ message: 'Client not found' })
    }
    if (sessionUser.client._id.toString() !== targetClient._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to update analyses for this client' })
    }

    const analysis = await ExternalAnalysis.findById(req.params.analysis_id)
    if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' })
    }

    const update = {
        inputColumnMappings: req.body?.inputColumnMappings ?? undefined,
        scenarioInputs: req.body?.scenarioInputs ?? undefined,
        scenarioOutputs: req.body?.scenarioOutputs ?? undefined,
        filters: req.body?.filters ?? undefined,
        results: req.body?.results ?? undefined,
        charts: req.body?.charts ?? undefined,
    }

    await ExternalAnalysis.findByIdAndUpdate(req.params.analysis_id, update)

    return res
        .status(200)
        .json({ updated: await ExternalAnalysis.findById(analysis._id).populate(POPULATE_EXTERNAL_ANALYSIS) })
})

// Client Docker Routes

router.get(ROUTES.dockerStatus, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals
    if (!sessionUser.dockerService?.containerId) {
        return res.status(400).json({ error: 'User does not have a docker container' })
    }

    try {
        const dockerService = new DockerServiceImplementation()
        const container = await dockerService.inspectContainer(sessionUser.dockerService.containerId)
        return res.status(200).json({ isRunning: container.State.Running })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong while checking your docker container status' })
    }
})

router.get(ROUTES.dockerStart, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    try {
        const dockerService = new DockerServiceImplementation()

        if (!sessionUser.dockerService?.containerId) {
            try {
                const containerId = await createUserContainer(sessionUser)
                sessionUser.dockerService = { containerId }
                await sessionUser.save()
            } catch (dockerError) {
                LoggingService.log({
                    level: 'error',
                    service: 'docker-start',
                    message: 'Failed to create Docker container',
                    error: dockerError.message,
                    data: {
                        sessionUser: {
                            _id: sessionUser._id,
                            email: sessionUser.email,
                            client: sessionUser.client._id,
                            dockerService: {
                                containerId: sessionUser.dockerService?.containerId,
                            },
                        },
                        error: dockerError.message,
                    },
                })
                return res.status(500).json({ error: 'Failed to create Docker container' })
            }
        }

        await dockerService.startContainer(sessionUser.dockerService.containerId)

        return res.status(200).json({ message: 'Docker container started' })
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong while starting your docker container' })
    }
})

//

export default router
