import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'

import { Workspace } from '../models/workspace.model.js'
import { WorkspaceMember } from '../models/workspaceMember.model.js'
import { Task } from '../models/task.model.js'

import { requireWorkspaceMember } from '../permissions/workspace.permissions.js'

const createTask = asyncHandler( async (req, res) => {
    const { workspaceId, title, description, priority, assignedTo } = req.body

    if (!workspaceId || !title?.trim()) {
        throw new ApiError(400, 'workspaceId and title are required')
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, 'Invalid workspace id')
    }

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, workspaceId)

    if (requesterMembership.role === 'viewer') {
        throw new ApiError(403, 'Viewers cannot create tasks')
    }

    if (assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            throw new ApiError(400, 'Invalid assignedTo user id')
        }

        if (assignedTo.toString() !== req.user._id.toString()) {
            const assigneeMembership = await WorkspaceMember.findOne(
                {
                    userId: assignedTo,
                    workspaceId: workspaceId
                }
            )
            
            if (!assigneeMembership) {
                throw new ApiError(400, 'Assigned user must be a workspace member')
            }
        }
    }

    const allowedPriorities = ['low', 'medium', 'high']
    const taskPriority = priority ?? 'medium'

    if (!allowedPriorities.includes(taskPriority)) {
        throw new ApiError(400, 'Invalid task priority')
    }

    const task = await Task.create(
        {
            workspaceId: workspaceId,
            title: title.trim(),
            description: description ?? "",
            priority: taskPriority,
            status: 'todo',
            assignedTo: assignedTo ?? null,
            createdBy: req.user._id
        }
    )

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                'Task created successfully',
                task
            )
        )
})

const getTasks = asyncHandler( async (req, res) => {
    const { workspaceId, status, assignedTo, priority } = req.query

    if (!workspaceId) {
        throw new ApiError(400, 'workspaceId is required')
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)){
        throw new ApiError(400, 'Invalid workspace id')
    }

    const workspace = await Workspace.findById(workspaceId) 

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    }

    await requireWorkspaceMember(req.user._id, workspaceId)

    const filter = { workspaceId: workspaceId }

    if (status) {
        const allowedStatus = ['todo', 'in-progress', 'done']
        if (!allowedStatus.includes(status)) {
            throw new ApiError(400, 'Invalid task status')
        }
        filter.status = status
    }

    if (priority) {
        const allowedPriorities = ['low', 'medium', 'high']
        if (!allowedPriorities.includes(priority)) {
            throw new ApiError(400, 'Invalid task priority')
        }
        filter.priority = priority
    }

    if (assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            throw new ApiError(400, 'Invalid assignedTo user id')
        }
        filter.assignedTo = assignedTo
    }

    const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1})
    .lean()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Tasks fetched successfully',
                tasks
            )
        )
})

const updateTask = asyncHandler( async (req, res) => {
    const { id: taskId } = req.params
    const { title, description, status, priority, assignedTo } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, 'Invalid task id')
    }

    if (title === undefined && description === undefined && status === undefined && priority === undefined && assignedTo === undefined) {
        throw new ApiError(400, 'At least one field must be provided')
    }

    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, 'Task not found')
    }

    const workspace = await Workspace.findById(task.workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, task.workspaceId)

    if (requesterMembership.role === 'viewer') {
        throw new ApiError(403, 'Viewers cannot update tasks')
    }

    if (title !== undefined) {
        if (!title.trim()) {
            throw new ApiError(400, 'Title cannot be empty')
        }
        task.title = title.trim()
    }

    if (description !== undefined) {
        task.description = description
    }

    if (status !== undefined) {
        const allowedStatus = ['todo', 'in-progress', 'done']
        if (!allowedStatus.includes(status)) {
            throw new ApiError(400, 'Invalid task status')
        }
        task.status = status
    }

    if (priority !== undefined) {
        const allowedPriorities = ['low', 'medium', 'high']
        if (!allowedPriorities.includes(priority)) {
            throw new ApiError(400, 'Invalid task priority')
        }
        task.priority = priority
    }

    if (assignedTo !== undefined) {
        if (assignedTo === null) {
            task.assignedTo = null
        } else {
            if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
                throw new ApiError(400, 'Invalid assignedTo user id')
            }

            const assigneeMembership = await WorkspaceMember.findOne(
                {
                    userId: assignedTo,
                    workspaceId: task.workspaceId
                }
            )

            if (!assigneeMembership) {
                throw new ApiError(400, 'Assigned user must be a workspace member')
            }
            task.assignedTo = assignedTo
        }
    }

    await task.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Task updated successfully',
                task
            )
        )

})

const deleteTask = asyncHandler( async (req, res) => {
    const { id: taskId } =  req.params

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, 'Invalid task id')
    }

    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, 'Task not found')
    }

    const workspace = await Workspace.findById(task.workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, task.workspaceId)

    if (requesterMembership.role === 'viewer') {
        throw new ApiError(403, 'Viewers cannot delete tasks')
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString()

    if (requesterMembership.role === 'member' && !isCreator) {
        throw new ApiError(403, 'Members can only delete tasks they created')
    }

    await task.deleteOne()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Task deleted successfully',
                {
                    taskId: taskId
                }
            )
        )
})

export { createTask, getTasks, updateTask, deleteTask }