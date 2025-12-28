import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'

import { requireWorkspaceMember, requireWorkspaceRole } from '../permissions/workspace.permissions.js'

import { Workspace } from '../models/workspace.model.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'

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


export { createWorkspace, getMyWorkspaces, getWorkspaceById, updateWorkspace, deleteWorkspace }