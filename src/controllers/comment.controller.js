import mongoose from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'

import { Task } from '../models/task.model.js'
import { Workspace } from '../models/workspace.model.js'
import { Comment } from '../models/comment.model.js'

import { requireWorkspaceMember, requireWorkspaceRole } from '../permissions/workspace.permissions.js'

const createComment = asyncHandler( async (req, res) => {
    const { id: taskId } = req.params
    const { content } = req.body

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, 'Invalid task id')
    }

    if (!content?.trim()) {
        throw new ApiError(400, 'Comment content cannot be empty')
    }

    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, 'Task not found')
    }

    const workspace = await Workspace.findById(task.workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    }

    await requireWorkspaceMember(req.user._id, task.workspaceId)

    const comment = await Comment.create(
        {
            taskId: taskId,
            workspaceId: task.workspaceId,
            authorId: req.user._id,
            content: content.trim()
        }
    )

    await comment.populate('authorId', 'name email')

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                'Comment created successfully',
                comment
            )
        )
})

const getTaskComments = asyncHandler( async (req, res) => {
    const { id: taskId } = req.params

    if ( !mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, "Invalid task id")
    }

    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, 'Task not found')
    }

    const workspace = await Workspace.findById(task.workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or inactive')
    } 

    await requireWorkspaceMember(req.user._id, task.workspaceId)

    const comments = await Comment.find(
        {
            taskId: taskId
        }
    )
        .populate('authorId', 'name email')
        .sort({ createdAt: 1 })
        .lean()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Comments fetched successfully',
                comments
            )
        )
})

const deleteComment = asyncHandler( async (req, res) => {
    const { id: taskId, commentId: commentId} = req.params

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, 'Invalid task id')
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, 'Invalid comment id')
    }

    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, 'Task not found')
    }

    const workspace = await Workspace.findById(task.workspaceId)

    if (!workspace || !workspace.isActive) {
        throw new ApiError(404, 'Workspace not found or Inactive')
    }

    const requesterMembership = await requireWorkspaceMember(req.user._id, task.workspaceId)

    if (requesterMembership.role === 'viewer') {
        throw new ApiError(403, 'Viewers cannot delete comments')
    }

    const comment = await Comment.findOne(
        {
            _id: commentId,
            taskId: taskId
        }
    )

    if (!comment) {
        throw new ApiError(404, 'Comment not found')
    }

    const isAuthor = comment.authorId.toString() === req.user._id.toString()

    if (!isAuthor) {
        requireWorkspaceRole(requesterMembership, ['owner', 'admin'])
    }

    await comment.deleteOne()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Comment deleted successfully',
                {
                    commentId
                }
            )
        )
})

const updateComment = asyncHandler( async (req, res) => {
    const { id: taskId, commentId: commentId } = req.params
    const { content } = req.body

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, 'Invalid task id')
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, 'Invalid comment id')
    }

    if (!content?.trim()) {
        throw new ApiError(400, 'Comment content cannot be empty')
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
        throw new ApiError(403, 'Viewers cannot edit comments')
    }

    const comment = await Comment.findOne(
        {
            _id: commentId,
            taskId: taskId
        }
    )

    if (!comment) {
        throw new ApiError(404, 'Comment not found')
    }

    const isAuthor = comment.authorId.toString() === req.user._id.toString()

    if (!isAuthor) {
        throw new ApiError(403, 'You can only edit your own comments')
    }

    comment.content = content.trim()

    await comment.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Comment updated successfully',
                comment
            )
        )
})

export { createComment, getTaskComments, deleteComment, updateComment }