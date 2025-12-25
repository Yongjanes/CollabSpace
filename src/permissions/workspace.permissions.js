import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { ApiError } from '../utils/ApiError.js'

const getWorkspaceMember = async (userId, workspaceId) => {
    const member = await WorkspaceMember.findOne(
        {
            userId: userId,
            workspaceId: workspaceId
        }
    )
    return member
}

const requireWorkspaceMember = async (userId, workspaceId) => {
    const member = await getWorkspaceMember(userId, workspaceId)

    if (!member) {
        throw new ApiError(403, 'User is not a member of this workspace')
    }

    return member
}

const requireWorkspaceRole = (member, allowedRoles = []) => {
    if (!allowedRoles.includes(member.role)) {
        throw new ApiError(403, 'Insufficient workspace permissions')
    }
}


export { getWorkspaceMember, requireWorkspaceMember, requireWorkspaceRole }