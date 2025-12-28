import { Router } from 'express'

import { addWorkspaceMember, getWorkspaceMembers, updateWorkspaceMemberRole, removeWorkspaceMember } from '../controllers/workspaceMember.controller.js'

const workspaceMemberRouter = Router({ mergeParams: true })

workspaceMemberRouter.route('/').post(addWorkspaceMember)
workspaceMemberRouter.route('/').get(getWorkspaceMembers)
workspaceMemberRouter.route('/:userId').patch(updateWorkspaceMemberRole)
workspaceMemberRouter.route('/:userId').delete(removeWorkspaceMember)

export { workspaceMemberRouter }


