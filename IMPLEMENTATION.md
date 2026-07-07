# 🛠️ IMPLEMENTATION.md — My Space + Organization Central Kanban

> **For AI agents (Antigravity or otherwise): Read `PROJECT.md` in full before starting anything here.** This document assumes you already know the project's tech stack, conventions, file structure, access control pattern, and database schema from `PROJECT.md`. Do not duplicate research already answered there, just follow it.

---

## 🎯 Goal

Add a new personal, cross-organization workspace called **My Space**, plus a new **organization-wide central kanban** inside the existing Dashboard module. Both features aggregate cards from multiple projects, which is new territory for this codebase since every existing view (Kanban, Sprint Manager, Gantt, Calendar) is currently scoped to one project at a time.

---

## 🔍 Step 0 — Mandatory pre-flight check

Before writing any query or component, open `database/schema.sql` and confirm the exact column names on the `cards` table, specifically:

- The assignee column name (assumed `assignee_id` based on PROJECT.md, verify before use)
- The due date column name (assumed `due_date`)
- The status column and its enum values (`card_status`: `backlog`, `todo`, `in_progress`, `in_review`, `done`)
- The `project_id` foreign key
- Whether `projects` has a direct `organization_id` column for the join

If any assumed name in this document does not match the real schema, use the real name and note the discrepancy in the PROJECT.md change log entry at the end (see Step 7).

Also check `lib/access.js` for existing helper functions before writing new ones. Reuse `verifyOrganizationAccess`, `getOrganizationMembershipContext`, and `getProjectAccessContext` wherever applicable rather than writing new access logic from scratch.

---

## 📋 Feature Spec (final, agreed with product owner)

### My Space
- **One single sidebar nav item**, positioned above the organization block, not nested under any organization switcher.
- Scope: every card assigned to the current user, across **every organization and every project they belong to**, not just the currently active org.
- Route: `/my-space`
- Internal tab bar (URL controlled, `?tab=list|calendar|dashboard`), three tabs:
  1. **List / Board** — a list view with a nested internal toggle (local state, not URL param) to switch between list rows and a kanban board.
  2. **Calendar** — cards plotted by due date across all orgs/projects.
  3. **Dashboard** — personal stats summary.
- The Board sub-view groups cards by the `card_status` enum, not by per-project `lists`, because lists are project-specific and will not align across projects.
- Drag and drop on the board **directly updates `status`** on the card. It does not move the card between project-specific `lists`.

### Organization Dashboard — Central Kanban
- Added inside the existing `app/dashboard/page.jsx`, scoped to the currently active organization only (this one *does* respect `OrganizationContext`, unlike My Space).
- Shows **every card from every project inside that org**, including unassigned cards. No assignee filter.
- Grouped by `card_status` enum, same reasoning as above.
- Drag and drop directly updates `status`.

### What does NOT change
- `Today` module stays exactly as is, untouched, still org-scoped, still today-only plus history.
- Existing per-project `KanbanBoard.jsx` (grouped by `lists`) stays exactly as is. Do not modify its grouping logic. The new kanbans are separate components, not a refactor of the existing one.
- The organization switcher dropdown in the sidebar/topnav is existing functionality (`OrganizationContext.jsx`), do not rebuild it, just make sure My Space renders independently of which org is currently selected there.

---

## 🗄️ Data Layer

### New API route 1 — `app/api/my-work/route.js`

```javascript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get every organization this user belongs to
    const { data: memberships } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const orgIds = (memberships || []).map(m => m.organization_id);
    if (orgIds.length === 0) return NextResponse.json({ cards: [] });

    // 2. Get every project inside those organizations
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name, prefix, organization_id, organizations(name)')
      .in('organization_id', orgIds);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) return NextResponse.json({ cards: [] });

    // 3. Get every card assigned to this user across those projects
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*, projects(id, name, prefix, organization_id)')
      .in('project_id', projectIds)
      .eq('assignee_id', user.id) // verify real column name in Step 0
      .order('due_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('My Work API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

Notes:
- One query, reused by all three My Space tabs. Do not create three separate endpoints.
- The frontend is responsible for bucketing (List), plotting by date (Calendar), and summarizing (Dashboard), all from this same array.
- A PATCH handler should be added to this same route file (or a sibling `[cardId]/route.js`) to support status updates from drag and drop, reusing the existing card update logic already used by `KanbanBoard.jsx` where possible instead of duplicating it.

### New API route 2 — `app/api/organizations/[orgId]/central-kanban/route.js`

```javascript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyOrganizationAccess } from '@/lib/access';

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await verifyOrganizationAccess(params.orgId, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('organization_id', params.orgId);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) return NextResponse.json({ cards: [] });

    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*, projects(id, name, prefix), profiles(id, full_name, avatar_url)') // adjust to real assignee join
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Central Kanban API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

