# Niyoplan

Niyoplan is a full-stack project management platform built with Next.js App Router and Supabase.
It combines issue tracking, sprint planning, Kanban, Gantt, docs, DSM updates, goals/OKRs, meeting workflows, notifications, and AI-powered writing/summarization features in one codebase.

## What You Get

- Multi-project workspace with organization onboarding (create or join via invite code)
- Role-aware access (`admin`, `pm`, `member`, `viewer`) for key actions
- Kanban + backlog + sprint workflow for ticket lifecycle management
- Gantt timeline with dependency tracking
- Docs workspace with spaces/folders/documents
- DSM (daily updates), PM/HR meeting review flows, and action-item conversion to cards
- Goals and key results tracking
- In-app notifications and dashboard metrics
- AI helper endpoints backed by Groq for summaries and content assistance

## Tech Stack

- Framework: Next.js 15 (App Router), React 19
- Language: JavaScript (JSX)
- Styling: Tailwind CSS v4 + custom CSS files
- Backend/API: Next.js Route Handlers under `app/api`
- Database/Auth: Supabase (Postgres + Auth)
- Drag-and-drop: dnd-kit
- Date utilities: date-fns
- Icons/UI helpers: lucide-react, react-hot-toast, clsx, tailwind-merge
- Containerization: Docker + Docker Compose

## Architecture At A Glance

- Frontend pages live in `app/*`.
- APIs are colocated in `app/api/*/route.js`.
- Client-side auth/profile state is managed in `context/AuthContext.jsx`.
- App shell + onboarding checks are enforced globally in `app/layout.jsx`.
- Supabase clients live in `lib/supabase.js` (client) and `lib/supabaseServer.js` (server/service role).

Important runtime note:

- The main dashboard route is `/` (not `/dashboard`).

## Core Route Areas

- UI pages:
    - `/` dashboard
    - `/projects` project listing and creation
    - `/projects/[projectId]/*` project workspaces (board, docs, goals, settings, etc.)
    - `/login`, `/register`
    - `/onboarding`, `/onboarding/create`, `/onboarding/join`
    - `/settings/*`, `/admin/settings`

- API groups (`app/api`):
    - `auth/profile`
    - `projects` and nested resources (cards, lists, sprints, docs, dependencies, goals, meetings, notifications, spaces, folders)
    - `organizations` and membership/invite-code operations
    - `dashboard/stats`
    - `admin/users`
    - `ai/[action]`

## AI Actions

`POST /api/ai/[action]` supports these actions:

- `generate-description`
- `improve-description`
- `suggest-priority`
- `sprint-summary`
- `meeting-summary`
- `risk-helper`
- `goal-narrative`
- `dsm-summary`

All AI actions require valid auth and a configured Groq API key.

## Authentication and Authorization

- API handlers verify bearer tokens via Supabase auth in `lib/auth.js`.
- Role checks are centralized in `lib/roles.js`.
- Many server routes use the service-role Supabase client (`supabaseAdmin`), so protect server environment secrets carefully.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (Auth + Postgres)
- Groq API key (for AI endpoints)

## Quick Start

1. Clone and install:

```bash
git clone https://github.com/devrajsinh2012/Niyoplan.git
cd Niyoplan
npm install
```

2. Create a `.env` file in project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Groq AI (required for /api/ai/*)
GROQ_API_KEY=your_groq_api_key

# Optional overrides
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
```

3. Run development server:

```bash
npm run dev
```

4. Open:

- http://localhost:3000

## Database and Migrations

Schema and migration assets are in:

- `database/schema.sql`
- `database/migrations/*`
- `supabase/migrations/*`

Recommended approach:

1. Apply the main schema first (`database/schema.sql`) in Supabase SQL editor.
2. Apply incremental migration files from `supabase/migrations`.
3. Verify required tables exist (`profiles`, `projects`, `cards`, `lists`, `sprints`, `organizations`, `organization_members`, etc.).

Operational note:

- Kanban rendering groups by `list_id`. Ensure newly created cards include a valid `list_id` (or a default backlog list assignment) so cards appear correctly.

## Scripts

- `npm run dev` start local dev server
- `npm run build` create production build
- `npm run start` run production server
- `npm run lint` run Next.js linting

## Docker

This repository includes a production-oriented Docker setup (`output: 'standalone'`).

Start with Compose:

```bash
docker compose up -d --build
```

Container details:

- App exposed on port `3000`
- Environment loaded from `.env`
- Uses multi-stage build with Next.js standalone output

## Project Structure

```text
app/
    api/                      # Route handlers
    projects/                 # Project-centric pages
    onboarding/               # Create/join organization flow
components/
    kanban/                   # Kanban board UI
    gantt/                    # Gantt chart UI
    dsm/                      # Daily stand-up UI
    goals/                    # Goals/OKR panels
    docs/                     # Documentation workspace UI
context/
    AuthContext.jsx           # Session and profile state
lib/
    auth.js                   # API auth token verification
    roles.js                  # Role checks
    supabase.js               # Browser client
    supabaseServer.js         # Server/service-role client
database/
    schema.sql                # Base schema
supabase/
    migrations/               # Supabase SQL migrations
scripts/
    migrate-organizations.js  # Organization migration helper
```

## Troubleshooting

- `Unauthorized` from API routes:
    - Ensure requests include `Authorization: Bearer <supabase_access_token>`.
- AI route failures:
    - Confirm `GROQ_API_KEY` is set and valid.
- Missing data in Kanban/Gantt:
    - Confirm `lists` are seeded and cards have proper `list_id`; ensure date fields are populated where expected.
- Users stuck before app access:
    - Verify onboarding status and active organization membership rows in `organization_members`.

## Deployment Notes

- Designed to run well on Vercel or any Node-compatible container platform.
- Ensure all required environment variables are configured in deployment.
- Keep `SUPABASE_SERVICE_KEY` server-side only.

## Maintainer

- Devrajsinh Gohil
- GitHub: https://github.com/devrajsinh2012

## License

No explicit license file is currently included in this repository.
