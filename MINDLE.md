📦 Core Collections (Overview)
User
Workspace
WorkspaceMember
Task
Comment


Each one has a single responsibility.







1️⃣ User Collection

Represents a global identity.

A user:

Can exist without a workspace

Can belong to many workspaces

Has NO roles here (important!)

User Schema (Conceptual)
User
│
├── _id
├── name
├── email
├── passwordHash
├── isActive
├── createdAt
└── updatedAt






2️⃣ Workspace Collection

Represents a team / server / organization.

Workspace Schema
Workspace
│
├── _id
├── name
├── description
├── createdBy (User ID)
├── createdAt
└── updatedAt


A workspace:

Owns tasks

Owns members

Is the security boundary






3️⃣ WorkspaceMember (MOST IMPORTANT)

This is the core authorization table.

It connects:

User ↔ Workspace

With a role

WorkspaceMember Schema
WorkspaceMember
│
├── _id
├── workspaceId
├── userId
├── role        (owner | admin | member | viewer)
├── joinedAt
└── updatedAt











🔐 Permission Check (Mental Model)
Request →
  Find WorkspaceMember →
    Check role →
      Allow / Deny


This is how Discord, Slack, Jira work.












4️⃣ Task Collection

Represents work items.

Tasks always belong to:

One workspace

Optionally one user

Task Schema
Task
│
├── _id
├── workspaceId
├── title
├── description
├── status      (todo | in_progress | done)
├── priority    (low | medium | high)
├── assignedTo  (User ID | null)
├── createdBy  (User ID)
├── createdAt
└── updatedAt

Key rule:

❗ Tasks NEVER exist without a workspace











5️⃣ Comment Collection

Enables real-time collaboration.

Comment Schema
Comment
│
├── _id
├── taskId
├── workspaceId
├── authorId
├── content
├── createdAt
└── updatedAt









🔄 Full Relationship Diagram (ASCII)

User ──┐
       ├── WorkspaceMember ─── Workspace
User ──┘           │
                   │
                   ├── Task ─── Comment
                   │
                   └── (Role & Access Control)
