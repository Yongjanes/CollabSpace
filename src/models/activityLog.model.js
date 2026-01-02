import mongoose from 'mongoose'

const activityLogSchema =  new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                'WORKSPACE_CREATED',
                'WORKSPACE_UPDATED',
                'MEMBER_ADDED',
                'MEMBER_REMOVED',
                'MEMBER_ROLE_UPDATED',
                'TASK_CREATED',
                'TASK_UPDATED',
                'TASK_DELETED',
                'COMMENT_CREATED',
                'COMMENT_UPDATED',
                'COMMENT_DELETED'
            ],
            required: true,
            index: true
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true
        },
        entity: {
            type: {
                type: String,
                required: true
            },
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            }
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
)

activityLogSchema.index({ workspaceId: 1, createdAt: -1 })

activityLogSchema.index({ actorId: 1, createdAt: -1 })

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)