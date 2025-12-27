import { Router } from 'express'

import { createComment, getTaskComments, deleteComment, updateComment } from '../controllers/comment.controller.js'

const commentRouter = Router({ mergeParams: true })

commentRouter.route('/').post(createComment)
commentRouter.route('/').get(getTaskComments)
commentRouter.route('/:commentId').delete(deleteComment)
commentRouter.route('/:commentId').patch(updateComment)


export { commentRouter }