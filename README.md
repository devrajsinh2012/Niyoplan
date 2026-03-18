# Niyoplan

Niyoplan is a full-stack project management platform inspired by Jira and ClickUp.
It includes Kanban, Sprint, Gantt, DSM, Meeting Reviews, Goals/OKRs, Docs, Views, Notifications, and AI productivity tools.

Maintainer:
- GitHub: https://github.com/devrajsinh2012
- Email: djgohil2012@gmail.com

## Core Stack

- Frontend: React 19, Vite, React Router, Tailwind, dnd-kit
- Backend: Node.js, Express
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- AI: Groq API via backend proxy routes

## Project Structure

- client: React frontend
- server: Express backend APIs
- database: PostgreSQL schema SQL

## Environment Setup

Create these files before running:

- [server/.env](server/.env)
- [client/.env](client/.env)

Important variables:

- Server
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - GROQ_API_KEY
  - GROQ_MODEL
  - GROQ_API_BASE_URL
	- CORS_ALLOWED_ORIGINS (comma-separated, for example http://localhost:5173,http://127.0.0.1:5173)

- Client
  - VITE_API_BASE_URL
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_PUBLISHABLE_KEY
  - VITE_SUPABASE_ANON_KEY

## Database Provisioning

Use one of these methods.

Method A: Supabase SQL Editor
1. Open Supabase SQL Editor for your project.
2. Paste full contents of [database/schema.sql](database/schema.sql).
3. Run script.

Method B: psql (direct)
1. Ensure psql is installed.
2. Run:

```powershell
$env:PGPASSWORD = "<db_password>"
psql "host=<pooler_host> port=5432 dbname=postgres user=<db_user> sslmode=require" -v ON_ERROR_STOP=1 -f "database/schema.sql"
```

Verification query:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## Local Development

Node.js requirement:

- Use Node.js 20.19+ (or newer).
- The client and server scripts run a preflight check and fail fast if Node is older.

Backend:

```powershell
cd server
npm install
npm run dev
```

Frontend:

```powershell
cd client
npm install
npm run dev
```

Default URLs:

- API: http://localhost:4000
- App: http://localhost:5173

## Docker Development (Recommended when local Node is mismatched)

This repository includes a Docker Compose setup that runs both frontend and backend with Node 22 inside containers.

Prerequisites:

- Docker Desktop

Steps:

1. Ensure these files exist and are configured:
	- server/.env
	- client/.env
2. From repository root, run:

```powershell
docker compose up --build
```

Access:

- App: http://localhost:5173
- API: http://localhost:4000

Useful commands:

```powershell
docker compose down
docker compose logs -f
docker compose up --build -d
```

Notes:

- Containers isolate Node runtime from your host, avoiding local Node version conflicts.
- Source code is bind-mounted, so edits in VS Code reflect immediately in running containers.

## Vercel Deployment (Recommended: Two Projects)

Deploy frontend and backend as separate Vercel projects.

### Backend deployment

1. In Vercel, import repository and set Root Directory to server.
2. Keep generated settings from [server/vercel.json](server/vercel.json).
3. Add environment variables in Vercel Project Settings:
	- PORT=4000
	- SUPABASE_URL
	- SUPABASE_SERVICE_KEY
	- GROQ_API_KEY
	- GROQ_MODEL
	- GROQ_API_BASE_URL
	- CORS_ALLOWED_ORIGINS=<frontend_vercel_url>,http://localhost:5173
4. Deploy and note backend URL, for example:
	- https://niyoplan-api.vercel.app

### Frontend deployment

1. In Vercel, import repository and set Root Directory to client.
2. Keep generated settings from [client/vercel.json](client/vercel.json).
3. Add environment variables:
	- VITE_API_BASE_URL=<backend_vercel_url>
	- VITE_SUPABASE_URL
	- VITE_SUPABASE_PUBLISHABLE_KEY
	- VITE_SUPABASE_ANON_KEY
4. Deploy frontend.

## Security Notes

- Do not commit real secrets into git.
- Keep only placeholders in .env.example files.
- Rotate any password/API key if it was ever exposed.

## Current Feature Coverage

- Core modules (ticketing, kanban, sprints, gantt, DSM, meetings, docs, goals, AI) are implemented.
- Includes keyboard shortcuts, responsive polish, and stricter RBAC.


