# 🧠 NIYOPLAN — PROJECT.md (Core Project Spine)

> **⚠️ MANDATORY FOR ALL AI AGENTS: Read this entire file FIRST before making ANY changes. After completing work, update the [Change Log](#-change-log) section at the bottom of this file with a summary of what was done, files touched, and date.**

---

## 📌 What Is This File?

This file is the **single source of truth** for the Niyoplan project. It contains:

- Full architecture, tech stack, and design patterns
- Database schema overview and relationships
- Every module, component, and API route mapped
- Coding conventions and styling rules
- Complete change history (past + ongoing)
- Instructions for any AI agent or developer starting work

**If you are an AI agent** — you MUST:
1. Read this entire file before writing any code
2. Follow the conventions and patterns documented here
3. After completing changes, append an entry to the **Change Log** section at the bottom
4. Never remove or overwrite existing change log entries
5. If you add a new module, route, or table — document it in the relevant section of this file

---

## 🏗️ Project Overview

**Niyoplan** is a **multi-tenant project management SaaS application** for teams. It combines planning, execution, collaboration, and lightweight productivity tools in one Next.js workspace.

- **Maintainer**: Devrajsinh Gohil
- **Repository**: `https://github.com/devrajsinh2012/Niyoplan.git`
- **License**: Private
- **Status**: Active development

---

## ⚙️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.x |
| **UI Library** | React | 19.x |
| **Styling** | Tailwind CSS | v4.x |
| **CSS Approach** | CSS custom properties (design tokens) + Tailwind utilities |  |
| **Typography Plugin** | @tailwindcss/typography | 0.5.x |
| **Database** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) | — |
| **Realtime** | Supabase Realtime (postgres_changes) | — |
| **Rich Text** | TipTap (ProseMirror-based) | 3.x |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable | 6.x / 10.x |
| **Icons** | lucide-react | 0.577.x |
| **Toasts** | react-hot-toast | 2.x |
| **AI Integration** | Groq API (LLaMA 3.3 70B) | Optional |
| **File Storage** | Google Drive API (paused) | — |
| **Date Utilities** | date-fns | 4.x |
| **Testing** | Vitest | 4.x |
| **Deployment** | Docker + standalone output | — |
| **Font** | Inter (Google Fonts via next/font) | — |

---

## 📁 Project Structure

