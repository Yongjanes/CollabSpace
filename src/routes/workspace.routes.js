import { Router } from 'express'
import { createWorkspace, getMyWorkspaces, getWorkspaceById, addWorkspaceMember, getWorkspaceMembers, updateWorkspaceMemberRole, removeWorkspaceMember } from '../controllers/workspace.controller.js'

import { requireAuth } from '../auth/auth.middleware.js'


const workspaceRouter = Router()


// Public Routes (No Auth)



// Protected Routes (Auth Required)
workspaceRouter.use(requireAuth)


workspaceRouter.route('/').post(createWorkspace)
workspaceRouter.route('/').get(getMyWorkspaces)
workspaceRouter.route("/:id").get(getWorkspaceById)
workspaceRouter.route('/:id/members').post(addWorkspaceMember)
workspaceRouter.route('/:id/members').get(getWorkspaceMembers)
workspaceRouter.route('/:id/members/:userId').patch(updateWorkspaceMemberRole)
workspaceRouter.route('/:id/members/:userId').delete(removeWorkspaceMember)


export { workspaceRouter }