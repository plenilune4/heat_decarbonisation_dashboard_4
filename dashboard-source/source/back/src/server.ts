import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { logRouter, morganMiddleware } from './logger'
import BaseRouter from './routes/api'
import {buildingService} from "./services";

import { Server } from "socket.io";

// import { startClientAccessReminderScheduler } from './services/client-access-reminder.service'


async function start() {
    await buildingService.ready();

    console.log(
        `Loaded ${
            buildingService.getBuildingCount()
        } buildings`
    );
}

start();

const app = express()

// Middleware
app.use(cors())

// Parsing JSON
app.use(express.json({ limit: '16mb' }))
app.use(express.urlencoded({ limit: '16mb', extended: true }))

// Use Morgan for HTTP logging integrated with Winston
app.use(morganMiddleware)

// Security
if (process.env.NODE_ENV === 'staging') {
    app.use(helmet())
}

// Routes
app.use('/api', BaseRouter)
app.use('/api/log', logRouter)

// startClientAccessReminderScheduler()


export default app
