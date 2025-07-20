# Backend API Documentation

## Overview
This backend is built with **Node.js**, **Express**, **MongoDB (Mongoose)**, and **Redis**. It provides RESTful APIs for user authentication, project management, and AI-powered features. Real-time communication is enabled via **Socket.io**. The backend also integrates with Google Generative AI for advanced responses.

---

## Table of Contents
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [User Routes](#user-routes)
  - [Project Routes](#project-routes)
  - [AI Routes](#ai-routes)
- [Services](#services)
- [Models](#models)
- [Middleware](#middleware)
- [Socket.io Events](#socketio-events)
- [Dependencies](#dependencies)

---

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your `.env` file with the following variables:
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret for JWT signing
   - `GOOGLE_AI_KEY`: Google Generative AI API key
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Redis connection details
   - `PORT`: (optional) Port to run the server (default: 3000)
3. Start the server:
   ```bash
   node server.js
   ```

---

## Environment Variables
| Variable         | Description                        |
|------------------|------------------------------------|
| MONGO_URI        | MongoDB connection string          |
| JWT_SECRET       | JWT secret key                     |
| GOOGLE_AI_KEY    | Google Generative AI API key       |
| REDIS_HOST       | Redis host                         |
| REDIS_PORT       | Redis port                         |
| REDIS_PASSWORD   | Redis password                     |
| PORT             | Server port (default: 3000)        |

---

## API Endpoints

### User Routes (`/user`)

| Method | Endpoint      | Description                | Auth | Body/Params |
|--------|--------------|----------------------------|------|-------------|
| POST   | /register    | Register a new user        | No   | `{ email, password }` |
| POST   | /login       | Login user                 | No   | `{ email, password }` |
| GET    | /profile     | Get current user profile   | Yes  | -           |
| GET    | /logout      | Logout user (JWT blacklist)| Yes  | -           |
| GET    | /all         | List all users (except self)| Yes | -           |

#### Examples

**Register**
- Request:
  ```json
  POST /user/register
  Content-Type: application/json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- Response:
  ```json
  {
    "user": {
      "_id": "...",
      "email": "user@example.com"
    },
    "token": "<jwt_token>"
  }
  ```

**Login**
- Request:
  ```json
  POST /user/login
  Content-Type: application/json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- Response:
  ```json
  {
    "user": {
      "_id": "...",
      "email": "user@example.com"
    },
    "token": "<jwt_token>"
  }
  ```

**Get Profile**
- Request:
  ```http
  GET /user/profile
  Authorization: Bearer <jwt_token>
  ```
- Response:
  ```json
  {
    "_id": "...",
    "email": "user@example.com"
  }
  ```

**Logout**
- Request:
  ```http
  GET /user/logout
  Authorization: Bearer <jwt_token>
  ```
- Response:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

**Get All Users**
- Request:
  ```http
  GET /user/all
  Authorization: Bearer <jwt_token>
  ```
- Response:
  ```json
  [
    { "_id": "...", "email": "otheruser@example.com" },
    ...
  ]
  ```

---

### Project Routes (`/project`)

| Method | Endpoint              | Description                        | Auth | Body/Params |
|--------|----------------------|------------------------------------|------|-------------|
| POST   | /create              | Create a new project               | Yes  | `{ name }`  |
| GET    | /all                 | List all projects for user         | Yes  | -           |
| PUT    | /add-user            | Add users to a project             | Yes  | `{ projectId, users: [userId] }` |
| GET    | /get-project/:id     | Get project details (with users)   | Yes  | `:id`       |

#### Examples

**Create Project**
- Request:
  ```json
  POST /project/create
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  {
    "name": "My Project"
  }
  ```
- Response:
  ```json
  {
    "_id": "...",
    "name": "my project",
    "users": ["..."]
  }
  ```

**Get All Projects**
- Request:
  ```http
  GET /project/all
  Authorization: Bearer <jwt_token>
  ```
- Response:
  ```json
  [
    { "_id": "...", "name": "my project", "users": ["..."] },
    ...
  ]
  ```

**Add Users to Project**
- Request:
  ```json
  PUT /project/add-user
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  {
    "projectId": "<project_id>",
    "users": ["<user_id1>", "<user_id2>"]
  }
  ```
- Response:
  ```json
  {
    "_id": "...",
    "name": "my project",
    "users": ["...", "<user_id1>", "<user_id2>"]
  }
  ```

**Get Project by ID**
- Request:
  ```http
  GET /project/get-project/<project_id>
  Authorization: Bearer <jwt_token>
  ```
- Response:
  ```json
  {
    "_id": "...",
    "name": "my project",
    "users": [
      { "_id": "...", "email": "user@example.com" },
      ...
    ]
  }
  ```

---

### AI Routes (`/ai`)

| Method | Endpoint      | Description                        | Auth | Query Params |
|--------|--------------|------------------------------------|------|--------------|
| GET    | /get-result  | Get AI-generated result for prompt | No   | `prompt`     |

#### Example

**Get AI Result**
- Request:
  ```http
  GET /ai/get-result?prompt=Write%20a%20hello%20world%20API
  ```
- Response:
  ```json
  {
    "text": "Here is a hello world API...",
    "fileTree": {
      "app.js": { "type": "file", "contents": "..." },
      ...
    }
  }
  ```

---

## Services

### User Service (`services/user.service.js`)
- `createUser({ email, password })`: Registers a new user, hashes password.
- `getAllUsers({ userId })`: Returns all users except the given user.

### Project Service (`services/project.service.js`)
- `createProject({ name, userId })`: Creates a new project.
- `allUserProjects(userId)`: Lists all projects for a user.
- `addUserToProject(projectId, users, loggedInUserId)`: Adds users to a project if the requester is a member.

### AI Service (`services/ai.service.js`)
- `generateResult(prompt)`: Uses Google Generative AI to generate a response for a prompt. Returns text and (optionally) a file tree.

### Redis Service (`services/redis.service.js`)
- Exports a configured Redis client for caching and JWT blacklisting.

---

## Models

### User Model (`models/user.model.js`)
- Fields: `email`, `password`
- Methods:
  - `hashPassword(password)`: Hashes a password using bcrypt.
  - `comparePassword(password)`: Compares a password with the hashed password.
  - `generateAuthToken()`: Generates a JWT for the user.

### Project Model (`models/project.model.js`)
- Fields: `name`, `users` (array of User references)

---

## Middleware

### Auth Middleware (`middlewares/auth.middleware.js`)
- `authUser`: Protects routes by verifying JWT and checking Redis blacklist. Attaches user to `req.user`.

---

## Socket.io Events
- **Connection**: Authenticates user via JWT, joins project room.
- **project-message**: Handles chat messages. If message starts with `@ai `, sends prompt to AI and broadcasts result (including file tree if present).
- **disconnect**: Handles client disconnect.

---

## Dependencies
Key dependencies (see `package.json` for full list):
- express
- mongoose
- bcrypt
- jsonwebtoken
- express-validator
- ioredis
- socket.io
- @google/generative-ai
- dotenv
- cors
- morgan
- cookie-parser

---

## Database
- **MongoDB** is used for persistent storage (users, projects).
- **Redis** is used for JWT blacklisting and caching.

---

## License
ISC 