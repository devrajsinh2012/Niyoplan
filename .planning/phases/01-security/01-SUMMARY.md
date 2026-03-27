# Phase 1: Critical Security & Access Control

## Accomplishments
- Fixed missing access control in `/app/api/cards/[id]/comments/route.js`.
- Fixed missing organization scoping in `/app/api/projects/route.js`.
- Added robust access verification to all card-related and subtask endpoints.
- Resolved organization switching bugs.
- Implemented automated tests for access control logic in `lib/access.js`.

## User-facing changes
- Organization data is strictly isolated to the currently active organization.
- Unauthorized access to other project's cards/comments is blocked.
