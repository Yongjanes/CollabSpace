import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

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
import { userRouter } from './routes/user.routes.js'

// use routers

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/workspaces', workspaceRouter)
app.use('/api/v1/tasks', taskRouter)
app.use('/api/v1/users', userRouter)

import { ApiError } from './utils/ApiError.js'

app.use((err, req, res, next) => {
    let error = err
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500
        const message = error.message || "Internal Server Error"
        error = new ApiError(statusCode, message, error?.errors || [], error.stack)
    }

    const response = {
        statusCode: error.statusCode,
        message: error.message,
        success: error.success,
        errors: error.errors,
        data: error.data,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
    }

    return res.status(error.statusCode).json(response)
})

export { app }
