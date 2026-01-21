# CollabSpace

CollabSpace is a backend system for managing collaborative workspaces with
structured access control, task workflows, threaded discussions, and
real-time system updates.

The project focuses on backend architecture, performance, and scalability,
featuring role-based permissions, activity tracking, Redis-powered caching,
and WebSocket-based real-time notifications.

## Project Overview

CollabSpace is designed to serve as a scalable backend foundation for
team-based collaboration systems.

The backend enables users to:
- Create and manage multiple workspaces
- Control access through role-based permissions
- Organize work using tasks and comments
- Track important system actions through activity logs
- Receive real-time updates without relying on frequent polling

The project emphasizes clean separation of concerns, predictable data flow,
and production-grade backend patterns such as caching, transactions, and
event-driven updates.

## Features

### Workspace Management
- Create, update, and archive workspaces
- Workspace-level access isolation
- Role-based membership management (owner, admin, member, viewer)

### Task & Comment System
- Create and manage tasks within a workspace
- Assign tasks to workspace members
- Track task status and priority
- Threaded comments on tasks with edit and delete support

### Activity Logging
- Centralized activity logging for important system actions
- Tracks workspace, task, comment, and membership events
- Enables activity feeds and audit-style visibility

### Authentication & Authorization
- Secure authentication using access and refresh tokens
- Token rotation and reuse detection
- Protected routes with role-based authorization checks

### Performance & Scalability
- Redis-based read-through caching for high-traffic endpoints
- Cache invalidation on write operations
- Pagination support for large datasets

### Real-Time Updates
- WebSocket-based real-time notifications
- Workspace-scoped event delivery
- Reduces the need for frequent client-side polling

## Tech Stack

### Backend
- **Node.js** – JavaScript runtime
- **Express** – HTTP server and routing

### Database & Caching
- **MongoDB** – Primary data store
- **Mongoose** – Object data modeling (ODM)
- **Redis** – Caching and cache invalidation

### Real-Time Communication
- **Socket.IO** – WebSocket-based real-time events

### Authentication & Security
- **JWT (JSON Web Tokens)** – Access and refresh token authentication
- **HTTP-only cookies** – Secure refresh token storage

### Documentation & Tooling
- **OpenAPI (Swagger)** – API documentation
- **ESLint & Prettier** – Code quality and formatting

### Deployment
- **Render** – Application hosting and managed services

## How to Run Locally

### Prerequisites

Ensure you have the following installed on your system:
- **Docker** and **Docker Compose** – For containerized services
- **Node.js** (v14 or higher) – For running the application locally without Docker
- **Git** – For cloning the repository

### Getting Started with Docker

The easiest way to run CollabSpace locally is using Docker Compose, which automatically sets up MongoDB, Redis, and the Node.js application.

#### 1. Clone the Repository
```bash
git clone git@github.com:Yongjanes/CollabSpace.git
cd CollabSpace
```

#### 2. Start Services with Docker Compose
```bash
docker-compose up
```

This command will:
- Build the application image
- Start MongoDB and Redis containers
- Start the CollabSpace backend server

The application will be available at `http://localhost:8000` (or the port specified in your environment).

#### 3. Verify Services Are Running
Once the containers are up, verify:
- **Application**: Visit `http://localhost:8000`
- **MongoDB**: Running on port `27017`
- **Redis**: Running on port `6379`

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/collabspace

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

```

### Stopping Services

To stop all running containers:
```bash
docker-compose down
```

To stop and remove volumes (clears database data):
```bash
docker-compose down -v
```

### Running Without Docker

If you prefer to run the application directly with Node.js:

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start MongoDB and Redis
Ensure MongoDB and Redis are running locally or accessible via their configured URIs.

#### 3. Run the Application
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Accessing the API

Once the application is running, the API is available at:
- **Base URL**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/api-docs` 

## Architecture Overview

CollabSpace follows a layered backend architecture with clear separation
of responsibilities and predictable data flow.

### High-Level Design
- **Controllers** handle request validation and HTTP responses
- **Models** define data schemas and relationships
- **Permissions & middleware** enforce authentication and authorization
- **Utilities and services** encapsulate reusable logic
- **MongoDB** acts as the source of truth for all persisted data
- **Redis** is used for read-through caching and cache invalidation
- **WebSockets** provide real-time event delivery

### Data Flow Strategy
- Write operations update MongoDB and trigger cache invalidation
- Read operations first check Redis before querying MongoDB
- WebSocket events notify clients of changes without sending full payloads
- Clients fetch updated data via REST APIs when notified

### Transaction Safety
- Critical multi-step operations (such as workspace creation)
  are wrapped in MongoDB transactions to ensure consistency

This architecture allows the system to scale efficiently while remaining
maintainable and easy to reason about.

## Authentication & Authorization

CollabSpace uses a token-based authentication system designed for security
and scalability.

### Authentication Flow
- Users authenticate using email and password
- On successful login:
  - A short-lived **access token** is issued
  - A long-lived **refresh token** is issued and stored in an HTTP-only cookie
- Access tokens are sent via the `Authorization` header for protected routes
- Refresh tokens are used to obtain new access tokens without re-authentication
- Refresh token rotation and reuse detection are implemented for additional security

### Authorization
- All protected routes require a valid access token
- Workspace-level authorization is enforced using role-based access control
- Supported workspace roles:
  - **Owner**
  - **Admin**
  - **Member**
  - **Viewer**
- Authorization checks ensure users can only perform actions permitted by
  their role within a workspace

## Real-Time Communication (WebSockets)

CollabSpace uses WebSockets to deliver real-time updates to connected clients
without relying on frequent polling.

### WebSocket Design
- A persistent WebSocket connection is established between the client and server
- Clients join **workspace-scoped rooms** after connecting
- Events are emitted only to users connected to the relevant workspace

### Event Strategy
- WebSockets are used to **notify** clients that data has changed
- Full data synchronization is handled via existing REST APIs
- This keeps WebSocket payloads lightweight and predictable

### Benefits
- Immediate feedback for activity updates
- Reduced load on REST endpoints
- Improved user experience for collaborative workflows

## Redis Caching Strategy

Redis is used to optimize performance for read-heavy endpoints and reduce
unnecessary database load.

### Caching Approach
- A **read-through caching** strategy is implemented
- Read requests first attempt to fetch data from Redis
- On a cache miss, data is retrieved from MongoDB and cached in Redis
- Cached entries use a time-to-live (TTL) as a safety mechanism

### Cached Endpoints
- Workspace activity feeds
- Task lists
- Comment threads
- Workspace member lists

### Cache Invalidation
- Cache entries are invalidated on write operations
- Invalidation is scoped by workspace or entity to ensure consistency
- Redis serves only as a performance layer; MongoDB remains the source of truth

This approach ensures fast response times while maintaining data correctness.

## API Documentation

CollabSpace provides a fully documented REST API using the OpenAPI specification.

### Documentation Details
- API documentation is written using **OpenAPI (Swagger)**
- Endpoints are organized by domain (workspaces, members, tasks, comments, authentication)
- Request and response schemas are clearly defined
- Authentication requirements are documented for protected routes

### Swagger UI
- Swagger UI is used to visualize and interact with the API
- The interface is customized to focus on business entities and endpoints
- Internal response wrappers and implementation details are intentionally hidden
  to improve readability

The API documentation serves as the primary reference for integrating with
the backend.
