# NIYOPLAN ROADMAP

Manage, plan, and execute development phases for the Niyoplan project.

## Current Milestone: MVP (v1.0)

| Phase | Title | Status | Goal |
|-------|-------|--------|------|
| 01 | Security & Access Control | Complete | Hardening all API endpoints for multi-tenant isolation. |
| 02 | Projects & Organizations | Complete | Functional organization switching and project scoping. |
| 03 | Kanban Board | Complete | A Jira-like Kanban experience with drag-and-drop. |
| 04 | Core Features | Complete | Subtasks, comments, activity logging. |
| 05 | Tech Debt | Complete | Caching (partial), error boundaries, and standardizing. |
| 06 | Hotfixes | Complete | Initial critical patches for stability. |
| 07 | Tab Switch Refresh Fix | Complete | Fix annoying full-page refresh/loaders when switching tabs. |

## Future Milestones: v2.0
- Gamification & Advanced Today Workspace
- Performance Optimizations
- Real-time updates with Supabase Realtime

## Active Planning: v2.0

### Phase 08: Google Drive Storage Integration
**Status:** Planned
**Goal:** Add organization-owned Google Drive as the default attachment storage backend with tenant-safe upload/download/delete workflows.
**Requirements:** [GDRIVE-01, GDRIVE-02, GDRIVE-03, GDRIVE-04, GDRIVE-05, GDRIVE-06]
**Plans:** 4 plans

Plans:
- [ ] 08-01-PLAN.md — Foundation: schema, Drive helper, dependency/docs setup
- [ ] 08-02-PLAN.md — Admin Drive lifecycle APIs and Company Settings management UI
- [ ] 08-03-PLAN.md — File attachment APIs and reusable FileAttachment component
- [ ] 08-04-PLAN.md — Project auto-folder provisioning, card integration, and end-to-end verification checkpoint
