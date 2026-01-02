
const getPaginationParams = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(parseInt(query.limit, 10) || 20, 100)

    const skip = (page - 1) * limit

    return { page, limit, skip }
}

const buildPaginationMeta = ( { page, limit, totalItems } ) => {
    const totalPages = Math.ceil(totalItems / limit)

    return {
        page, 
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    }
}

export { getPaginationParams, buildPaginationMeta }