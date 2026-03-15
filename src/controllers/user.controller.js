import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { Task } from '../models/task.model.js'
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js'

/**
 * @desc    Get user dashboard data
 * @route   GET /api/v1/users/dashboard
 * @access  Private
 */
const getUserDashboard = asyncHandler(async (req, res) => {
    const userId = req.user._id

    // 1. Fetch user's workspaces
    const memberships = await WorkspaceMember.find({ userId })
        .populate({
            path: 'workspaceId',
            select: 'name description createdAt'
        })
        .sort({ createdAt: -1 })
        .lean()

    const workspaces = memberships.map((membership) => ({
        role: membership.role,
        workspace: membership.workspaceId,
        joinedAt: membership.createdAt
    }))

    const workspaceIds = memberships.map(m => m.workspaceId?._id).filter(id => id)

    // 2. Fetch recent tasks from workspaces the user is part of
    // Defaulting to tasks assigned to user OR any task in their workspaces if they want a broader view
    // But usually dashboard "recentTasks" should be personalized.
    // However, the user complained it's empty, so let's fetch any "todo" or "in-progress" task in their workspaces
    const recentTasks = await Task.find({
        workspaceId: { $in: workspaceIds },
        status: { $in: ['todo', 'in-progress'] }
    })
        .populate({
            path: 'workspaceId',
            select: 'name'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()

    // Format tasks to include workspace name directly for convenience
    const formattedTasks = recentTasks.map(task => ({
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        workspaceName: task.workspaceId?.name || 'Unknown',
        workspaceId: task.workspaceId?._id,
        createdAt: task.createdAt
    }))

    const responseData = {
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
        },
        workspaces,
        recentTasks: formattedTasks
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Dashboard data fetched successfully',
                responseData
            )
        )
})

/**
 * @desc    Get tasks across all workspaces the user is a part of
 * @route   GET /api/v1/users/tasks
 * @access  Private
 */
const getUserTasks = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const { status, priority, assignedToMe } = req.query

    // 1. Get all workspaces the user is a member of
    const memberships = await WorkspaceMember.find({ userId }).select('workspaceId')
    const workspaceIds = memberships.map(m => m.workspaceId)

    if (workspaceIds.length === 0) {
        return res.status(200).json(new ApiResponse(200, 'User has no workspaces', { items: [], meta: buildPaginationMeta({ page: 1, limit: 10, totalItems: 0 }) }))
    }

    const filter = { workspaceId: { $in: workspaceIds } }

    if (status) {
        const statusArray = status.split(',')
        filter.status = { $in: statusArray }
    } else {
        // Default to showing todo and in-progress as per user's likely intent for an overview
        filter.status = { $in: ['todo', 'in-progress'] }
    }

    if (priority) {
        const priorityArray = priority.split(',')
        filter.priority = { $in: priorityArray }
    }

    if (assignedToMe === 'true') {
        filter.assignedTo = userId
    }

    const { page, limit, skip } = getPaginationParams(req.query)

    const [tasks, totalItems] = await Promise.all([
        Task.find(filter)
            .populate({
                path: 'workspaceId',
                select: 'name'
            })
            .populate({
                path: 'createdBy',
                select: 'name email'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Task.countDocuments(filter)
    ])

    const meta = buildPaginationMeta({ page, limit, totalItems })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'User tasks fetched successfully',
                { items: tasks, meta }
            )
        )
})

export { getUserDashboard, getUserTasks }
