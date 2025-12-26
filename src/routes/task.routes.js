import { Router } from 'express'

import { requireAuth } from '../auth/auth.middleware.js'

import { createTask, getTasks, updateTask, deleteTask } from '../controllers/task.controller.js'

const taskRouter = Router()

// Public Routes (No Auth)


// Protected Routes (Auth Required)
taskRouter.use(requireAuth)


taskRouter.route('/').post(createTask)
taskRouter.route('/').get(getTasks)
taskRouter.route('/:id').patch(updateTask)
taskRouter.route('/:id').delete(deleteTask)


export { taskRouter }