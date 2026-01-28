import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Request, Response, Router } from 'express'
import { computeScenarios } from 'src/services/analysis-utils'

import Analysis, { AnalysisInput, AnalysisOutput } from '../models/analysis.model'
import Client from '../models/client.model'
import EvaluationFunction from '../models/evaluationFunction.model'
import Token from '../models/token.model'
import {
    ScenarioArrayScalar,
    ScenarioConfiguration,
    ScenarioScalar,
    ScenarioTimeSeries,
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

const POPULATE_SCENARIO = ['evaluationFunction', 'owner', 'client']

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
        return res.status(403).json({ message: 'You are not authorized to update users' })
    }

    const { _id, ...body } = req.body

    const user = await User.findById(_id)
    if (user) {
        const update = {
            ...body,
            passwordHash: undefined,
            client: undefined,
            permissions: undefined,
        }

        await User.findByIdAndUpdate(_id, update)

        return res.status(200).json({ message: 'User updated successfully' })
    }

    // Create a new user

    const client = await Client.findById(sessionUser.client._id)
    if (!client) {
        return res.status(404).json({ message: 'Client not found' })
    }
    const currentUserCount = await User.countDocuments({ client: sessionUser.client._id, isArchived: { $ne: true } })
    if (currentUserCount >= client.maxUsers) {
        return res.status(400).json({ message: 'You have reached the maximum number of users for your organization' })
    }

    const { email, ...rest } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' })
    }

    const randomBytes = crypto.randomBytes(32)
    const placeholderPassword = await bcrypt.hash(randomBytes.toString('hex'), 10)

    const newUser = new User({
        email,
        ...rest,
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
    await new Token({ userId: newUser._id, token: hash, createdAt: Date.now() }).save()

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
        return res.status(500).json({ message: 'Failed to send invitation email' })
    }

    return res.status(201).json({ message: 'User invited successfully' })
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
    excludedRoutes: [],
    userSpecific: true,
    ownerField: 'client',
    ownerComparisonFunction: (res) => res.locals.sessionUser?.client?._id?.toString(),
    populate: ['owner', 'client', 'evaluationFunction', 'evaluationFunction.name'],
})

// EvaluationFunction routes
router.get(ROUTES.evaluationFunction, async (req: Request, res: Response) => {
    const { sessionUser } = res.locals

    let filter = {
        isAvailable: true,
        isArchived: { $ne: true },
    }

    if (sessionUser?.permissions?.isAdmin) {
        delete filter.isAvailable
    }

    const functions = await EvaluationFunction.find(filter)
    return res.status(200).json(functions)
})
router.get(ROUTES.evaluationFunction + '/:id', async (req: Request, res: Response) => {
    const targetFunction = await EvaluationFunction.findOne({
        _id: req.params.id,
        isAvailable: true,
        isArchived: { $ne: true },
    })
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
        .populate(POPULATE_SCENARIO)
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
router.get(ROUTES.client + '/:client_id/analyses/:scenario_id', async (req: Request, res: Response) => {
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
        _id: req.params.scenario_id,
        client: targetClient._id,
    }).populate(POPULATE_SCENARIO)
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

        return res.status(201).json({ created: await Analysis.findById(newAnalysis._id).populate(POPULATE_SCENARIO) })
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
            .json({ updated: await Analysis.findById(existingAnalysis._id).populate(POPULATE_SCENARIO) })
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

    return res.status(200).json({ updated: await Analysis.findById(analysis._id).populate(POPULATE_SCENARIO) })
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

    const { analysisId, requiredPackages, inputs, script } = req.body as {
        analysisId: string
        requiredPackages: { name: string; alias?: string; version?: string }[]
        inputs: AnalysisInput[]
        script: string
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

    const inputConfigurations: ScenarioConfiguration[] = computeScenarios(inputs)

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

    console.log(`[server][configuration] Running ${inputConfigurations.length} scenarios`)

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
        console.error(`[server][parallel] Error installing packages`, error)
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
                requiredPackages,
            })),
            (data) => {
                res.write(`event: log\ndata: ${JSON.stringify(data)}\n\n`)
            }
        )

        // console.log(`[server][parallel] Results`, JSON.stringify(results, null, 2))

        // Process results
        console.log(`Received ${results.length} results from parallel execution`)

        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const { outputs, index } = result

            const simulationResult: SimulationResult = {
                inputs: inputConfigurations[index] ?? {},
                result: outputs as { [reference: string]: any },
                index: i,
            }

            res.write(`event: result\ndata: ${JSON.stringify(simulationResult)}\n\n`)
        }

        console.log(`[server][stream] Completed ${results.length} scenarios`)
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

export default router
