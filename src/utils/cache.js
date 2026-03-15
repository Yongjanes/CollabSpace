import { redisClient } from '../config/redis.js'

/**
 * Deletes all Redis keys matching the given glob pattern using SCAN (non-blocking).
 * Safe for production — unlike KEYS which blocks the Redis event loop for the full scan.
 *
 * @param {string} pattern - Glob pattern e.g. `tasks:workspace=abc123:*`
 */
const scanAndDelete = async (pattern) => {
    let cursor = '0'

    do {
        const { cursor: nextCursor, keys } = await redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 100
        })

        cursor = nextCursor.toString()

        if (keys && keys.length > 0) {
            await redisClient.del(keys)
        }
    } while (cursor !== '0')
}

export { scanAndDelete }
