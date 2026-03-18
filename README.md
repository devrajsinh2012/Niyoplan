# Niyoplan - Agile Project Management

Niyoplan is a modern, Jira-style project management tool built from the ground up to support Agile development. Designed with a stunning, glassmorphism dark theme UI, it delivers a suite of essential PM features such as custom ticket generation, interactive Kanban boards, sprint management, and global workspace metrics.

**Developed by:** [devrajsinh2012](https://github.com/devrajsinh2012)
**Contact:** djgohil2012@gmail.com

---

## 🌟 Key Features

### 1. Unified Workspace & Dashboard
- **Global Dashboard:** Track projects, open tickets, story points, and recent activity across your entire workspace.
- **Role-Based Access Control (RBAC):** Admin, PM, Member, and Viewer roles automatically enforced on the backend.
- **Secure Authentication:** JWT-powered authentication backed by Supabase.

### 2. Core Ticketing System
- **Custom Project Prefixes:** Issue tracking identical to Jira (e.g., `NIYO-123`).
- **Comprehensive Ticket Data:** Assignees, reporters, priority levels (Urgent to Low), story points, and issue types (Epic, Bug, Task, Story).
- **Advanced Filtering & Search:** Rapidly slice project views.

### 3. Agile Execution (Sprints & Kanban)
- **Interactive Kanban Board:** Full drag-and-drop feature powered by `@dnd-kit`. Create custom lists, reorganize cards, and seamlessly transition issues through stages.
- **Sprint Management:** Group backlog cards into time-boxed Sprints. Track Sprint statuses (`planning`, `active`, `completed`).

---

## 🛠️ Tech Stack & Architecture

Niyoplan is structured as a decoupled full-stack application.

*   **Frontend (`client/`):** React, Vite, React Router, Tailwind CSS, Lucide Icons, `@dnd-kit` (Drag and Drop).
*   **Backend (`server/`):** Node.js, Express, strict custom RBAC middlewares.
*   **Database (`database/`):** Supabase (PostgreSQL), with advanced Triggers for auto-incrementing Ticket IDs and Profile generation.

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Supabase Project Database

### 1. Database Setup
1. Go to your Supabase project's **SQL Editor**.
2. Copy the entire contents of `database/schema.sql` and run it to provision all tables, enums, triggers, and functions.

### 2. Backend Setup
```bash
cd server
npm install
npm run dev
```
*(Runs on `http://localhost:4000`)*

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

*Note: The first user to register via the UI is automatically granted the `Admin` role.*
