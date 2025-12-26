import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'

import { requireWorkspaceMember, requireWorkspaceRole } from '../permissions/workspace.permissions.js'

import { Workspace } from '../models/workspace.model.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { User } from "../models/user.model.js"

const createWorkspace = asyncHandler( async (req, res) => {
    const { name, description } = req.body

    if (!name) {
        throw new ApiError(400, 'Workspace name is required')
    }

    const existingWorkspace = await Workspace.findOne(
        {
            name: name,
            createdBy: req.user._id
        }
    )

    if (existingWorkspace) {
        throw new ApiError(409, 'Workspace with the same name already exists')
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const workspace = await Workspace.create(
            [
                {
                    name: name,
                    description: description || '',
                    createdBy: req.user._id,
                }
            ],
            { session }
        )

        const newWorkspace = workspace[0]

        await WorkspaceMember.create(
            [
                {
                    workspaceId: newWorkspace._id,
                    userId: req.user._id,
                    role: 'owner'
                }
            ],
            { session }
        )

        await session.commitTransaction()
        session.endSession()

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    'Workspace created successfully', 
                    newWorkspace
                )
            )
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        throw error
    }
})

const getMyWorkspaces = asyncHandler( async (req, res) => {
    const memberships = await WorkspaceMember.find(
        {
            userId: req.user._id
        }
    )
    .populate('workspaceId', 'name description createdBy createdAt')
    .lean()

    const workspaces = memberships.map((membership) => (
        {
            role: membership.role,
            workspace: membership.workspaceId
        }
    ))

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspaces fetched successfully",
                workspaces
            )
        )
})

const getWorkspaceById = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    const member = await requireWorkspaceMember(req.user._id, workspaceId)

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspace fetched successfully",
                {
                    workspace: workspace,
                    role: member.role
                }
            )
        )
})

const addWorkspaceMember = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params
    const { userId, role } = req.body

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    const requestorMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    requireWorkspaceRole(requestorMembership, ['owner', 'admin'])
    
    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, 'User not found')
    }

    const existingMember = await WorkspaceMember.findOne(
        {
            userId: userId,
            workspaceId: workspaceId
        }
    )

    if (existingMember) {
        throw new ApiError(409, 'User is already a member of this workspace')
    }

    const allowedRoles = ['owner', 'admin', 'member', 'viewer']
    const assignedRole = role ?? 'member'

    if (!allowedRoles.includes(assignedRole)) {
        throw new ApiError(400, 'Invalid role')
    }

    const newMember = await WorkspaceMember.create(
        {
            userId: userId,
            workspaceId: workspaceId,
            role: assignedRole
        }
    )

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                'Member added to workspace successfully',
                newMember
            )
        )
})

const getWorkspaceMembers = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    await requireWorkspaceMember(req.user._id, workspaceId)

    const members = await WorkspaceMember.find(
        {
            workspaceId: workspaceId
        }
    )
    .populate('userId', 'name email')
    .sort({ createdAt: 1 })
    .lean()

    const formattedMembers = members.map((member) => (
        {
            user: member.userId,
            role: member.role,
            joinedAt: member.createdAt
        }
    ))

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspace members fetched successfully",
                formattedMembers
            )
        )
})

const updateWorkspaceMemberRole = asyncHandler( async (req, res) => {
    const { id: workspaceId, userId: targetUserId } = req.params
    const { role } = req.body

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const allowedRoles = ['owner', 'admin', 'member', 'viewer']
    if (!allowedRoles.includes(role)) {
        throw new ApiError(400, 'Invalid role')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    requireWorkspaceRole(requesterMembership, ['owner', 'admin'])

    const targetMembership = await WorkspaceMember.findOne(
        {
            userId: targetUserId,
            workspaceId: workspaceId
        }
    )

    if (targetMembership.role === role) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    'Role Unchanged',
                    {
                        userId: targetUserId,
                        role: role
                    }
                )
            )

    }

    if (!targetMembership) {
        throw new ApiError(404, 'Target user is not a member of this workspace')
    }

    if (requesterMembership.role === 'admin' && role === 'owner') {
        throw new ApiError(403, 'Admins cannot assign owner role')
    }

    if (targetMembership.role === 'owner' && role !== 'owner') {
        const ownerCount = await WorkspaceMember.countDocuments(
            {
                workspaceId: workspaceId,
                role: 'owner'
            }
        )

        if (ownerCount <= 1) {
            throw new ApiError(400, 'Workspace must have at least one owner')
        }
    }

    targetMembership.role = role
    await targetMembership.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Workspace member role updated successfully',
                {
                    userId: targetUserId,
                    role: role
                }
            )
        )

})

const removeWorkspaceMember = asyncHandler( async (req, res) => {
    const { id: workspaceId, userId: targetUserId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    const targetMembership = await WorkspaceMember.findOne(
        {
            userId: targetUserId,
            workspaceId: workspaceId
        }
    )

    if (!targetMembership) {
        throw new ApiError(404, 'Target user is not a member of this workspace')
    }

    const isSelfRemoval = req.user._id.toString() === targetUserId.toString()

    if (!isSelfRemoval) {
        requireWorkspaceRole(requesterMembership, ['owner', 'admin'])
    }

    if (requesterMembership.role === 'admin' && targetMembership.role ==='owner') {
        throw new ApiError(403, 'Admins cannot remove owners')
    }

    if (requesterMembership.role === 'owner' && targetMembership.role === 'owner' && !isSelfRemoval) {
        throw new ApiError(403, 'Owners cannot remove other owners')
    }

    if (targetMembership.role === 'owner') {
        const ownerCount = await WorkspaceMember.countDocuments(
            {
                workspaceId: workspaceId,
                role: 'owner'
            }
        )

        if (ownerCount <= 1) {
            throw new ApiError(400, 'Workspace must have at least one owner')
        }
    }

    await WorkspaceMember.deleteOne({ _id: targetMembership._id })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Member removed from workspace successfully',
                {
                    userId: targetUserId
                }
            )
        )
})

const updateWorkspace = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params
    const { name, description, isActive } = req.body

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    if (name === undefined && description === undefined && isActive === undefined) {
        throw new ApiError(400, 'At least one field must be provided')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    requireWorkspaceRole(requesterMembership, ['owner', 'admin'])

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    if (name !== undefined) {
        if (!name.trim()) {
            throw new ApiError(400, 'Workspace name cannot be empty')
        }

        workspace.name = name
    }

    if (description !== undefined) {
        workspace.description = description
    }


    if (isActive !== undefined) {
        if (requesterMembership.role !== 'owner') {
            throw new ApiError(403, 'Only owners can archive a workspace')
        }

        workspace.isActive = isActive
    }

    await workspace.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Workspace updated successfully',
                workspace
            )
        )
})

const deleteWorkspace  = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    requireWorkspaceRole(requesterMembership, ['owner'])

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    if (!workspace.isActive) {
        throw new ApiError(400, 'Workspace is already archived')
    }

    workspace.isActive = false

    await workspace.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Workspace archived successfully',
                {
                    workspaceId: workspaceId
                }
            )
        )
})

export { createWorkspace, getMyWorkspaces, getWorkspaceById, addWorkspaceMember, getWorkspaceMembers, updateWorkspaceMemberRole, removeWorkspaceMember, updateWorkspace, deleteWorkspace }