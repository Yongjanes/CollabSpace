import { ActivityLog } from '../models/activityLog.model.js'
import { redisClient } from '../config/redis.js'

const logActivity = async ({ type, actorId, workspaceId, entity, metadata = {}}) => {
    if (!type || !actorId || !workspaceId || !entity?.type || !entity?.id) {
        throw new Error('Invalid activity log payload')
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

    const keys = await redisClient.keys(`activity:${workspaceId}:*`)
    if (keys.length > 0) {
        await redisClient.del(keys)
    }
}

export { logActivity }