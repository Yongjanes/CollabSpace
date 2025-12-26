## Create Workspace

POST /workspaces  
Auth: Required

Request:
- name: string (required)
- description: string (optional)

Behavior:
- Creates a workspace
- Creator becomes owner

-------------------------------------------------------------------

## Get My Workspaces

GET /workspaces  
Auth: Required

Response:
- Array of workspaces the user is a member of

Each item includes:
- workspace: basic workspace info
- role: user's role in that workspace

Notes:
- Only workspaces the user belongs to are returned

-------------------------------------------------------------------

## Get Workspace by ID

GET /workspaces/:id  
Auth: Required

Params:
- id: workspaceId

Behavior:
- User must be a member of the workspace
- Returns workspace details and user's role

Errors:
- 401 unauthenticated
- 403 not a workspace member
- 404 workspace not found

-------------------------------------------------------------------

## Add Workspace Member

POST /workspaces/:id/members  
Auth: Required

Params:
- id: workspaceId

Request Body:
- userId (string, required)
- role (string, optional, defaults to "member")

Authorization:
- Requester must be workspace owner or admin

Behavior:
- Adds an existing user to the workspace
- Prevents duplicate memberships

Errors:
- 400 invalid ids or role
- 403 insufficient permissions
- 404 workspace or user not found
- 409 user already a member

-------------------------------------------------------------------

## Get Workspace Members

GET /workspaces/:id/members  
Auth: Required

Params:
- id: workspaceId

Authorization:
- Any workspace member can access

Response:
- List of workspace members with:
  - user (basic info)
  - role
  - joinedAt

Errors:
- 400 invalid workspace id
- 403 not a workspace member
- 404 workspace not found

-------------------------------------------------------------------

## Update Workspace Member Role

PATCH /workspaces/:id/members/:userId  
Auth: Required

Params:
- id: workspaceId
- userId: target member userId

Request Body:
- role (owner | admin | member | viewer)

Authorization:
- Requester must be owner or admin
- Admins cannot assign owner role

Rules:
- Workspace must always have at least one owner

Errors:
- 400 invalid ids or invalid role
- 400 last owner demotion attempt
- 403 insufficient permissions
- 404 user not a workspace member

-------------------------------------------------------------------

## Remove Workspace Member

DELETE /workspaces/:id/members/:userId  
Auth: Required

Params:
- id: workspaceId
- userId: target member userId

Authorization:
- Owner or admin required
- Admins cannot remove owners
- Users may remove themselves unless last owner

Rules:
- Workspace must always have at least one owner

Errors:
- 400 invalid ids
- 400 last owner removal attempt
- 403 insufficient permissions
- 404 user not a workspace member

-------------------------------------------------------------------

## Update Workspace

PATCH /workspaces/:id  
Auth: Required

Params:
- id: workspaceId

Request Body (any):
- name (string)
- description (string)
- isActive (boolean, owner-only)

Authorization:
- Owner & admin may update name/description
- Only owner may archive workspace

Errors:
- 400 invalid id or empty update
- 403 insufficient permissions
- 404 workspace not found

-------------------------------------------------------------------

## Delete (Archive) Workspace

DELETE /workspaces/:id  
Auth: Required

Params:
- id: workspaceId

Authorization:
- Only workspace owner can delete

Behavior:
- Soft deletes the workspace (isActive = false)
- Existing data remains intact

Errors:
- 400 invalid id or already archived
- 403 insufficient permissions
- 404 workspace not found

-------------------------------------------------------------------

