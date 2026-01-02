import { Router } from 'express'

import { requireAuth } from '../auth/auth.middleware.js'

import { createWorkspace, getMyWorkspaces, getWorkspaceById, updateWorkspace, deleteWorkspace } from '../controllers/workspace.controller.js'

const workspaceRouter = Router()

// Public Routes (No Auth)


// Protected Routes (Auth Required)
workspaceRouter.use(requireAuth)

workspaceRouter.route('/').post(createWorkspace)
workspaceRouter.route('/').get(getMyWorkspaces)
workspaceRouter.route("/:id").get(getWorkspaceById)
workspaceRouter.route('/:id').patch(updateWorkspace)
workspaceRouter.route('/:id').delete(deleteWorkspace)


// members Route Redirection

import { workspaceMemberRouter } from './workspaceMember.routes.js'

workspaceRouter.use('/:id/members', workspaceMemberRouter)

// activity Routes

import { getWorkspaceActivity } from '../controllers/activity.controller.js'

workspaceRouter.route('/:id/activity').get(getWorkspaceActivity)

export { workspaceRouter }