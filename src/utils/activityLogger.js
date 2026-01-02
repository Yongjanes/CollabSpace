import { ActivityLog } from '../models/activityLog.model.js'

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
}

export { logActivity }