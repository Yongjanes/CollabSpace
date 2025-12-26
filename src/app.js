import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8000",
    credentials: true
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())



// import routers

import { workspaceRouter } from './routes/workspace.routes.js'
import { taskRouter } from './routes/task.routes.js'


// use routers

app.use('/api/v1/workspaces', workspaceRouter)
app.use('/api/v1/tasks', taskRouter)



export { app }
