import ms from 'ms'
import { ApiError } from './ApiError.js'

const toMilliseconds = (duration) => {
    const value = ms(duration)

    if (!value) {
        throw new ApiError(
            500,
            `Invalid duration format: ${duration}`
        )
    }

    return value
}

export { toMilliseconds }