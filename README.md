![image alt](https://github.com/xRiot45/nexus-chat-backend/blob/1973304b9e5d6c79a5abdf6496ac7801fc9dcf40/thumbnail.png)

# Nexus Chat Backend Documentation

A production-oriented **NestJS backend** for real-time chat applications with authentication, contacts, groups, stories, file uploads, and WebSocket-based messaging.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [High-Level Architecture](#high-level-architecture)
- [Modules](#modules)
    - [Authentication](#authentication)
    - [Users](#users)
    - [Contacts](#contacts)
    - [Groups](#groups)
    - [Chat (REST + WebSocket)](#chat-rest--websocket)
    - [Story](#story)
- [API Conventions](#api-conventions)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket API](#websocket-api)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
    - [1) Clone & Install](#1-clone--install)
    - [2) Configure Environment](#2-configure-environment)
    - [3) Run in Development](#3-run-in-development)
    - [4) Build for Production](#4-build-for-production)
- [File Uploads & Static Assets](#file-uploads--static-assets)
- [Email Templates](#email-templates)
- [Security Notes](#security-notes)
- [Rate Limiting](#rate-limiting)
- [Testing & Quality](#testing--quality)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Overview

Nexus Chat Backend is designed as a modular API service for modern messaging apps. It provides:

- Secure authentication with JWT access/refresh token flow.
- Real-time communication via Socket.IO namespace.
- 1-on-1 and group chats.
- Contact management and mutual-contact based story feed.
- Media uploads (avatars, group icons, stories).
- Structured API responses and centralized exception handling.

The application uses **NestJS + TypeORM + MySQL** and is organized by feature modules for scalability and maintainability.

---

## Core Features

- ✅ Register, verify email, login, logout, refresh token, reset password.
- ✅ User profile update with avatar upload.
- ✅ Contact CRUD (alias-based private contact list).
- ✅ Group creation, invitation, role management, leave, kick members.
- ✅ Real-time messaging and delivery events using Socket.IO.
- ✅ Conversation history and recent conversations endpoint.
- ✅ Story upload (image/video), story viewers, seen-tracking, auto-expiration model.
- ✅ Global response formatter + global error filter.
- ✅ Swagger-like documentation support through Scalar API Reference in development mode.

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS v11
- **Database ORM**: TypeORM
- **Database Driver**: MySQL (`mysql2`)
- **Realtime**: Socket.IO (`@nestjs/websockets`)
- **Validation**: class-validator + class-transformer
- **Auth**: JWT + bcrypt
- **Mail**: nodemailer + handlebars templates
- **Scheduling**: `@nestjs/schedule` (story-related cron task)
- **Logging**: Winston (`nest-winston` + daily rotate support)
- **Documentation**: `@nestjs/swagger` + `@scalar/nestjs-api-reference`

---

## Project Structure

```bash
src/
├── common/               # Guards, interceptors, filters, decorators, enums
├── core/
│   ├── configs/          # Shared configs (e.g., JWT config)
│   ├── database/         # Database module (TypeORM bootstrap)
│   ├── logger/           # Winston logger module/service/config
│   ├── mail/             # Mail service + handlebars templates
│   └── services/         # Cross-cutting services (e.g., token service)
├── modules/
│   ├── auth/
│   ├── users/
│   ├── contacts/
│   ├── groups/
│   ├── chat/
│   └── story/
├── shared/               # DTO base classes, interfaces, utility helpers
├── main.module.ts        # Root module (config, throttler, schedule, modules)
└── main.ts               # App bootstrap, security middleware, API setup
```

---

## High-Level Architecture

1. **HTTP Layer**
    - Global prefix: `/api`
    - JWT guard secures protected routes.
    - Response interceptor normalizes successful responses.
    - Exception filter normalizes error payloads.

2. **Realtime Layer**
    - Socket namespace: `/chat`
    - Token-based socket authentication.
    - User joins personal room + all group rooms on connect.
    - Events for message delivery, read status, and user presence.

3. **Data Layer**
    - TypeORM entities and repositories.
    - Feature modules encapsulate each domain aggregate.

---

## Modules

### Authentication

Handles account lifecycle and credentials:

- Register + email verification link flow
- Login/logout
- Token refresh
- Forgot/reset password
- Change password
- Delete account
- Current user profile (`/auth/me`)

### Users

Responsible for user discovery and profile updates:

- Search users by username/full name
- Update profile fields + avatar upload

### Contacts

Private address-book style contact management:

- Create contact
- List all contacts
- Get contact by ID
- Update contact alias
- Delete contact

### Groups

Group conversation management:

- Create group with optional icon
- Invite members
- Update group metadata
- Kick member
- Change member role
- Leave group
- Delete group
- Get group profile and members
- Get current user groups

### Chat (REST + WebSocket)

Chat supports both fetch-based and event-based use cases:

- REST: message history & recent conversation summaries
- WebSocket: send message, join group rooms, mark as read, user status broadcast

### Story

24-hour style story feature:

- Create story with image/video + caption
- List own active stories
- Fetch mutual contact stories feed
- Mark story as seen
- Get story viewers
- Delete story

---

## API Conventions

### Base URL

- Local: `http://localhost:<PORT>/api`

### Standard success response format

Most endpoints are normalized by a response interceptor:

```json
{
    "success": true,
    "statusCode": 200,
    "timestamp": "2026-01-01T00:00:00.000Z",
    "message": "Operation successful",
    "data": {}
}
```

### Error response format

```json
{
    "success": false,
    "statusCode": 400,
    "error": "BadRequestException",
    "message": "Validation failed",
    "path": "/api/users/profile",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "errors": []
}
```

### Authentication header

```http
Authorization: Bearer <access_token>
```

---

## REST API Endpoints

> All routes below are prefixed with `/api`.

### Auth (`/auth`)

| Method | Path                           | Auth | Description                                   |
| ------ | ------------------------------ | ---- | --------------------------------------------- |
| POST   | `/auth/register`               | No   | Register new user and send verification email |
| GET    | `/auth/verify-email?token=...` | No   | Verify email then redirect to frontend        |
| POST   | `/auth/login`                  | No   | Login user                                    |
| POST   | `/auth/logout`                 | Yes  | Logout user (invalidate refresh token hash)   |
| GET    | `/auth/me`                     | Yes  | Get current user profile                      |
| POST   | `/auth/refresh`                | No   | Refresh access/refresh tokens                 |
| POST   | `/auth/forgot-password`        | No   | Send password reset email                     |
| POST   | `/auth/reset-password`         | No   | Reset password with reset token               |
| POST   | `/auth/resend-verification`    | No   | Resend email verification                     |
| POST   | `/auth/change-password`        | Yes  | Change current user password                  |
| DELETE | `/auth/delete-account`         | Yes  | Permanently delete user account               |

### Users (`/users`)

| Method | Path                        | Auth | Description                                            |
| ------ | --------------------------- | ---- | ------------------------------------------------------ |
| GET    | `/users/search?q=<keyword>` | Yes  | Search users by username/full name                     |
| PATCH  | `/users/profile`            | Yes  | Update profile + optional avatar (multipart/form-data) |

### Contacts (`/contacts`)

| Method | Path            | Auth | Description        |
| ------ | --------------- | ---- | ------------------ |
| POST   | `/contacts`     | Yes  | Create new contact |
| GET    | `/contacts`     | Yes  | List all contacts  |
| GET    | `/contacts/:id` | Yes  | Get contact by ID  |
| PUT    | `/contacts/:id` | Yes  | Update contact     |
| DELETE | `/contacts/:id` | Yes  | Delete contact     |

### Groups (`/groups`)

| Method | Path                                      | Auth | Description                             |
| ------ | ----------------------------------------- | ---- | --------------------------------------- |
| POST   | `/groups`                                 | Yes  | Create group (multipart/form-data icon) |
| POST   | `/groups/invite`                          | Yes  | Invite members to group                 |
| PATCH  | `/groups/:groupId`                        | Yes  | Update group (multipart/form-data icon) |
| DELETE | `/groups/:groupId/members/:memberId`      | Yes  | Kick member                             |
| DELETE | `/groups/:groupId`                        | Yes  | Delete group                            |
| POST   | `/groups/:groupId/leave`                  | Yes  | Current user leaves group               |
| PUT    | `/groups/:groupId/members/:memberId/role` | Yes  | Change member role                      |
| GET    | `/groups/my-groups`                       | Yes  | Get user group list                     |
| GET    | `/groups/:groupId/members`                | Yes  | Get group members                       |
| GET    | `/groups/:groupId/profile`                | Yes  | Get group details                       |

### Chat (`/chat`)

| Method | Path                                                  | Auth | Description                                |
| ------ | ----------------------------------------------------- | ---- | ------------------------------------------ |
| GET    | `/chat/messages?recipientId=&groupId=&limit=&offset=` | Yes  | Retrieve message history (1-on-1 or group) |
| GET    | `/chat/recent-messages`                               | Yes  | Get conversations with last message        |

### Story (`/story`)

| Method | Path                      | Auth | Description                                    |
| ------ | ------------------------- | ---- | ---------------------------------------------- |
| POST   | `/story`                  | Yes  | Create story (multipart/form-data image/video) |
| GET    | `/story`                  | Yes  | Get own active stories                         |
| GET    | `/story/feed`             | Yes  | Get mutual contacts story feed                 |
| DELETE | `/story/:id`              | Yes  | Delete own story                               |
| POST   | `/story/:storyId/seen`    | Yes  | Mark story as seen                             |
| GET    | `/story/:storyId/viewers` | Yes  | Get story viewers                              |

---

## WebSocket API

### Connection

- Namespace: `/chat`
- CORS currently set for: `http://localhost:3001`

You can provide token via:

1. `Authorization` header: `Bearer <access_token>`
2. `handshake.auth.token`
3. query string fallback `?token=<access_token>`

### Server -> Client events

- `message` — New message payload
- `userStatusChanged` — User online/offline updates
- `messageRead` — Conversation read update
- `exception` — Error event for socket failures
- `groupMessage` — Group message payload event type (defined in interface)

### Client -> Server events

- `sendMessage`
- `joinGroup`
- `getMessages` (implemented in gateway handlers)
- `markConversationAsRead` (implemented in gateway handlers)

> Note: The TypeScript socket interface and gateway handler event names are not fully aligned for a few events. Keep frontend and backend contracts synchronized before production rollout.

---

## Environment Variables

Create `.env` in project root. Example:

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Database (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nexus_chat
DB_USERNAME=root
DB_PASSWORD=secret
DB_SYNCHRONIZE=true

# JWT
JWT_ACCESS_TOKEN_SECRET=your_access_secret
JWT_REFRESH_TOKEN_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

JWT_VERIFY_EMAIL_SECRET=verify_email_secret
JWT_VERIFY_EMAIL_EXPIRES_IN=3600

JWT_FORGOT_PASSWORD_SECRET=forgot_password_secret
JWT_FORGOT_PASSWORD_EXPIRES_IN=3600

# Mail
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASS=
MAIL_FROM="Nexus Chat <noreply@nexus-chat.local>"
```

### Variable Notes

- `DB_SYNCHRONIZE=true` is convenient for local dev but risky for production.
- Expiration values are expected as seconds in current service implementation.
- Verification/reset links rely on `APP_URL` / `FRONTEND_URL`.

---

## Getting Started

### 1) Clone & Install

```bash
git clone <your-repo-url>
cd nexus-chat-backend
npm install
```

### 2) Configure Environment

```bash
cp .env.example .env  # if you create one
# or manually create .env based on the table above
```

### 3) Run in Development

```bash
npm run start:dev
```

Service runs at:

- API: `http://localhost:3000/api`
- Static files: `http://localhost:3000/api/public/...`
- API Reference (development only): `http://localhost:3000/api-reference`

### 4) Build for Production

```bash
npm run build
npm run start:prod
```

---

## File Uploads & Static Assets

Upload destinations are created automatically under:

- `public/uploads/avatars`
- `public/uploads/icons`
- `public/uploads/stories`

Allowed formats (enforced by upload filter):

- Images: `jpg`, `jpeg`, `png`, `webp`
- Videos: `mp4`, `mkv`, `mov`

Max size limits in current controllers:

- Avatar: 2MB
- Group icon: 2MB
- Story media: 20MB

---

## Email Templates

Handlebars templates are located in:

- `src/core/mail/templates/verify-email.hbs`
- `src/core/mail/templates/forgot-password.hbs`
- shared layout + partials in `templates/layouts` and `templates/partials`

These templates are used by the mail service for account verification and password reset flows.

---

## Security Notes

- Helmet is enabled with custom CSP directives.
- JWT guard secures protected REST endpoints.
- Passwords are hashed with bcrypt.
- Global validation pipe enforces whitelist + transformation.
- Global exception filter hides stack traces in production mode.

---

## Rate Limiting

Global throttler is configured with multiple TTL windows in root module. Some route-level throttle decorators are currently commented out and can be enabled as needed.

---

## Testing & Quality

Available scripts:

```bash
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

> Ensure your database and environment variables are properly configured before running integration/e2e tests.

---

## Docker

The repository includes:

- `Dockerfile` for multi-stage production build
- `docker-compose.yml` with `api` + database service

Run:

```bash
docker compose up --build
```

> Important: current compose file defines PostgreSQL while app database module is configured for MySQL. Align the compose database service with application DB config before relying on containerized runs.

---

## Troubleshooting

### 1) `Invalid or expired token`

- Check access token validity.
- Ensure `JWT_ACCESS_TOKEN_SECRET` is consistent across issuing and verification.

### 2) Upload rejected (`format not supported`)

- Confirm file extension and MIME type match allowed list.

### 3) Verification/reset email not received

- Check SMTP configuration (`MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM`, credentials).
- Ensure app can connect to your SMTP server.

### 4) WebSocket unauthorized disconnect

- Pass token in `Authorization` header or `handshake.auth.token`.
- Confirm token is an **access token** (not refresh token).

### 5) API docs page unavailable

- Scalar docs are exposed only when `NODE_ENV=development`.

---

## License

Currently marked as `UNLICENSED` in `package.json`.
