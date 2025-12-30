import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        isActive: {
            type: Boolean,
            default: true
        },
        refreshTokens: [
            {
                tokenHash: {
                    type: String,
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                },
                expiresAt: {
                    type: Date,
                    required: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
)

export const User = mongoose.model("User", userSchema)