```
Niyoplan/
├── app/                          # Next.js App Router — pages & API routes
│   ├── layout.jsx                # Root layout (AuthProvider → OrgProvider → OnboardingMiddleware → AppShell)
│   ├── page.jsx                  # Landing / marketing page
│   ├── globals.css               # Design tokens, theme system, component styles
│   ├── loading.jsx               # Global loading state
│   │
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── forgot-password/          # Password reset request
│   ├── reset-password/           # Password reset confirmation
│   ├── sso-callback/             # OAuth callback handler (Google)
│   ├── onboarding/               # Organization onboarding (create/join)
│   │   ├── create/               # Create new organization
│   │   └── join/                 # Join existing organization via invite code
│   │
│   ├── dashboard/                # Main dashboard (portfolio insights, org-scoped stats)
│   ├── projects/                 # Project list page
│   │   └── [projectId]/          # Project workspace (tabbed: board, backlog, timeline, calendar, docs, goals, meetings, DSM, AI, activity)
│   │       └── settings/         # Project-specific settings
│   ├── today/                    # Personal "Today" task planning view
│   ├── tools/                    # Utility tools (calculator, notes, JSON formatter, AI writer)
│   ├── clients/                  # Client management (CRM-lite)
│   │   └── [clientId]/           # Client detail view
│   │
│   ├── settings/                 # User settings
│   │   ├── profile/              # Profile management
│   │   └── company/              # Organization / company settings
│   ├── admin/
│   │   └── settings/             # Admin-level settings
│   │
│   ├── privacy/                  # Privacy policy page
│   ├── terms/                    # Terms of service page
│   ├── api-documentation/        # API documentation page
│   │
│   └── api/                      # API Routes (Next.js Route Handlers)
│       ├── auth/                  # Auth endpoints (onboarding-status, profile)
│       ├── projects/              # CRUD projects + nested resources
│       │   └── [projectId]/       # Per-project endpoints
│       │       ├── route.js       # Project CRUD
│       │       ├── cards/         # Card/ticket CRUD
│       │       ├── lists/         # Kanban column management
│       │       ├── sprints/       # Sprint lifecycle
│       │       ├── dependencies/  # Card dependency management
│       │       ├── docs/          # Document CRUD
│       │       ├── spaces/        # Doc space management
│       │       ├── folders/       # Doc folder management
│       │       ├── goals/         # OKR goals
│       │       ├── meetings/      # PM meeting reviews
│       │       ├── dsm/           # Daily standup entries
│       │       ├── members/       # Project member management
│       │       ├── notifications/ # Project notifications
│       │       ├── saved-views/   # Saved filter/view state
│       │       ├── views/         # View configurations
│       │       └── planning/      # Unified planning data (Gantt/Calendar)
│       ├── organizations/         # Organization CRUD, member management
│       │   ├── [orgId]/           # Org-specific routes (members, roles, permissions)
│       │   └── auto-join/         # Auto-join via invite code
│       ├── clients/               # Client CRM endpoints
│       │   ├── dashboard/         # Client dashboard stats
│       │   └── [clientId]/        # Per-client CRUD
│       │       ├── contacts/      # Contact management
│       │       ├── interactions/  # Interaction logging
│       │       ├── reminders/     # Reminder management
│       │       └── deliverables/  # Deliverable tracking
│       ├── ai/                    # AI action endpoints (Groq)
│       ├── dashboard/             # Dashboard statistics API
│       ├── cards/                 # Cross-project card endpoints
│       ├── drive/                 # Google Drive integration endpoints
│       ├── files/                 # File management endpoints
│       ├── notifications/         # Global notification endpoints
│       ├── admin/                 # Admin-only endpoints
│       └── client-reminders/      # Client reminder due-date queries
│
├── components/                    # Reusable UI & feature components
│   ├── layout/                    # App shell components
│   │   ├── AppShell.jsx           # Main layout wrapper (sidebar + topnav + content)
│   │   ├── Sidebar.jsx            # Left navigation sidebar (hover-expand)
│   │   └── TopNav.jsx             # Top navigation bar (search, notifications, profile, theme)
│   ├── ui/                        # Generic UI components
│   │   ├── BrandMark.jsx          # Logo/brand component
│   │   ├── ConfirmDeleteModal.jsx # Delete confirmation dialog
│   │   ├── ConfirmModal.jsx       # General confirmation dialog
│   │   ├── InputModal.jsx         # Input form modal
│   │   ├── NiyoplanLoader.jsx     # Branded loading spinner
│   │   ├── PageSkeleton.jsx       # Loading skeleton states
│   │   ├── ProjectBadge.jsx       # Project identifier badge
│   │   ├── RichTextEditor.jsx     # TipTap rich text editor wrapper
│   │   ├── UserAvatar.jsx         # User avatar with initials fallback
│   │   ├── WelcomeModal.jsx       # First-time user welcome
│   │   └── ErrorBoundary.jsx      # React error boundary
│   ├── kanban/                    # Kanban board components
│   │   ├── KanbanBoard.jsx        # Main board with drag-and-drop
│   │   ├── KanbanBoard.css        # Board-specific styles
│   │   ├── KanbanColumn.jsx       # Single kanban column
│   │   ├── KanbanCard.jsx         # Draggable card component
│   │   ├── CardDetail.jsx         # Full card detail modal/panel
│   │   └── detail/                # Card detail sub-components
│   │       ├── CardActivity.jsx   # Activity feed on card
│   │       ├── CardDescription.jsx# Description editor
│   │       └── CardSidebar.jsx    # Card metadata sidebar
│   ├── gantt/                     # Gantt/Timeline components
│   │   ├── GanttChart.jsx         # Interactive Gantt chart
│   │   ├── GanttChart.css         # Gantt-specific styles
│   │   ├── DependencyManager.jsx  # Dependency visualization & management
│   │   └── DependencyManager.css  # Dependency modal styles
│   ├── calendar/                  # Calendar view
│   │   ├── CalendarGrid.jsx       # Monthly calendar grid
│   │   └── CalendarGrid.css       # Calendar-specific styles
│   ├── sprints/                   # Sprint management
│   │   ├── SprintManager.jsx      # Sprint board and lifecycle
│   │   ├── SprintManager.css      # Sprint-specific styles
│   │   └── SprintInsightsModal.jsx# Sprint analytics modal
│   ├── docs/                      # Documentation workspace
│   │   └── DocsWorkspacePanel.jsx # Docs with spaces/folders hierarchy
│   ├── goals/                     # OKR / Goals
│   │   └── GoalsPanel.jsx         # Goals and key results UI
│   ├── meetings/                  # Meeting reviews
│   │   └── MeetingReviewsPanel.jsx# PM meeting review panel
│   ├── dsm/                       # Daily Standup Meeting
│   │   └── DSMPanel.jsx           # DSM entry form and history
│   ├── ai/                        # AI features
│   │   └── AIToolsPanel.jsx       # AI-powered project tools
│   ├── workspace/                 # Workspace views
│   │   └── WorkspaceViewsPanel.jsx# Saved views manager
│   ├── tickets/                   # Ticket creation
│   │   └── CreateTicketModal.jsx  # New ticket creation form
│   ├── modals/                    # Global modals
│   │   ├── CreateProjectModal.jsx # Project creation wizard
│   │   └── Portal.jsx            # React portal utility
│   ├── middleware/                 # Client-side middleware
│   │   └── OnboardingMiddleware.jsx # Redirect to onboarding if not setup
│   ├── auth/                      # Auth-related components
│   └── FileAttachment.jsx         # Reusable file attachment component
│
├── context/                       # React Context providers
│   ├── AuthContext.jsx            # Authentication state (user, profile, signIn/signOut)
│   ├── OrganizationContext.jsx    # Active organization state, switching
│   └── ScheduleStore.jsx         # Unified schedule state for Gantt/Calendar/Sprint views
│
├── modules/                       # Feature modules (self-contained)
│   └── tools/                     # Tools module
│       ├── tools.routes.js        # Tool catalog and routing config
│       ├── components/            # Tool UI components
│       │   ├── ToolsDashboard.jsx # Tool selection dashboard
│       │   ├── Calculator.jsx     # Calculator tool
│       │   ├── Notes.jsx          # Notes tool
│       │   ├── JsonFormatter.jsx  # JSON formatter tool
│       │   └── AiWriter.jsx       # AI writing assistant
│       └── lib/                   # Tool business logic
│           ├── calculator.js      # Calculator engine
│           └── jsonFormatter.js   # JSON formatter logic
│
├── lib/                           # Shared libraries & utilities
│   ├── supabase.js                # Supabase client (browser)
│   ├── supabaseServer.js          # Supabase admin client (server-side)
│   ├── apiClient.js               # apiFetch() — authenticated API client wrapper
│   ├── auth.js                    # Auth helper utilities
│   ├── access.js                  # Server-side access control (IDOR protection)
│   ├── permissions.js             # Role-based permission matrix system
│   ├── roles.js                   # Role definitions
│   ├── constants.js               # App-wide constants
│   ├── validate.js                # Input validation utilities
│   ├── middleware.js               # Next.js middleware helpers
│   ├── avatar.js                  # Avatar URL generation
│   ├── ai.js                     # AI integration helpers (Groq)
│   ├── drive.js                   # Google Drive integration
│   ├── organizationAuth.js        # Organization auth helpers
│   ├── projectNotifications.js    # Notification creation helpers
│   ├── clients/                   # Client module server-side libraries
│   │   ├── access.js              # Client access control
│   │   ├── server.js              # Client server utilities
│   │   ├── validation.js          # Client input validation
│   │   └── notifications.js       # Client notification helpers
│   └── email/                     # Email utilities (empty — planned)
│
├── database/                      # Database artifacts
│   ├── schema.sql                 # Master database schema (source of truth)
│   └── migrations/                # Legacy migration directory
│
├── supabase/
│   └── migrations/                # Incremental SQL migrations (chronological)
│       ├── 20260323_add_organizations_support.sql
│       ├── 20260323_add_settings_support.sql
│       ├── 20260325_add_card_comments_subtasks.sql
│       ├── 20260325_add_cards_baseline.sql
│       ├── 20260325_add_cards_baseline_FIXED.sql
│       ├── 20260325_add_dependency_types.sql
│       ├── 20260325_add_dependency_types_FIXED.sql
│       ├── 20260325_create_meetings_table.sql
│       ├── 20260325_create_meetings_table_FIXED.sql
│       ├── 20260331_add_roles_qa_developer.sql
│       ├── 20260331_update_handle_new_user_invited_roles.sql
│       ├── 20260401_add_org_role_permissions.sql
│       ├── 20260401_fix_handle_new_user_search_path.sql
│       ├── 20260401_project_scope_docs_spaces.sql
│       ├── 20260402_add_member_invited_by_tracking.sql
│       ├── 20260402_google_drive_integration.sql
│       └── 20260519_client_management.sql
│
├── scripts/                       # Utility scripts
│   ├── migrate-organizations.js   # One-time org migration
│   ├── seed-microsoft-test-data.mjs # Test data seeding
│   ├── verify-migrations.js       # Migration verification
│   └── verify-migrations-simple.js
│
├── __tests__/                     # Unit tests (Vitest)
├── tests/                         # Additional test directory
├── public/                        # Static assets
│   ├── favicon.svg                # App favicon
│   └── apple-touch-icon.svg       # Apple touch icon
│
├── package.json                   # Dependencies & scripts
├── next.config.js                 # Next.js configuration (standalone output)
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── jsconfig.json                  # Path aliases (@ → project root)
├── vitest.config.js               # Vitest configuration
├── Dockerfile                     # Docker build instructions
├── docker-compose.yml             # Docker Compose setup
├── .env                           # Environment variables (template)
├── .env.local                     # Local environment overrides
└── .gitignore
```

