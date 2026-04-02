# Niyoplan

Niyoplan is a multi-tenant project management app for teams. It combines planning, execution, collaboration, and lightweight productivity tools in one Next.js workspace.

## Stack

- Next.js 15 (App Router)
- React 19
- Supabase Auth + Postgres
- Tailwind CSS v4
- Vitest
- Optional Groq AI integrations

## Core Features

- Organization onboarding (create or join company)
- Multi-project workspace with:
  - Kanban
  - Sprint/backlog
  - Gantt/timeline
  - Calendar
  - Docs and goals
  - Activity and notifications
- Personal Today view
- Admin and company settings
- File attachment model with Google Drive integration support

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard |
| `/projects` | Project list |
| `/projects/[projectId]` | Project workspace |
| `/projects/[projectId]/settings` | Project settings |
| `/today` | Personal task planning |
| `/tools` | Utility tools |
| `/onboarding` | Onboarding entry |
| `/login`, `/register` | Auth |
| `/settings/profile` | Profile management |
| `/settings/company` | Organization management |
| `/admin/settings` | Admin controls |

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project with Auth and Postgres enabled

## Installation

```bash
git clone https://github.com/devrajsinh2012/Niyoplan.git
cd Niyoplan
npm install
```

## Environment Variables

Create `.env` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional fallback
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_BASE_URL=https://api.groq.com/openai/v1

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

Notes:
- `SUPABASE_SERVICE_KEY` is required for server-side protected routes.
- `GROQ_*` values are only required for AI features.
- `GOOGLE_*` values are required for Google Drive storage integration.

## Auth

Authentication is Supabase-based.

- Email/password is handled through Supabase Auth.
- Google sign-in uses Supabase OAuth provider configuration.
- OAuth callback route is `/sso-callback`.

## Google OAuth Setup (Supabase)

1. Open Supabase Dashboard -> Authentication -> Providers -> Google.
2. Add your Google OAuth Client ID and Client Secret.
3. In Google Cloud Console, add the callback URL shown by Supabase.
4. Add app redirect URLs per environment:
   - `http://localhost:3000/sso-callback`
   - `http://localhost:3000/login`
   - `http://localhost:3000/register`

## Google Drive Storage Integration

Drive integration exists in code (`lib/drive.js` and related routes), but current organization connect flow is temporarily paused while OAuth token bridge is being finalized without Clerk.

- Existing stored org Drive credentials can continue to be used.
- New Drive connection from settings is intentionally blocked for now.

Required scope for Drive operations:

- `https://www.googleapis.com/auth/drive.file`

Enable refresh token issuance in your Google OAuth consent/settings so org-level Drive access can be refreshed.

## Database Setup

1. Run `database/schema.sql` in Supabase SQL Editor.
2. Apply migrations under `supabase/migrations/`.
3. Use scripts under `scripts/` only if they match your DB version.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npx vitest
```

## Docker

```bash
docker compose up -d --build
```

## Project Structure

```text
app/                   # App Router pages and API routes
components/            # UI and feature components
context/               # Auth and organization providers
lib/                   # Auth, access, API client, helpers
database/              # Base SQL schema
supabase/migrations/   # Incremental DB migrations
scripts/               # Utility and migration scripts
__tests__/             # Unit tests
```

## Testing

Run all tests:

```bash
npx vitest
```

## Maintainer

Devrajsinh Gohil
