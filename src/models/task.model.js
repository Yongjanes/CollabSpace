import mongoose from "mongoose"

const taskSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        status: {
            type: String,
            enum: ["todo", "in-progress", "done"],
            default: "todo"
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
)


taskSchema.index(
    {
        workspaceId: 1
    }
)

taskSchema.index(
    {
        workspaceId: 1,
        status: 1
    }
)

taskSchema.index(
    {
        workspaceId: 1,
        assignedTo: 1
    }
)


export const Task = mongoose.model("Task", taskSchema)