<div align="center">
  <h1>🚀 Niyoplan</h1>
  <p><strong>A Modern, Full-Stack Agile Project Management Platform</strong></p>
  <p>Built with Next.js 15, React 19, Supabase, and Tailwind CSS v4.</p>
</div>

---

## 📖 Overview

**Niyoplan** is a highly capable project management and issue-tracking platform designed for Agile teams. It acts as an all-in-one workspace, combining traditional Kanban boards and Sprint planning tools with advanced features like Gantt charts, Daily Scrum (DSM) updates, Goal (OKR) tracking, and built-in HR/PM meeting workflows. 

Furthermore, Niyoplan leverages **Groq AI** to provide smart ticket summarizations, sprint velocity predictions, and automated risk analysis, enabling teams to operate at maximum efficiency.

## ✨ Key Features

*   🏢 **Multi-Tenant Workspaces:** Support for isolated organizations. Join an existing team via an invite code, or create a new workspace from scratch.
*   🔒 **Enterprise-Grade Security:** Custom architectural middleware (`lib/access.js`) guaranteeing strict, server-side resource scoping to prevent IDOR and cross-tenant data leaks.
*   📋 **Advanced Issue Tracking:** Full ticket lifecycle management with backlog curation, sprint assignments, priority tagging, and custom statuses.
*   📊 **Visual Workflows:**
    *   Interactive **Kanban Boards** featuring drag-and-drop powered by `dnd-kit`.
    *   Dynamic **Gantt Timelines** to visualize blocker dependencies.
*   🤖 **AI Enhancements:** Built-in Groq integrations that automatically generate meeting summaries, suggest ticket descriptions, and highlight project risks.
*   🎯 **Goals & OKRs:** Track top-level objectives and measurable key results directly alongside your project execution.
*   📝 **Knowledge Base:** Internal Docs workspace supporting spaces, folders, and markdown-based collaborative documents.
*   👥 **Role-Based Access Control (RBAC):** Granular permissions ensuring `admin`, `pm`, `member`, and `viewer` roles can only perform authorized actions.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4 + custom modules
- **Components:** Radix primitives + Lucide React for icons
- **State/Interactions:** `dnd-kit` (drag-and-drop), `date-fns`

### Backend & Infrastructure
- **API:** Next.js Serverless Route Handlers (`app/api/*`)
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth with JWT verification
- **AI Integrations:** Groq LLM API
- **Containerization:** Docker & Docker Compose (`output: 'standalone'`)

---

## 🏗️ Architecture & Security Model

Niyoplan follows a strict separation of concerns within the Next.js App Router:
*   **Colocated APIs:** Endpoints live under `app/api/` representing RESTful resources.
*   **Dynamic Server Rendering:** Native Next.js 15 data fetching strategies utilizing strict `force-dynamic` headers to ensure boards and kanban lists never display stale cache.
*   **Access Control Middleware:** Due to complex hierarchical data (Organizations -> Projects -> Sprints -> Cards), the codebase enforces a manual Verification Layer (`lib/access.js`) on the backend against the Supabase Service Role client, ensuring 100% tenant isolation.

---

## 🚦 Quick Start

### 1. Prerequisites
- Node.js 20+
- npm 10+
- [Supabase](https://supabase.com/) Project (Auth + Postgres)
- [Groq](https://groq.com/) API key (for AI features)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/devrajsinh2012/Niyoplan.git
cd Niyoplan
npm install
```

### 3. Environment Variables
Create a `.env` file at the root of your project:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key

# Optional Groq Overrides
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
```

### 4. Database Seeding
Setup your database using the provided SQL files:
1. Run `database/schema.sql` in your Supabase SQL Editor to establish foundational tables.
2. Run any incremental scripts found in `supabase/migrations/`.
3. *(Optional)* Run the server-side helper `scripts/migrate-organizations.js` if upgrading from a legacy schema.

### 5. Run Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker Deployment

Niyoplan expects a production-oriented standalone output.
To build and spin up the containerized application instantly:

```bash
docker compose up -d --build
```
*Note: Make sure your `.env` variables are correctly bound/passed to the container.*

---

## 🗂️ Project Structure

```text
Niyoplan/
├── app/
│   ├── api/          # Secure REST API Endpoints
│   ├── projects/     # Main Workspace & Dashboards
│   └── onboarding/   # Multi-tenant Auth flows
├── components/       # Reusable UI Blocks (Kanban, Gantt, DSM)
├── context/          # React Context Providers (Auth, Active Org)
├── lib/              # Core Utilities (Access Middleware, Roles, DB Clients)
├── database/         # SQL Schemas
└── scripts/          # Migration Utilities
```

---

## 👤 Maintainer
**Devrajsinh Gohil**
- GitHub: [devrajsinh2012](https://github.com/devrajsinh2012)
