# Niyoplan

Niyoplan is a multi-tenant project management workspace for agile teams. It combines organization onboarding, project planning, team operations, and lightweight productivity tools in a single Next.js application.

The app is built with Next.js 15, React 19, Supabase, Tailwind CSS v4, and optional Groq AI integrations.

## What It Does

- Create or join an organization during onboarding.
- Switch between workspaces and manage membership from the app shell.
- Track work from a dashboard, a Today view, and a per-project workspace.
- Plan work with list, Kanban, backlog/sprint, Gantt, calendar, DSM, meetings, goals, docs, and views/inbox tabs.
- Use AI helpers for writing, summaries, priorities, risks, and goal narratives.
- Open a small productivity toolkit with a calculator, notes, JSON formatting, and an AI writing assistant.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Main dashboard with organization-wide activity and sprint summaries |
| `/projects` | Project directory with search, filters, and starred projects |
| `/projects/[projectId]` | Project workspace with multiple planning and collaboration tabs |
| `/projects/[projectId]/settings` | Project-level settings |
| `/today` | Personal daily task view |
| `/tools` | Productivity utilities |
| `/onboarding` | Create or join a company |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Authentication flows |
| `/settings` | Personal and organization settings hub |
| `/settings/profile` | Profile, avatar, email, and password management |
| `/settings/company` | Company details, members, and invite management |
| `/admin/settings` | Admin user management and permission controls |

## Workspace Features

- Dashboard: organization-level overview, recent activity, sprint health, recent issues, and today stats.
- Projects: searchable, filterable project directory with star support and quick project creation.
- Project workspace: list view, Kanban board, sprint backlog, Gantt timeline, calendar, DSM, meetings, goals and OKRs, docs workspace, saved views and inbox, and AI tools.
- Today: daily task tracking with custom items and imported issues.
- Meetings: PM review sheets, HR review sheets, meeting calendars, and action-item conversion into cards.
- Goals: goal and key-result tracking with AI-generated stakeholder narratives.
- Docs: space/folder/doc hierarchy for structured project notes.
- Tools: calculator, local notes, JSON formatter, and an AI writing assistant.
- Admin and company settings: role management, invite flow, permissions, and organization metadata.

## Tech Stack

### Frontend

- Next.js 15 App Router
- React 19
- Tailwind CSS v4
- Lucide React icons
- dnd-kit for drag and drop
- date-fns for date handling
- react-hot-toast for notifications
- canvas-confetti for task completion celebration

### Backend and Data

- Supabase Auth and PostgreSQL
- Next.js route handlers under `app/api/`
- Server-side access checks in `lib/access.js`
- Authenticated fetch helpers in `lib/apiClient.js`
- Groq-backed AI helpers in `lib/ai.js`

### Deployment

- Docker and Docker Compose
- Next.js standalone output

## Architecture Notes

- `context/AuthContext.jsx` manages auth state, profile hydration, and sign-in persistence.
- `context/OrganizationContext.jsx` keeps the active organization in sync across the app.
- `context/ScheduleStore.jsx` powers shared planning data for the project views.
- `lib/access.js` contains the organization, project, and assignee validation rules used by protected server routes.
- `lib/apiClient.js` injects Supabase session tokens into client-side API calls.
- Many project actions are organized around organization-scoped data to keep workspace boundaries isolated.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project with Auth and Postgres enabled
- A Groq API key if you want to use AI features

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/devrajsinh2012/Niyoplan.git
cd Niyoplan
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional fallback if NEXT_PUBLIC_APP_URL is not set
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
```

`SUPABASE_SERVICE_KEY` is required for server-side access checks and protected API routes. `GROQ_*` values are only needed for AI features.

## Database Setup

1. Run `database/schema.sql` in your Supabase SQL editor to create the base schema.
2. Apply any migration files under `supabase/migrations/`.
3. If you are upgrading from an older schema, run the helper scripts in `scripts/` only when they match your database version.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Other Scripts

```bash
npm run build
npm run start
npm run lint
npx vitest
```

## Docker

Build and run the production container with Docker Compose:

```bash
docker compose up -d --build
```

This setup uses the Next.js standalone output configured in `next.config.js`.

## Project Structure

```text
app/              # App Router pages, layouts, and route handlers
components/       # UI, layout, project, and workspace components
context/          # Auth, organization, and schedule state providers
database/         # Base SQL schema and related database files
lib/              # API client, auth, access control, validation, and AI helpers
modules/tools/    # Workspace tools dashboard and local utilities
scripts/          # Maintenance and migration scripts
supabase/migrations/ # Incremental database migrations
__tests__/        # Vitest coverage for access, API client, and tools helpers
```

## Testing

The current test suite focuses on access control, authenticated API headers, and the built-in tools helpers. Run it with `npx vitest`.

## Notes

- Many screens expect an active organization before they can load data.
- Client-side calls to protected routes should go through `apiFetch`.
- AI-powered actions require the Groq environment variables above.

## Maintainer

Devrajsinh Gohil
