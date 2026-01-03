import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js'
import { logActivity } from '../utils/activityLogger.js'

import { redisClient } from '../config/redis.js'

import { requireWorkspaceMember, requireWorkspaceRole } from '../permissions/workspace.permissions.js'

import { Workspace } from '../models/workspace.model.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { User } from "../models/user.model.js"

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

    await logActivity({
        type: 'MEMBER_ADDED',
        actorId: req.user._id,
        workspaceId: workspaceId,
        entity: {
            type: 'member',
            id: userId
        },
        metadata: {
            role: assignedRole
        }
    })

    const keys = await redisClient.keys(`members:workspace=${workspaceId}:*`)
    if (keys.length > 0) {
        await redisClient.del(keys)
    }

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

    // const members = await WorkspaceMember.find(
    //     {
    //         workspaceId: workspaceId
    //     }
    // )
    // .populate('userId', 'name email')
    // .sort({ createdAt: 1 })
    // .lean()

    const { page, limit, skip } = getPaginationParams(req.query)

    const cacheKey = `members:workspace=${workspaceId}:page=${page}:limit=${limit}`

    const cached = await redisClient.get(cacheKey)

    if (cached) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    'Workspace members fetched successfully (cache)',
                    JSON.parse(cached)
                )
            )
    }

    const [ members, totalItems ] = await Promise.all(
        [
            WorkspaceMember.find({ workspaceId: workspaceId })
                .populate('userId', 'name email')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WorkspaceMember.countDocuments({ workspaceId: workspaceId })
        ]
    )

    const formattedMembers = members.map((member) => (
        {
            user: member.userId,
            role: member.role,
            joinedAt: member.createdAt
        }
    ))

    const meta = buildPaginationMeta({ page, limit, totalItems })

    const responseData = {
        items: formattedMembers,
        meta: meta
    }

    await redisClient.set(
        cacheKey,
        JSON.stringify(responseData),
        { EX: 30 }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Workspace members fetched successfully",
                responseData
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

    if (!targetMembership) {
        throw new ApiError(404, 'Target user is not a member of this workspace')
    }

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

    await logActivity({
        type: 'MEMBER_ROLE_UPDATED',
        actorId: req.user._id,
        workspaceId: workspaceId,
        entity: {
            type: 'member',
            id: targetUserId
        },
        metadata: {
            newRole: role
        }
    })

    const keys = await redisClient.keys(`members:workspace=${workspaceId}:*`)
    if (keys.length > 0) {
        await redisClient.del(keys)
    }

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

    await logActivity({
        type: 'MEMBER_REMOVED',
        actorId: req.user._id,
        workspaceId: workspaceId,
        entity: {
            type: 'member',
            id: targetUserId
        }
    })

    const keys = await redisClient.keys(`members:workspace=${workspaceId}:*`)
    if (keys.length > 0) {
        await redisClient.del(keys)
    }

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

export { addWorkspaceMember, getWorkspaceMembers, updateWorkspaceMemberRole, removeWorkspaceMember }