---

## 🎨 Design System & Theming

### Theme Architecture

The app uses a **CSS custom property (design token) based theme system** defined in `app/globals.css`. Themes are toggled via the `data-theme` attribute on the `<html>` element.

**Two themes**: `light` (default) and `dark`

### Key Design Tokens

| Token Category | Examples |
|---|---|
| **Backgrounds** | `--bg-app`, `--bg-panel`, `--bg-surface`, `--bg-panel-hover`, `--bg-input` |
| **Text** | `--text-primary`, `--text-heading`, `--text-secondary`, `--text-muted`, `--text-link` |
| **Borders** | `--border-subtle`, `--border-strong`, `--border-focus` |
| **Accent** | `--accent-primary`, `--accent-hover`, `--accent-subtle`, `--accent-text` |
| **Status** | `--status-todo-*`, `--status-inprogress-*`, `--status-inreview-*`, `--status-done-*`, `--status-blocked-*` |
| **Priority** | `--priority-highest` through `--priority-lowest` |
| **Shadows** | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` |
| **Sizing** | `--topnav-height: 48px`, `--sidebar-width: 240px` |
| **Animation** | `--transition-fast`, `--transition-smooth`, `--transition-spring` |

### Styling Rules for AI Agents

1. **Always use CSS custom properties** for colors — never hardcode hex values like `#fff` or `#000` in component styles
2. **Use `var(--token)` syntax** in both Tailwind classes and inline styles
3. **Utility compatibility layer** exists in `globals.css` — standard Tailwind color classes (e.g., `bg-white`, `text-gray-900`) are mapped to theme tokens
4. **Component-specific CSS files** exist alongside their JSX (e.g., `KanbanBoard.css`, `GanttChart.css`)
5. **Dark mode is automatic** — if you use tokens correctly, dark mode works without extra effort

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Supabase Auth** handles email/password and Google OAuth sign-in
2. **AuthContext** (`context/AuthContext.jsx`) provides `user`, `profile`, `signIn`, `signUp`, `signOut`, `signInWithGoogle`
3. **Google OAuth** callback is handled at `/sso-callback`
4. **Profile auto-creation** happens via a Postgres trigger on `auth.users` INSERT
5. **First user** is automatically made `admin`
6. **Remember Me** state is tracked in localStorage