No assignee filter here, deliberately, per the confirmed spec (unassigned cards included).

---

## 🖼️ Frontend Structure

```
app/
  my-space/
    page.jsx                       ← single route, internal tab bar via ?tab=

components/myspace/
  MySpaceListBoard.jsx              ← List tab, has internal List/Board toggle (local state)
  MySpaceCalendar.jsx               ← Calendar tab
  MySpaceDashboard.jsx              ← Dashboard tab, personal stats

components/dashboard/
  OrgCentralKanban.jsx              ← New section inside app/dashboard/page.jsx
```

### `app/my-space/page.jsx`

Follow the exact pattern already used in `app/projects/[projectId]/page.jsx` for tab switching via query param. Fetch once on mount from `/api/my-work`, pass the resulting card array down to whichever tab is active. Do not refetch per tab switch, the data does not change between tabs.

```jsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import MySpaceListBoard from '@/components/myspace/MySpaceListBoard';
import MySpaceCalendar from '@/components/myspace/MySpaceCalendar';
import MySpaceDashboard from '@/components/myspace/MySpaceDashboard';
import PageSkeleton from '@/components/ui/PageSkeleton';

const TABS = [
  { id: 'list', label: 'List / Board' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function MySpacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'list';
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyWork() {
      setLoading(true);
      const res = await apiFetch('/api/my-work');
      const data = await res.json();
      setCards(data.cards || []);
      setLoading(false);
    }
    loadMyWork();
  }, []);

  function switchTab(tabId) {
    router.push(`/my-space?tab=${tabId}`);
  }

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ color: 'var(--text-heading)' }}>My Space</h1>

      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              color: activeTab === tab.id ? 'var(--accent-text)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && <MySpaceListBoard cards={cards} onCardsChange={setCards} />}
      {activeTab === 'calendar' && <MySpaceCalendar cards={cards} />}
      {activeTab === 'dashboard' && <MySpaceDashboard cards={cards} />}
    </div>
  );
}
```

### `components/myspace/MySpaceListBoard.jsx`

- Local state `viewMode` (`'list' | 'board'`), toggle button pair at top of component, not in the URL.
- **List mode**: bucket `cards` into Overdue, Today, This Week, Later, No Date, based on `due_date` compared to current date. Each row shows org name, project badge (prefix), card custom ID, title, status pill, priority pill, due date. Clicking a row opens the existing `CardDetail.jsx` modal if feasible, since that already handles cross-field editing, comments, and subtasks. Reuse it rather than building a second detail view.
- **Board mode**: group `cards` by `status` enum into five fixed columns (`backlog`, `todo`, `in_progress`, `in_review`, `done`). Use `@dnd-kit/core` and `@dnd-kit/sortable`, same libraries already in use, but write a new lightweight board component here rather than modifying `KanbanBoard.jsx`, since that component's data model is tied to per-project `lists` and should not be touched. On drop, call the PATCH endpoint on `/api/my-work` (or the dedicated card update endpoint) to update `status`, then call `onCardsChange` to update local state optimistically.

### `components/myspace/MySpaceCalendar.jsx`

Check whether `components/calendar/CalendarGrid.jsx` accepts a card array as a prop already, or whether it internally fetches its own project-scoped data. If it fetches internally, it needs a prop-driven variant, either by adding an optional `cards` prop to the existing component (preferred, avoids duplication) or by creating a new component. Plot cards by `due_date`, color code by project or org for visual distinction since cards will span multiple sources here.

### `components/myspace/MySpaceDashboard.jsx`

