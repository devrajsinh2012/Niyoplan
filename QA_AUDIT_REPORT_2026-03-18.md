# Niyoplan - Full Project QA Audit
Date: 2026-03-18
Auditor: GitHub Copilot (GPT-5.3-Codex)

## 1) Audit Scope
- Frontend quality checks: install, lint, build, boot smoke.
- Backend quality checks: install, runtime smoke, API endpoint smoke, schema check.
- Security/config checks: secret handling, route protection, dependency vulnerability scan.
- Test readiness checks: test script availability and automation status.

## 2) Commands Executed (High-Level)
- Client: npm install, npm run lint, npm run build, npm audit --omit=dev
- Server: npm install, npm test, npm audit --omit=dev, node scripts/check_schema.js
- API smoke: health + protected route probes on localhost:4000

## 3) Executive Summary
Overall status: PARTIALLY PASS

Passed:
- Backend starts and responds.
- Health endpoint works (200).
- Protected endpoints correctly reject unauthenticated access (401).
- Database schema check passes (21/21 required tables queryable).
- Dependency audit reports 0 production vulnerabilities for client/server.

Failed/Blocked:
- Frontend lint fails (5 errors, 12 warnings).
- Frontend build/dev blocked in current environment due to Node runtime mismatch and missing rolldown native binding.
- No real automated tests configured for backend/frontend.

## 4) Detailed Findings (Prioritized)

### Critical-1: Frontend cannot build/run in current environment
Severity: Critical
Area: Toolchain/Runtime
Files:
- client/package.json

Evidence:
- Client requires Node >=20.19, but environment is Node 20.17.0.
- Vite build fails with missing optional native binding:
  - @rolldown/binding-win32-x64-msvc not found
  - rolldown-binding.win32-x64-msvc.node not found

Impact:
- Frontend cannot be smoke-tested end-to-end in this environment.
- CI/CD and local dev reproducibility risk for machines below required Node patch level.

Repro Steps:
1. cd client
2. npm run build
3. Observe Node version and rolldown native binding failure.

Recommended Fix:
1. Upgrade Node to 20.19+ (or 22.12+).
2. Remove client/node_modules and client/package-lock.json.
3. Reinstall dependencies and rerun build.
4. Add a preflight script/check in CI to fail fast on unsupported Node versions.

---

### High-1: Frontend lint fails with 5 errors
Severity: High
Area: Code Quality / Reliability

Error Evidence:
1. client/src/components/layout/AppShell.jsx:14
- react-hooks/set-state-in-effect
- Synchronous setState inside useEffect

2. client/src/context/AuthContext.jsx:83
- react-refresh/only-export-components
- File exports non-component utility hook alongside component export pattern triggering rule

3. client/src/pages/dashboard/DashboardPage.jsx:44
- no-unused-vars
- Icon variable reported unused

4. client/src/pages/projects/ProjectDetailPage.jsx:121
- no-unused-vars
- newCard parameter unused

5. client/src/pages/projects/ProjectsPage.jsx:49
- no-unused-vars
- data assigned but unused

Impact:
- Quality gate failure for lint-enforced pipelines.
- Increased risk of hidden defects and maintainability issues.

Repro Steps:
1. cd client
2. npm run lint
3. Observe 5 errors and 12 warnings.

Recommended Fix:
- Resolve all 5 lint errors first (blocking).
- Then resolve hook dependency warnings in a controlled pass.
- Add lint step to CI required checks.

---

### Medium-1: React hook dependency warnings across multiple modules
Severity: Medium
Area: React correctness / stale closure risk

Representative files:
- client/src/components/docs/DocsWorkspacePanel.jsx:17
- client/src/components/dsm/DSMPanel.jsx:44
- client/src/components/gantt/GanttChart.jsx:29,125
- client/src/components/goals/GoalsPanel.jsx:17
- client/src/components/kanban/KanbanBoard.jsx:21
- client/src/components/meetings/MeetingReviewsPanel.jsx:27
- client/src/components/sprints/SprintManager.jsx:15
- client/src/components/workspace/WorkspaceViewsPanel.jsx:11
- client/src/context/AuthContext.jsx:31
- client/src/pages/projects/ProjectDetailPage.jsx:30,49

