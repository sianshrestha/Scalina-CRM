# Scalina CRM

A CRM and lightweight ERP for a video production agency. It tracks leads and clients through a sales pipeline, organises weekly video projects into script/shoot/edit tasks, schedules team members, and handles invoicing and expenses — all from one dashboard.

The backend is a Spring Boot REST API backed by PostgreSQL; the frontend is a React + TypeScript app (Vite + Tailwind CSS) that can also run as an Electron desktop app.

## Features

- **Dashboard** — headline business metrics at a glance.
- **Leads & Clients** — Kanban pipeline (`NEW → CONTACTED → PROPOSAL_SENT → ACTIVE / INACTIVE`) with assigned marketers and estimated weekly revenue.
- **Project Management** — weekly projects per client (one per client per week), with video counts, deadlines and cancellation.
- **Tasks & Automation** — `SCRIPT`, `SHOOT` and `EDIT` tasks per project. Completing a task rolls its status up to the project and automatically creates a salary expense for the assignee.
- **Resource Calendar** — drag-and-drop scheduling of tasks and work assignments across the team.
- **Invoicing** — create, edit and track invoices (`DRAFT`, `SENT`, `PAID`, `OVERDUE`) and export them to PDF.
- **Expenses** — log expenses, upload and download receipts (up to 5 MB), and track paid status.
- **Marketers Analytics** — revenue and commission breakdown per marketer.
- **Team Management** — manage team members and roles (`ADMIN`, `MEMBER`).

## Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Java 21, Spring Boot 4, Spring Data JPA, Lombok |
| Database | PostgreSQL 15 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, `@react-pdf/renderer` |
| Desktop  | Electron |
| DevOps   | Docker, Docker Compose, Nginx |

## Project structure

```
.
├── src/main/java/com/scalina/crm
│   ├── controller/      # REST endpoints (/api/crm/**)
│   ├── service/         # Business logic and task/expense automation
│   ├── repository/      # Spring Data JPA repositories
│   ├── model/           # JPA entities and enums
│   └── dto/             # Request/response objects
├── src/main/resources/application.properties
├── scalina-crm-ui/      # React + Vite frontend (and Electron entry point)
├── Dockerfile           # Backend image
└── docker-compose.yml   # Postgres + backend + frontend
```

## Getting started

### Option 1: Docker Compose (recommended)

Requires Docker.

```bash
docker compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8080/api/crm |
| Postgres | localhost:5432 (db `scalina_crm`) |

Data is persisted in the `pgdata` Docker volume.

### Option 2: Run locally

Requires Java 21, Node.js 20+ and a running PostgreSQL instance.

1. Create the database:

   ```bash
   createdb scalina_crm
   ```

2. Update the credentials in `src/main/resources/application.properties` if they differ from yours (defaults: `postgres` / `admin`). The schema is created automatically (`ddl-auto=update`).

3. Start the backend (port 8080):

   ```bash
   ./mvnw spring-boot:run
   ```

4. Start the frontend (port 5173):

   ```bash
   cd scalina-crm-ui && npm install && npm run dev
   ```

   Or run it as a desktop app:

   ```bash
   cd scalina-crm-ui && npm run electron:dev
   ```

The frontend talks to the API at `http://localhost:8080/api/crm`, configured in `scalina-crm-ui/src/services/api.ts`.

## API overview

All endpoints live under `/api/crm`.

| Area        | Endpoints |
|-------------|-----------|
| Dashboard   | `GET /dashboard` |
| Pipeline    | `GET /pipeline`, `POST /pipeline` |
| Projects    | `GET /projects`, `POST /projects`, `PUT /projects/{id}`, `PUT /projects/{id}/cancel`, `GET /clients/{clientId}/projects` |
| Tasks       | `GET /tasks`, `GET /projects/{id}/tasks`, `POST /projects/{id}/tasks`, `PUT /tasks/{id}/done`, `PATCH /tasks/{id}/date?newDate=`, `DELETE /tasks/{id}` |
| Invoices    | `GET /invoices`, `GET /clients/{clientId}/invoices`, `POST /clients/{clientId}/invoices`, `PUT /invoices/{id}`, `PATCH /invoices/{id}/status?status=` |
| Team        | `GET /team`, `POST /team`, `PUT /team/{id}`, `DELETE /team/{id}` |
| Assignments | `GET /assignments`, `POST /assignments?teamMemberId=&clientId=` |
| Expenses    | `GET /expenses`, `POST /expenses`, `PUT /expenses/{id}`, `PATCH /expenses/{id}/status`, `DELETE /expenses/{id}`, `POST /expenses/{id}/receipt`, `GET /expenses/{id}/receipt/download` |

## Building

```bash
# Backend JAR (target/)
./mvnw clean package

# Frontend static build (scalina-crm-ui/dist/)
cd scalina-crm-ui && npm run build
```
