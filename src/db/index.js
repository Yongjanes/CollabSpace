import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async() => {
    try {
        let uri = process.env.MONGODB_URI
        if (!uri.includes(DB_NAME) && !uri.includes('?')) {
            uri = `${uri}/${DB_NAME}`
        }
        const connectionInstance = await mongoose.connect(uri)
        console.log("MongoDB connected Successfully!!, DB host : ", connectionInstance.connection.host)
    } catch (error) {
        console.log("MongoDB connection Failed!! : ", error)
        process.exit(1)
    }
}

export { connectDB } 