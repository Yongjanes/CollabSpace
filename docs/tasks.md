## Create Task

POST /tasks  
Auth: Required

Request Body:
- workspaceId (string, required)
- title (string, required)
- description (string, optional)
- priority (low | medium | high)
- assignedTo (userId, optional)

Authorization:
- User must be a workspace member
- Viewers cannot create tasks
- Assigned user must be a workspace member

Defaults:
- status = todo
- priority = medium

Errors:
- 400 invalid input
- 403 insufficient permissions
- 404 workspace not found or inactive

-------------------------------------------------------------------

## Get Tasks

GET /tasks?workspaceId=  
Auth: Required

Query Params:
- workspaceId (required)
- status (todo | in-progress | done)
- priority (low | medium | high)
- assignedTo (userId)

Authorization:
- User must be a workspace member
- Viewers have read-only access

Behavior:
- Returns tasks belonging to the workspace
- Supports filtering by status, priority, assignee

Errors:
- 400 invalid input
- 403 not a workspace member
- 404 workspace not found or inactive

-------------------------------------------------------------------

## Update Task

PATCH /tasks/:id  
Auth: Required

Params:
- id: taskId

Request Body (any):
- title
- description
- status (todo | in-progress | done)
- priority (low | medium | high)
- assignedTo (userId or null)

Authorization:
- User must be a workspace member
- Viewers cannot update tasks

Errors:
- 400 invalid input
- 403 insufficient permissions
- 404 task or workspace not found

-------------------------------------------------------------------

## Delete Task

DELETE /tasks/:id  
Auth: Required

Params:
- id: taskId

Authorization:
- Owner/Admin can delete any task
- Member can delete only tasks they created
- Viewers cannot delete tasks

Behavior:
- Permanently deletes the task

Errors:
- 400 invalid task id
- 403 insufficient permissions
- 404 task or workspace not found

-------------------------------------------------------------------

