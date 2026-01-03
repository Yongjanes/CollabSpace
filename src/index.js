import { connectDB } from "./db/index.js"
import { app } from "./app.js"
import { connectRedis } from './config/redis.js'

// connectDB()
// connectRedis()

// .then(() => {
//     app.on("error", (error) => {
//         console.log("Error : ", error)
//         throw error
//     })
//     app.listen(process.env.PORT || 8000, () => {
//         console.log(`Server is running on port ${process.env.PORT || 8000}`)
//     })
// })
// .catch((error) => {
//     console.log("Error on App : ", error)
//     throw error
// })

const startServer = async () => {
    try {
        await connectDB()
        await connectRedis()

        app.on('error', (error) => {
            console.error('App error : ', error)
            process.exit(1)
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error('Failed to start server : ', error)
        process.exit(1)
    }
}

startServer()