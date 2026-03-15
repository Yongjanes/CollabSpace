import { ActivityLog } from '../models/activityLog.model.js'
import { ApiError } from './ApiError.js'
import { scanAndDelete } from './cache.js'

const logActivity = async ({ type, actorId, workspaceId, entity, metadata = {}}) => {
    if (!type || !actorId || !workspaceId || !entity?.type || !entity?.id) {
        throw new ApiError(500, 'Invalid activity log payload')
    }

    await ActivityLog.create(
        {
            type: type,
            actorId: actorId,
            workspaceId: workspaceId,
            entity: entity,
            metadata
        }
    )

    await scanAndDelete(`activity:${workspaceId}:*`)
}

export { logActivity }