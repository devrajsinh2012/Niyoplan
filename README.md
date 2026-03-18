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
- task.md: feature phase checklist

## Environment Setup

Create these files before running:

- [server/.env](server/.env)
- [client/.env](client/.env)

Use templates:

- [server/.env.example](server/.env.example)
- [client/.env.example](client/.env.example)

Important variables:

- Server
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - GROQ_API_KEY
  - GROQ_MODEL
  - GROQ_API_BASE_URL

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

- Phase 1 to 10 implemented in [task.md](task.md).
- Includes keyboard shortcuts, responsive polish, and stricter RBAC.

