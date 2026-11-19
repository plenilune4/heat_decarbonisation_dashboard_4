import cors from 'cors'
import http from "node:http";
import express from 'express'
import helmet from 'helmet'

import { logRouter, morganMiddleware } from './logger'
import BaseRouter from './routes/api'
import {buildingService} from "./services";
import { connectRedis } from "./redis.js";
import { startJobNotifications } from "./services/job-notifications.js";

import { Server } from "socket.io";

// import { startClientAccessReminderScheduler } from './services/client-access-reminder.service'

const app = express()
// Middleware
app.use(cors())

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL
  }
});



async function start() {
    await buildingService.ready();
    await connectRedis();
    await startJobNotifications(io).then(console.log("Job notifications service started."));

    console.log(
        `Loaded ${
            buildingService.getBuildingCount()
        } buildings`
    );
}

start();


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