### Authorization Architecture

1. **Organization-scoped access**: Users belong to organizations with roles
2. **Role hierarchy**: `admin > pm > qa > developer > member > viewer`
3. **Permission matrix**: Per-organization, per-role permissions stored in `organization_role_permissions`
4. **Server-side access control**: `lib/access.js` provides:
   - `verifyOrganizationAccess(orgId, userId)`
   - `getOrganizationMembershipContext(orgId, userId)` — returns membership + permission matrix
   - `getProjectAccessContext(projectId, userId)` — checks org/project membership + creator status
   - `verifyProjectAccess(projectId, userId)`
   - `verifyValidAssignee(projectId, assigneeId)`
   - `getClientAccessContext(clientId, userId)` — client CRM access
5. **Permission keys**: `create_issue`, `edit_issue`, `delete_issue`, `manage_members`, `manage_sprints`, `manage_settings`, `view_clients`, `manage_clients`
6. **All API routes are IDOR-protected** — a security audit patched 30+ routes

### API Authentication Pattern

All client-side API calls use `apiFetch()` from `lib/apiClient.js`, which:
1. Gets the Supabase session token (with retry logic for race conditions)
2. Attaches `Authorization: Bearer <token>` header
3. Sets `Content-Type: application/json` (unless FormData)

**Server-side API routes** must:
1. Extract token from `Authorization` header
2. Validate with `supabaseAdmin.auth.getUser(token)`
3. Check organization/project access using `lib/access.js`

