import { createClient } from 'redis'

const redisClient = createClient({
    url: process.env.REDIS_URL
})

redisClient.on('connect', () => {
    console.log('Redis connected')
})

redisClient.on('error', (error) => {
    console.error('Redis error : ', error)
})

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect()
    }
}

export { redisClient, connectRedis }
