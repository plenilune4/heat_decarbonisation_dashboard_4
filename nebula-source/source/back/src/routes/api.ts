import { Router } from 'express'

import { adminMw, userMw } from '../middleware'
import adminRouter from './admin.routes'
import appRouter from './app.routes'
import authRouter from './auth.routes'
import publicRouter from './public.routes'

const apiRouter = Router()

apiRouter.use('/public', publicRouter)
apiRouter.use('/admin', adminMw, adminRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/app', userMw, appRouter)

export default apiRouter