---

## 🗄️ Database Schema Summary

The database uses **Supabase (PostgreSQL)** with UUID primary keys throughout.

### Custom Types (Enums)

| Type | Values |
|---|---|
| `user_role` | `admin`, `pm`, `qa`, `developer`, `member`, `viewer` |
| `org_role` | `admin`, `pm`, `qa`, `developer`, `member`, `viewer` |
| `card_type` | `epic`, `story`, `bug`, `task` |
| `card_priority` | `urgent`, `high`, `medium`, `low` |
| `card_status` | `backlog`, `todo`, `in_progress`, `in_review`, `done` |
| `sprint_status` | `planning`, `active`, `completed` |
| `member_status` | `pending`, `active`, `rejected` |

### Core Tables

| # | Table | Purpose | Key Relations |
|---|---|---|---|
| 1 | `profiles` | User profiles (extends auth.users) | FK → `auth.users(id)` |
| 2 | `organizations` | Companies/workspaces | Has invite code, slug |
| 3 | `organization_members` | Org membership + role | FK → profiles, organizations |
| 4 | `organization_role_permissions` | Role-based permission overrides | FK → organizations |
| 5 | `projects` | Project workspaces | FK → organizations, profiles |
| 6 | `card_counters` | Auto-increment card IDs (e.g., NIYO-1) | FK → projects |
| 7 | `lists` | Kanban columns | FK → projects |
| 8 | `sprints` | Sprint lifecycle | FK → projects |
| 9 | `cards` | Tickets/tasks (the core entity) | FK → projects, lists, sprints, profiles |
| 10 | `labels` | Project labels | FK → projects |
| 11 | `card_labels` | Card-to-label mapping (M:M) | FK → cards, labels |
| 12 | `card_checklists` | Checklist items (JSONB) | FK → cards |
| 13 | `card_comments` | Threaded comments | FK → cards, profiles |
| 14 | `card_subtasks` | Child subtasks | FK → cards, profiles |
| 15 | `card_dependencies` | Gantt dependencies | FK → projects, cards |
| 16 | `activity_log` | Action audit trail | FK → cards, profiles |
| 17 | `dsm_entries` | Daily standup entries | FK → projects, profiles |
| 18 | `pm_meeting_reviews` | PM meeting records | FK → projects, profiles |
| 19 | `meeting_action_items` | Meeting action items | FK → meetings, projects, cards |
| 20 | `hr_reviews` | HR review records | FK → projects, profiles |
| 21 | `spaces` | Doc space hierarchy | FK → projects |
| 22 | `folders` | Doc folders | FK → spaces, projects |
| 23 | `docs` | Documents | FK → projects, spaces, folders |
| 24 | `goals` | OKR objectives | FK → projects, profiles |
| 25 | `goal_key_results` | Key results under goals | FK → goals |
| 26 | `notifications` | Inbox notifications | FK → projects, profiles |
| 27 | `saved_views` | Saved board filters/views | FK → projects, profiles |
| 28 | `clients` | CRM clients | FK → organizations |
| 29 | `client_contacts` | Client contacts | FK → clients |
| 30 | `client_interactions` | Interaction logs | FK → clients |
| 31 | `client_reminders` | Follow-up reminders | FK → clients |
| 32 | `client_deliverables` | Deliverable tracking | FK → clients |

