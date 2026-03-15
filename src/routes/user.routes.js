import { Router } from 'express'
import { getUserDashboard, getUserTasks } from '../controllers/user.controller.js'
import { requireAuth } from '../auth/auth.middleware.js'

const userRouter = Router()

// Protected Routes
userRouter.use(requireAuth)

userRouter.route('/dashboard').get(getUserDashboard)
userRouter.route('/tasks').get(getUserTasks)

export { userRouter }