Small stat cards computed client-side from the `cards` prop already fetched, no separate API call needed:
- Overdue count
- Due this week count
- Total open count
- Breakdown by priority
- Breakdown by organization (useful since this view spans multiple orgs)

### `components/dashboard/OrgCentralKanban.jsx`

Same board mechanics as `MySpaceListBoard`'s board mode (status-grouped columns, drag and drop updates `status`), but fetches from `/api/organizations/[orgId]/central-kanban` instead, scoped to the currently active org via `OrganizationContext`. Mount this as a new section inside `app/dashboard/page.jsx`, below or alongside the existing dashboard stats, whichever fits the current layout best without disrupting it.

Consider extracting the shared status-column board rendering logic (column layout, drag handlers, card rendering) into a common internal component used by both `MySpaceListBoard`'s board mode and `OrgCentralKanban`, since they are functionally the same board with different data sources. This avoids writing the drag-and-drop logic twice.

---

## 🧭 Sidebar

`components/layout/Sidebar.jsx`:
- Add one new nav item, **My Space**, pointing to `/my-space`, positioned above the organization block (above wherever the org switcher/dropdown currently renders).
- Pick an icon from `lucide-react`, something like `LayoutGrid` or `UserCheck`, consistent with existing icon weight/style used for Today and Dashboard.
- This item must render regardless of which organization is active, and must not disappear or change based on `OrganizationContext` state.
- Do not touch the existing organization dropdown/switcher, it already works, leave it as is.

---

## 🔨 Build Order

1. Verify real column names in `database/schema.sql` (Step 0). Do not skip this.
2. Build and test `app/api/my-work/route.js` in isolation (curl or Postman style check) with a test user that belongs to at least two organizations, confirm cards from both come back.
3. Build `app/my-space/page.jsx` with the tab bar shell, wire up data fetching.
4. Build `MySpaceListBoard.jsx`, list mode first, then the board mode toggle.
5. Build `MySpaceCalendar.jsx`, checking `CalendarGrid.jsx` reusability first.
6. Build `MySpaceDashboard.jsx`.
7. Build `app/api/organizations/[orgId]/central-kanban/route.js`.
8. Build `OrgCentralKanban.jsx`, wire into `app/dashboard/page.jsx`.
9. Add the sidebar entry.
10. Add loading skeletons and empty states everywhere (use `PageSkeleton.jsx`, follow existing empty-state patterns from other modules).
11. Run `npm run lint` and `npm run build`, confirm both pass clean, same as prior change log entries in this project.
12. Run `npx vitest` if any tests touch shared card-fetching logic.

---

## ✅ Verification Checklist

- [ ] A user in two different organizations sees cards from both inside My Space
- [ ] Today module is completely unaffected
- [ ] Existing per-project Kanban board (`KanbanBoard.jsx`) is completely unaffected, still groups by `lists`
- [ ] My Space board mode groups by status enum, five columns, drag and drop updates status
- [ ] Org central kanban shows unassigned cards too
- [ ] Org central kanban only shows cards from the currently active organization
- [ ] Sidebar shows exactly one "My Space" entry, not three
- [ ] Organization dropdown switcher still works exactly as before
- [ ] Dark mode and light mode both render correctly (use `var(--token)` throughout, no hardcoded hex values, per PROJECT.md styling rules)
- [ ] All new API routes reject unauthenticated requests and requests without proper access

---

## 📋 Final Required Step — Update PROJECT.md

**This is not optional.** Once implementation is complete, open `PROJECT.md` and:

1. Add a new entry to the **Change Log** section at the bottom, following the exact format already established there, including agent name, date, summary, and full file list touched.
2. Add "My Space" and "Organization Central Kanban" to the **Module Feature Matrix** table.
3. Add the two new API routes to the **Project Structure** tree under `app/api/`.
4. Add `app/my-space/` to the **Project Structure** tree under `app/`.
5. Add `components/myspace/` and `components/dashboard/OrgCentralKanban.jsx` to the **Project Structure** tree under `components/`.
6. If any column names differed from what this document assumed (see Step 0), note the correction in the change log entry so future agents are not misled by this document.
7. Never delete or overwrite any existing change log entry, only append.
