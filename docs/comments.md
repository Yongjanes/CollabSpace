## Create Comment

POST /tasks/:id/comments  
Auth: Required

Params:
- id: taskId

Request Body:
- content (string, required)

Authorization:
- User must be a workspace member
- Workspace must be active

Behavior:
- Creates a comment on a task
- Comments belong to the task and workspace

Errors:
- 400 invalid input
- 403 not a workspace member
- 404 task or workspace not found

-------------------------------------------------------------------

## Get Task Comments

GET /tasks/:id/comments  
Auth: Required

Params:
- id: taskId

Authorization:
- User must be a workspace member
- Workspace must be active

Behavior:
- Returns all comments for a task
- Sorted oldest → newest
- Includes author name and email

Errors:
- 400 invalid task id
- 403 not a workspace member
- 404 task or workspace not found

-------------------------------------------------------------------

## Delete Comment

DELETE /tasks/:id/comments/:commentId  
Auth: Required

Params:
- id: taskId
- commentId: commentId

Authorization:
- Comment author can delete their comment
- Workspace owner/admin can delete any comment
- Viewers cannot delete comments

Behavior:
- Permanently deletes the comment

Errors:
- 400 invalid ids
- 403 insufficient permissions
- 404 task, workspace, or comment not found

-------------------------------------------------------------------

## Update Comment

PATCH /tasks/:id/comments/:commentId  
Auth: Required

Params:
- id: taskId
- commentId: commentId

Request Body:
- content (string, required)

Authorization:
- Only comment author can edit
- User must be a workspace member
- Workspace must be active

Errors:
- 400 invalid input
- 403 forbidden
- 404 task, workspace, or comment not found

-------------------------------------------------------------------

