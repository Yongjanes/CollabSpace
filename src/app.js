import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8000",
    credentials: true
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

// swagger docs route

const swaggerDocument = YAML.load('./src/docs/openapi.yaml')

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: `
    #model-ApiResponse, #model-ApiResponseWorkspace, #model-ApiResponseWorkspaceArray, #model-ApiResponseWorkspaceWithRole, #model-ApiResponseWorkspaceMember, #model-ApiResponseWorkspaceMemberArray, #model-ApiResponseTask, #model-ApiResponseTaskArray, #model-ApiResponseComment, #model-ApiResponseCommentArray {
        display: none;
    }
    `,
    customSiteTitle: "CollabSpace API Docs"
}))

// import routers

import { workspaceRouter } from './routes/workspace.routes.js'
import { taskRouter } from './routes/task.routes.js'
import { authRouter } from './auth/auth.routes.js'

// use routers

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/workspaces', workspaceRouter)
app.use('/api/v1/tasks', taskRouter)

export { app }