### Database Triggers

| Trigger | On | Does |
|---|---|---|
| `on_auth_user_created` | INSERT on `auth.users` | Auto-creates profile, first user gets admin |
| `before_insert_card` | INSERT on `cards` | Auto-generates `custom_id` (e.g., "NIYO-42") |
| `after_insert_project` | INSERT on `projects` | Creates `card_counters` entry |
| `before_insert_organization` | INSERT on `organizations` | Generates invite code (e.g., "NYP-ABC123") |

### Realtime Subscriptions

The following tables have Supabase Realtime enabled:
- `cards` — for live Kanban/Gantt updates
- `lists` — for column changes
- `sprints` — for sprint status changes

---

## 🧩 Key Architecture Patterns

### 1. Provider Hierarchy (Root Layout)

```
<AuthProvider>
  <OrganizationProvider>
    <OnboardingMiddleware>
      <AppShell>
        {children}
      </AppShell>
    </OnboardingMiddleware>
  </OrganizationProvider>
</AuthProvider>
```

### 2. AppShell Pattern

- **AppShell** (`components/layout/AppShell.jsx`) wraps all authenticated pages
- Contains **TopNav** + **Sidebar** + **main content area**
- Auth, onboarding, and marketing pages render WITHOUT AppShell
- Theme state managed here (localStorage-persisted)
- Sidebar is **hover-expand** (16px collapsed → 240px expanded)

### 3. Project Workspace Tabs

The project workspace (`app/projects/[projectId]/page.jsx`) uses a **tabbed interface** with URL query parameter `?tab=`:

| Tab ID | Component | Description |
|---|---|---|
| `list` | `KanbanBoard` | Kanban board (default) |
| `backlog` | `SprintManager` | Sprint backlog management |
| `timeline` | `GanttChart` | Gantt chart / timeline view |
| `calendar` | `CalendarGrid` | Monthly calendar view |
| `docs` | `DocsWorkspacePanel` | Document workspace |
| `goals` | `GoalsPanel` | OKR goals and key results |
| `meetings` | `MeetingReviewsPanel` | PM meeting reviews |
| `dsm` | `DSMPanel` | Daily standup entries |
| `ai` | `AIToolsPanel` | AI-powered tools |
| `activity` | (inline) | Activity/notification feed |

### 4. ScheduleStore (Shared State)

`context/ScheduleStore.jsx` provides **unified state management** across Gantt, Calendar, Kanban, and Sprint views:

- Shared `scheduleItems` and `dependencies` state
- Realtime subscriptions for live updates
- Optimistic UI updates
- Actions: `createScheduleItem`, `updateScheduleItem`, `removeScheduleItem`, `createDependency`, `updateDependency`, `deleteDependency`, `bulkUpdateItems`

### 5. API Route Pattern

All API routes follow this pattern:

```javascript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyProjectAccess } from '@/lib/access';

export async function GET(request, { params }) {
  // 1. Extract and validate auth token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  // 2. Check access
  const { hasAccess, error } = await verifyProjectAccess(params.projectId, user.id);
  if (!hasAccess) return NextResponse.json({ error }, { status: 403 });

  // 3. Perform operation with supabaseAdmin
  // 4. Return NextResponse.json(...)
}
```

### 6. Client-Side Data Fetching Pattern

```javascript
import { apiFetch } from '@/lib/apiClient';

// Inside component or effect:
const response = await apiFetch('/api/projects/xxx/cards');
const data = await response.json();
```

### 7. Custom Card IDs

Cards get auto-generated IDs like `NIYO-1`, `NIYO-2` based on the project's `prefix` field and the `card_counters` table. This is handled by a Postgres trigger.

---

## 📊 Module Feature Matrix

