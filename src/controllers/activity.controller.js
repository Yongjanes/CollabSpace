import mongoose from 'mongoose'

import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js'

import { requireWorkspaceMember } from '../permissions/workspace.permissions.js'

import { ActivityLog } from '../models/activityLog.model.js'

const getWorkspaceActivity = asyncHandler( async (req, res) => {
    const { id: workspaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new ApiError(400, 'Invalid workspace id')
    }

    await requireWorkspaceMember(req.user._id, workspaceId) 

    const { page, limit, skip } = getPaginationParams(req.query)

    const [ activities, totalItems ] = await Promise.all(
        [
            ActivityLog.find({ workspaceId: workspaceId })
                .populate('actorId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments({ workspaceId: workspaceId })
        ]
    )

    const meta = buildPaginationMeta({ page, limit, totalItems })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Workspace activity fetched successfully',
                {
                    items: activities,
                    meta: meta
                }
            )
        )
})

export { getWorkspaceActivity }