Impact:
- Potential stale data, missed refreshes, and non-deterministic behavior under updates.

Recommended Fix:
- Memoize callbacks with useCallback/useMemo where needed.
- Include all true dependencies or intentionally justify exclusions with stable wrappers.

---

### Medium-2: No automated test suite configured
Severity: Medium
Area: QA Automation
Files:
- server/package.json
- client/package.json

Evidence:
- server npm test prints "No tests configured".
- client has no test script.

Impact:
- Regressions likely to escape into production.
- QA quality depends on manual verification.

Recommended Fix:
1. Backend: add Jest/Vitest + supertest for auth, projects, dashboard routes.
2. Frontend: add Vitest + React Testing Library for AuthContext, AppShell, Projects/Dashboard pages.
3. Add minimum smoke tests in CI (lint + build + core route tests).

---

### Medium-3: Broad CORS configuration without explicit origin allowlist
Severity: Medium
Area: API Security
File:
- server/index.js

Evidence:
- app.use(cors()) with defaults (open origin policy behavior).

Impact:
- Increases exposure of API surface to unintended browser origins.

Recommended Fix:
- Restrict CORS origins via environment-based allowlist and explicit methods/headers.

---

### Medium-4: Local plaintext secret file exists in workspace
Severity: Medium
Area: Secret Management
File:
- secret key.md

Evidence:
- File contains real-looking keys and credentials mapping.
- .gitignore includes secret key.md, but local persistence still creates handling risk.

Impact:
- Risk of accidental leak via copy/share, backup sync, screenshots, or manual upload.

Recommended Fix:
1. Move secrets to .env files only (already supported by project).
2. Delete plaintext secret notes from workspace.
3. Rotate any keys that were ever exposed outside secure channels.
4. Add secret scanning in CI/pre-commit.

## 5) API Smoke Test Results
Base URL tested: http://localhost:4000

- GET /health -> 200 (PASS)
- GET /api/auth/profile (no token) -> 401 (PASS expected)
- GET /api/projects (no token) -> 401 (PASS expected)
- GET /api/dashboard/stats (no token) -> 401 (PASS expected)
- POST /api/ai/suggest-priority (no token) -> 401 (PASS expected)

Observation:
- Core auth middleware appears consistently applied across route files.
- Route prefixes like /api/auth and /api/dashboard without concrete leaf paths return 404, which is expected.

## 6) Database QA Result
Command:
- node server/scripts/check_schema.js

Result:
- Ready tables: 21/21
- All required tables present and queryable.

## 7) Dependency Security Audit
- client: npm audit --omit=dev -> 0 vulnerabilities
- server: npm audit --omit=dev -> 0 vulnerabilities

## 8) Recommended Change Plan (QA-Driven)
Priority P0 (Immediate):
1. Upgrade Node runtime to supported version across all environments.
2. Reinstall frontend dependencies cleanly.
3. Fix all 5 lint errors.
4. Re-run frontend build and dev smoke.

Priority P1 (This Sprint):
1. Fix hook dependency warnings in key high-traffic modules.
2. Restrict CORS via explicit allowlist.
3. Remove plaintext secret note files and rotate exposed keys if needed.

Priority P2 (Next Sprint):
1. Add automated test suite (backend + frontend).
2. Add CI gates: lint, build, smoke/API tests, and secret scanning.

## 9) QA Exit Criteria Proposal
Release-ready when all are true:
- Frontend lint: 0 errors (preferably 0 warnings).
- Frontend build: successful on supported Node runtime.
- Backend smoke tests: all pass.
- At least minimal automated API and UI smoke tests exist and pass in CI.
- Secret management policy enforced with no plaintext key files in workspace.

---
Report complete.