| Module | Status | Key Features |
|---|---|---|
| **Auth** | ✅ Complete | Email/password, Google OAuth, remember me, password setup |
| **Onboarding** | ✅ Complete | Create org, join via invite code, mandatory before app access |
| **Dashboard** | ✅ Complete | Portfolio insights, org-scoped stats, recent activity |
| **Kanban Board** | ✅ Complete | Drag-and-drop, multi-column, card detail panel, filters |
| **Sprint Manager** | ✅ Complete | Sprint lifecycle (planning→active→completed), backlog, insights |
| **Gantt/Timeline** | ✅ Complete | Interactive timeline, dependency arrows, drag to resize/move |
| **Calendar** | ✅ Complete | Monthly grid, task display, date-based filtering |
| **Docs** | ✅ Complete | Spaces/folders hierarchy, TipTap rich text editor |
| **Goals (OKR)** | ✅ Complete | Goals with key results, progress tracking |
| **Meetings** | ✅ Complete | PM meeting reviews with RAG status, action items |
| **DSM** | ✅ Complete | Daily standup entries (yesterday/today/blockers/mood) |
| **AI Tools** | ✅ Complete | AI-powered project insights (Groq/LLaMA) |
| **Today** | ✅ Complete | Personal task planner, today-only filter, history view |
| **Tools** | ✅ Complete | Calculator, Notes, JSON Formatter, AI Writing Assistant |
| **Clients (CRM)** | ✅ Complete | Client management, contacts, interactions, reminders, deliverables |
| **Notifications** | ✅ Complete | In-app notifications, mark-read, bell badge |
| **Settings** | ✅ Complete | Profile, company/org settings, role permissions |
| **Admin** | ✅ Complete | Admin-only settings panel |
| **File Attachments** | ⏸️ Paused | Google Drive integration code exists but OAuth flow paused |
| **Saved Views** | ✅ Complete | Save and restore board filter/sort configurations |

---

## 🔧 Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — AI Features
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_BASE_URL=https://api.groq.com/openai/v1

# Optional — Google Drive (paused)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

---

## 🚀 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npx vitest           # Run tests
docker compose up -d --build   # Docker deployment
```

---

## 📐 Coding Conventions

### General Rules

1. **All components are `.jsx`** (not `.tsx` — no TypeScript)
2. **Use `'use client'`** directive at top of client components
3. **Path alias**: `@/` maps to project root (configured in `jsconfig.json`)
4. **Use `apiFetch()`** for all client-side API calls — never raw `fetch()`
5. **Use `supabaseAdmin`** for all server-side database queries (from `lib/supabaseServer.js`)
6. **Use `supabase`** (client) only for auth and realtime subscriptions on client
7. **Always check access** in API routes using `lib/access.js` functions
8. **Toast notifications** via `react-hot-toast` — use `toast.success()`, `toast.error()`
9. **Icons** from `lucide-react` — don't install other icon libraries
10. **Dates** handled with `date-fns` — don't install moment.js or dayjs

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `KanbanBoard.jsx` |
| API routes | `route.js` in folder | `app/api/projects/route.js` |
| CSS files | Match component | `KanbanBoard.css` |
| Context providers | PascalCase + Context | `AuthContext.jsx` |
| Lib utilities | camelCase | `apiClient.js` |
| Database columns | snake_case | `created_at`, `project_id` |
| CSS variables | kebab-case | `--bg-panel-hover` |
| URL query params | snake_case | `?tab=timeline` |

### Component Structure Pattern

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/apiClient';
import { SomeIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyComponent({ prop1, prop2 }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState(null);

  useEffect(() => {
    // data fetching
  }, [dependencies]);

  return (
    <div className="..." style={{ color: 'var(--text-primary)' }}>
      {/* component content */}
    </div>
  );
}
```

### API Route Structure Pattern

