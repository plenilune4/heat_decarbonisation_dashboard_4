import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { logRouter, morganMiddleware } from './logger'
import BaseRouter from './routes/api'
import { s3Router } from './services/s3.service'

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
app.use('/api/s3', s3Router)
app.use('/api/log', logRouter)

export default app
