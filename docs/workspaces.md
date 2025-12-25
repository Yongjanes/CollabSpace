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