```javascript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getProjectAccessContext } from '@/lib/access';

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await getProjectAccessContext(params.projectId, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    // Business logic here...

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## ⚠️ Known Issues & Technical Debt

1. **Google Drive integration** is paused — OAuth token bridge needs to be finalized without Clerk
2. **Email library** (`lib/email/`) is empty — email sending not yet implemented
3. **`hooks/` directory** is empty — custom hooks not extracted yet
4. **Some migrations have `_FIXED` suffix** — indicates retry migrations; both may need to be applied
5. **`New changes/` directory** exists at root — likely temporary workspace, ignored in git

---

## 📋 Change Log

> **Instructions**: After making any changes to this project, add a new entry below with the date, summary, and files affected. Use the format shown. **Never delete existing entries.**

### Format

```
### [YYYY-MM-DD] — Brief Title
**Agent/Author**: [name or model]
**Summary**: What was done and why
**Files Changed**:
- `path/to/file.jsx` — description of change
- `path/to/other.js` — description of change
**Notes**: Any gotchas, follow-ups, or context for future work
```

---

### [2026-06-22] — PROJECT.md Created (Project Spine Document)
**Agent/Author**: Antigravity (Claude Opus 4.6)
**Summary**: Created this comprehensive PROJECT.md file by analyzing the entire codebase — every directory, component, API route, database table, context provider, and library. This serves as the single source of truth for any AI agent or developer starting work on Niyoplan.
**Files Changed**:
- `PROJECT.md` — Created (this file)
**Notes**: All AI agents should read this file first and update the Change Log after completing work.

---

### Pre-Existing Changes (Summarized from Git History)

Below is a summarized history of significant past changes, reconstructed from git commit history:

#### Phase 1 — Foundation
- **Monolithic structure migration** with Docker support
- **Next.js 15** with App Router setup
- **Supabase auth** integration (email + Google OAuth)
- **Security patch**: Next.js updated to ^15.1.7 for CVE-2025-66478

#### Phase 2 — Core Project Management
- **Kanban board** with drag-and-drop (dnd-kit)
- **Sprint manager** with lifecycle management
- **Gantt/timeline** with dependency arrows
- **Calendar grid** view
- **Card detail panel** with comments, subtasks, checklists
- **Project tabs** routing system (`?tab=`)

#### Phase 3 — Organization & Multi-Tenancy
- **Organization onboarding** (create + join via invite code)
- **Organization switching** in TopNav
- **Role-based permissions** (admin/pm/qa/developer/member/viewer)
- **Organization role permissions table** (customizable per org)

#### Phase 4 — Strategic Modules
- **Docs workspace** with spaces/folders/documents
- **Goals (OKR)** with key results
- **PM Meeting reviews** with RAG status and action items
- **DSM** (Daily Standup Meeting) entries
- **AI tools panel** (Groq integration)
- **Saved views/filters**

#### Phase 5 — Security & Stabilization
- **Security audit**: `lib/access.js` created, 30+ API routes patched for IDOR protection
- **Cross-org member leak** fixed
- **Tab-focus refresh bug** fixed
- **Build warnings** resolved, ESLint errors fixed
- **Custom modals** replaced browser confirm/prompt dialogs

#### Phase 6 — Polish & New Features
- **Today module** — personal task planning with DB storage, admin/PM assignment, org scoping, today-only filter, history view
- **Tools workspace** — Calculator, Notes, JSON Formatter, AI Writing Assistant (changed from grid to single-tool-at-a-time UI)
- **Client management (CRM)** — full client module with contacts, interactions, reminders, deliverables
- **TipTap rich text editor** for ticket descriptions
- **Landing page** + privacy/terms legal pages
- **Hover-expand sidebar** behavior
- **Logo redesign** and branding polish
- **NiyoplanLoader** branded loading component
- **Welcome modal** for first-time users
- **Keyboard shortcuts** modal
- **Sprint completion celebrations** (confetti)
- **Member invite flow** improvements
- **Password setup** mandatory flow
- **Google Drive integration** (foundation built, OAuth paused)

#### Phase 7 — Recent Fixes (June 2026)
- **Sidebar bottom logo removed** — removed `UserAvatar` import and avatar section from sidebar bottom
- **Sidebar nav reordered** — Tools moved below Clients (Dashboard → Today → Projects → Clients → Tools)
- **Tools module UI** changed from grid layout to tabbed single-tool-at-a-time view with animated tab bar
- **Timeline/Gantt dependency modal** — fixed dependency click by setting SVG overlay to `pointer-events: none` and `.dependency-group` to `pointer-events: auto`
- **Today module** — added date picker history navigation for previous days' tasks, filtered to today-only, context-aware labels
- **Dashboard today-stats fix** — changed daily_tasks query from string-based `done_at` filter to proper `created_at` date range (start/end of day) for accurate today stats

---

*This document was last updated on 2026-06-22.*
