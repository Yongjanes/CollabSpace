import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js'
import { logActivity } from '../utils/activityLogger.js'

import { requireWorkspaceMember, requireWorkspaceRole } from '../permissions/workspace.permissions.js'

import { Workspace } from '../models/workspace.model.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { Task } from '../models/task.model.js'
import { Comment } from '../models/comment.model.js'
import { ActivityLog } from '../models/activityLog.model.js'
import { scanAndDelete } from '../utils/cache.js'

const createWorkspace = asyncHandler(async (req, res) => {
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

    let newWorkspace = null

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

        newWorkspace = workspace[0]

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
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        throw error
    } finally {
        session.endSession()
    }

    // Post-transaction logic
    await logActivity({
        type: 'WORKSPACE_CREATED',
        actorId: req.user._id,
        workspaceId: newWorkspace._id,
        entity: {
            type: 'workspace',
            id: newWorkspace._id
        },
        metadata: {
            name: newWorkspace.name
        }
    })

    console.log("Workspace created:", newWorkspace.name, "ID:", newWorkspace._id);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                'Workspace created successfully',
                {
                    workspace: newWorkspace,
                    role: 'owner'
                }
            )
        )
})

const getMyWorkspaces = asyncHandler(async (req, res) => {
    // const memberships = await WorkspaceMember.find(
    //     {
    //         userId: req.user._id
    //     }
    // )
    // .populate('workspaceId', 'name description createdBy createdAt')
    // .lean()

    const { page, limit, skip } = getPaginationParams(req.query)

    const [memberships, totalItems] = await Promise.all(
        [
            WorkspaceMember.find({ userId: req.user._id })
                .populate('workspaceId', 'name description createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WorkspaceMember.countDocuments({ userId: req.user._id })
        ]
    )

    const workspaces = memberships.map((membership) => (
        {
            role: membership.role,
            workspace: membership.workspaceId,
            joinedAt: membership.createdAt
        }
    ))

    const meta = buildPaginationMeta({ page, limit, totalItems })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspaces fetched successfully",
                {
                    items: workspaces,
                    meta: meta
                }
            )
        )
})

const getWorkspaceById = asyncHandler(async (req, res) => {
    const { id: workspaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    const member = await requireWorkspaceMember(req.user._id, workspaceId)

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
        throw new ApiError(404, 'Workspace not found')
    }

    const responseData = {
        workspace: workspace,
        role: member.role
    }

    console.log("Response for GET /workspaces/:id", JSON.stringify(responseData, null, 2));

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspace fetched successfully",
                responseData
            )
        )
})

const updateWorkspace = asyncHandler(async (req, res) => {
    const { id: workspaceId } = req.params
    const { name, description } = req.body

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, "Invalid workspace id")
    }

    if (name === undefined && description === undefined) {
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

    await workspace.save()

    await logActivity({
        type: 'WORKSPACE_UPDATED',
        actorId: req.user._id,
        workspaceId: workspace._id,
        entity: {
            type: 'workspace',
            id: workspace._id
        },
        metadata: {
            name: workspace.name
        }
    })

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

const deleteWorkspace = asyncHandler(async (req, res) => {
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

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // 1. Delete all comments in the workspace
        await Comment.deleteMany({ workspaceId }, { session })

        // 2. Delete all tasks in the workspace
        await Task.deleteMany({ workspaceId }, { session })

        // 3. Delete all activity logs in the workspace
        await ActivityLog.deleteMany({ workspaceId }, { session })

        // 4. Delete all members of the workspace
        await WorkspaceMember.deleteMany({ workspaceId }, { session })

        // 5. Delete the workspace itself
        await Workspace.findByIdAndDelete(workspaceId, { session })

        await session.commitTransaction()
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        throw error
    } finally {
        session.endSession()
    }

    // Cache invalidation
    await Promise.all([
        scanAndDelete(`tasks:workspace=${workspaceId}:*`),
        scanAndDelete(`activity:${workspaceId}:*`)
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Workspace and all associated records deleted permanently',
                {
                    workspaceId: workspaceId
                }
            )
        )
})


export { createWorkspace, getMyWorkspaces, getWorkspaceById, updateWorkspace, deleteWorkspace }