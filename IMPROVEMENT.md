# Niyoplan — Improvement & To-Do Guide for AI Coding Agent

> **Project**: Niyoplan (https://niyoplan.vercel.app/) — A Next.js project management app (Jira-style).  
> **Context**: First working version complete. This document covers all UI polish, bug fixes, and new features to implement next. Every section is self-contained and actionable.

---

## Table of Contents

1. [Theme Cleanup — Remove Dark Remnants](#1-theme-cleanup--remove-dark-remnants)
2. [Sidebar Redesign — Gmail-Style Collapsible](#2-sidebar-redesign--gmail-style-collapsible)
3. [Navbar Cleanup & Fixes](#3-navbar-cleanup--fixes)
4. [Favicon & App Icon Fix](#4-favicon--app-icon-fix)
5. [User Avatar — Unique Identity System](#5-user-avatar--unique-identity-system)
6. [Profile Settings Page](#6-profile-settings-page)
7. [Project Settings — Full CRUD](#7-project-settings--full-crud)
8. [Shortcut Button — Correct Placement](#8-shortcut-button--correct-placement)
9. [Goals & OKRs — Fix "Failed to load goals" Error](#9-goals--okrs--fix-failed-to-load-goals-error)
10. [Company Onboarding Flow — Make / Join Company](#10-company-onboarding-flow--make--join-company)
11. [Company Admin Panel — Members & Approvals](#11-company-admin-panel--members--approvals)

---

## 1. Theme Cleanup — Remove Dark Remnants

**Problem**: Several pages/components still render with dark backgrounds (`bg-gray-900`, `bg-slate-800`, or similar dark Tailwind classes) even though the app has moved to a light theme. This is visible as black/dark-grey patches on otherwise white pages.

**Affected areas visible in screenshots**:
- DSM Module panel background
- Meetings page (Weekly PM Review Sheet, HR Review Sheet)
- Goals & OKRs form area
- Docs page content area
- Views & Inbox panels
- AI Tools panel
- Gantt Timeline background

**What to do**:

1. **Global audit**: Search entire codebase for these class patterns and replace with light equivalents:
   ```
   bg-gray-900     → bg-white or bg-gray-50
   bg-gray-800     → bg-white or bg-gray-50
   bg-slate-800    → bg-white or bg-gray-50
   bg-slate-900    → bg-white
   bg-zinc-900     → bg-white
   text-gray-100   → text-gray-900
   text-white (on dark bg) → text-gray-900
   border-gray-700 → border-gray-200
   ```

2. **Input fields inside dark panels** (DSM module, Meetings sheet, Goals form): Replace dark textarea/input backgrounds like `bg-gray-800` or `bg-[#1e293b]` with:
   ```css
   background: white;
   border: 1px solid #e2e8f0;
   color: #1e293b;
   ```

3. **Panel/card backgrounds**: All panel wrappers (the rounded containers in DSM, Meetings, Goals, AI Tools) should use:
   ```css
   background: #ffffff;
   border: 1px solid #e2e8f0;
   box-shadow: 0 1px 3px rgba(0,0,0,0.06);
   ```

4. **Team Grid section** (DSM Module page): Has a dark background — change to light card style.

5. **AI DSM Summary box** (right side of DSM Module): Dark panel → white card with light border.

6. **After changes**, do a visual pass through every project tab: List View, Kanban Board, Sprints & Backlog, Gantt Timeline, DSM Module, Meetings, Goals & OKRs, Docs, Views & Inbox, AI Tools — confirm no dark patches remain.

---

## 2. Sidebar Redesign — Gmail-Style Collapsible

**Problem**: Current sidebar is always-open and visually heavy. No hover-expand behavior.

**Target UX**: Like Gmail's sidebar — collapsed by default (shows only icons), expands to show icon + label when the user hovers over it. Smooth CSS transition.

**Implementation steps**:

### 2a. Structure
The sidebar should have two states:
- **Collapsed** (default): width `64px`, shows only icons centered.
- **Expanded** (on hover): width `240px`, shows icon + label with smooth slide.

```tsx
// Sidebar wrapper
<aside
  className="sidebar group"
  // Use CSS: w-16 hover:w-60 transition-all duration-300
>
```

### 2b. CSS / Tailwind
```tsx
<aside className="
  fixed left-0 top-0 h-full z-40
  w-16 hover:w-60
  transition-all duration-300 ease-in-out
  bg-white border-r border-gray-200
  flex flex-col
  overflow-hidden
">
```

### 2c. Nav items
Each nav item should have an icon and a label. The label should be hidden when collapsed and revealed on hover:

```tsx
<NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/dashboard" />

// NavItem component:
function NavItem({ icon, label, href }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
      <span className="flex-shrink-0">{icon}</span>
      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 sidebar-hover:opacity-100 transition-opacity duration-200 text-sm font-medium">
        {label}
      </span>
    </Link>
  )
}
```

> **Tip**: Use a CSS class on `<aside>` like `peer` and control label visibility with `peer-hover:opacity-100` on label spans, or use a JS `useState` with `onMouseEnter`/`onMouseLeave` on the aside element.

### 2d. Sidebar sections
Organize into logical groups with thin dividers:
```
[Logo / App Name]
─────────────────
Dashboard
Projects
─────────────────
[Active Project section — only shows when inside a project]
  Backlog
  Board
  Timeline
  DSM Module
  Meetings
  Goals & OKRs
  Docs
  AI Tools
─────────────────
Admin Settings (only for admin role)
─────────────────
[Bottom: Profile avatar + name / logout]
```

### 2e. Active state
Active route should have: `bg-blue-50 text-blue-600 font-semibold` with a `3px` left blue border or a rounded pill highlight.

### 2f. Bottom section
Pin user avatar + name + logout link to the bottom of the sidebar. When collapsed, show only avatar. On hover, show name + "Log out" option inline or in a small popover.

---

## 3. Navbar Cleanup & Fixes

**Identified problems from screenshots**:
- Help icon (❓) is present — **must be removed entirely** (icon + any associated functionality/modal).
- Notification bell (🔔) is not functional — fix or show a proper empty state.
- Dark mode toggle (🌙) appears to do nothing in light mode context — keep but ensure it works properly.
- The user avatar in the navbar uses a generic gradient color — see Section 5.

**Changes**:

### 3a. Remove Help Icon
- Delete the `<HelpCircle />` or `?` icon button from the navbar completely.
- Remove any associated tooltip, modal, or help panel component.
- Remove any keyboard shortcut that opened the help panel (e.g., `Shift + ?`).

### 3b. Fix Notification Bell
The bell icon should:
- Show a red badge dot when there are unread notifications.
- On click, open a dropdown panel (right-aligned) with:
  - Header: "Notifications"
  - List of notifications (issue created, assigned, commented, sprint started, etc.)
  - Each item: avatar + message + timestamp
  - "Mark all as read" button at top right
  - Empty state: A subtle illustration or icon + "No new notifications" when empty.
- Wire it to real data from the DB (issues assigned to user, comments on their issues, sprint events, etc.).

### 3c. Navbar final layout (left to right)
```
[App Logo]  [Projects] [Dashboards] [Settings] [+ Create]  ........  [Search] [🔔] [🌙] [Avatar]
```
No help icon. No extra icons.

### 3d. Dark mode toggle
Ensure `next-themes` or equivalent is properly wired. Clicking moon/sun should toggle and persist the preference in localStorage. Since the app is going light-first, dark mode can be kept as an option but the default should be light.

---

## 4. Favicon & App Icon Fix

**Problem**: Favicon is not showing in the browser tab.

**Fix**:

1. Create a proper favicon. Use the "N" logo from the app or a custom SVG mark. Export as:
   - `favicon.ico` (16×16, 32×32 multi-size)
   - `favicon.svg`
   - `apple-touch-icon.png` (180×180)
   - `icon-192.png`, `icon-512.png` (for PWA manifest)

2. Place all files in `/public/` directory.

3. In `app/layout.tsx` (Next.js App Router) add:
```tsx
export const metadata: Metadata = {
  title: 'Niyoplan',
  description: 'Project Management, Simplified.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}
```

4. If using `pages/_document.tsx` (Pages Router):
```tsx
<Head>
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</Head>
```

5. Hard-refresh the browser and clear cache to verify.

---

## 5. User Avatar — Unique Identity System

**Problem**: User avatars use a generic gradient circle with the first letter. Looks like every other app. Needs a distinctive identity system.

**Solution — Deterministic Geometric Avatar**:

Generate a unique geometric pattern per user using their user ID or email hash as a seed. No external library needed.

### 5a. Avatar generation approach
Use a small inline SVG generator that creates a unique 4-tile geometric pattern (like GitHub's identicons, but more modern):

```tsx
// lib/avatar.ts
export function generateAvatarSVG(seed: string): string {
  // Hash the seed string to a number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pick 2 colors from a curated palette based on hash
  const palettes = [
    ['#6366f1', '#e0e7ff'],
    ['#0ea5e9', '#e0f2fe'],
    ['#10b981', '#d1fae5'],
    ['#f59e0b', '#fef3c7'],
    ['#ef4444', '#fee2e2'],
    ['#8b5cf6', '#ede9fe'],
    ['#ec4899', '#fce7f3'],
    ['#14b8a6', '#ccfbf1'],
  ];
  const [primary, bg] = palettes[Math.abs(hash) % palettes.length];

  // Generate a 5x5 symmetric grid (like GitHub identicons)
  const cells = Array.from({ length: 15 }, (_, i) => ((hash >> i) & 1) === 1);
  // Mirror left to right for symmetry
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const mirrorCol = col < 3 ? col : 4 - col;
      return cells[row * 3 + mirrorCol];
    })
  );

  const cellSize = 20;
  const rects = grid.flatMap((row, r) =>
    row.map((filled, c) =>
      filled
        ? `<rect x="${c * cellSize + 10}" y="${r * cellSize + 10}" width="${cellSize}" height="${cellSize}" fill="${primary}" rx="2"/>`
        : ''
    )
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="${bg}"/>
    ${rects}
  </svg>`;
}

export function avatarDataUrl(seed: string): string {
  const svg = generateAvatarSVG(seed);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
```

### 5b. Usage
```tsx
// components/UserAvatar.tsx
import { avatarDataUrl } from '@/lib/avatar';

export function UserAvatar({ user, size = 32 }: { user: User; size?: number }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} className="rounded-full" width={size} height={size} alt={user.name} />;
  }
  return (
    <img
      src={avatarDataUrl(user.id || user.email)}
      className="rounded-full"
      width={size}
      height={size}
      alt={user.name}
    />
  );
}
```

### 5c. Replace all existing gradient avatar circles
Search for existing avatar rendering code (likely something like `bg-gradient-to-br from-blue-500 to-purple-600` with a letter) and replace with `<UserAvatar user={user} />`.

---

## 6. Profile Settings Page

**Problem**: No profile settings page exists. Users can only log out.

**Create route**: `/settings/profile`

**Page sections**:

### 6a. Personal Information
- Full Name (text input)
- Username / handle (text input, must be unique — validate on blur)
- Email (read-only, with "Change email" link that sends a verification)
- Bio (textarea, max 160 chars)
- Timezone (select dropdown)
- Save Changes button

### 6b. Avatar / Profile Picture
- Show current avatar (generated or uploaded)
- "Upload photo" button (accepts jpg/png, max 2MB)
- "Remove photo" link (reverts to generated avatar)
- Preview before save

### 6c. Password & Security
- Current Password
- New Password
- Confirm New Password
- Save Password button
- Show strength indicator on new password field

### 6d. Danger Zone
- "Delete Account" button — opens a confirmation dialog requiring the user to type their email to confirm.

### 6e. Navigation
Add "Profile Settings" as a clickable item in the user dropdown menu in the navbar (between account name and Log out):
```
ACCOUNT
  [avatar] dev
  ──────────────
  Profile Settings  ← new
  ──────────────
  → Log out
```

---

## 7. Project Settings — Full CRUD

**Problem**: No proper project settings page. Users cannot edit or delete projects.

**Create route**: `/projects/[projectId]/settings`

**Sub-sections (tab layout)**:

### 7a. General Settings
- Project Name (text input)
- Project Key (e.g., `TEST01` — alphanumeric, uppercase, auto-generated but editable, must be unique)
- Project Type (Software Project / Marketing / Design — dropdown)
- Description (textarea)
- Project Status toggle: Active / Archived / On Hold
- Project Icon / Color picker (choose from 8 colors + icon emoji picker)
- Save Changes button

### 7b. Members
- Table: Avatar | Name | Role | Joined | Actions
- Role options: Admin, Member, Viewer
- "Invite Member" button → opens modal with email input + role selector → sends invite email
- Remove member → confirmation dialog
- Transfer ownership → select new owner from members list

### 7c. Sprints (basic config)
- Default sprint duration: 1 week / 2 weeks / 3 weeks / 4 weeks (select)
- Sprint naming convention (text input with `{n}` placeholder)

### 7d. Danger Zone
- **Archive Project**: Hides from active view, keeps data.
- **Delete Project**: Permanently deletes all issues, sprints, goals, docs. Requires typing project name to confirm.

### 7e. Access point
- Add "Project settings" link in the sidebar (already appears to exist as `⚙ Project settings` at the bottom of the sidebar in screenshot 8 — make sure it routes correctly to `/projects/[projectId]/settings`).
- Also accessible via the three-dot menu (⋯) on the project card in the Projects list.

---

## 8. Shortcut Button — Correct Placement

**Problem**: The "Shortcuts (7)" button appears at the top right of project pages, but its placement is awkward and out of place next to the "+ Create Issue" button.

**Fix**:

1. **Remove** the `Shortcuts (7)` button from the top-right action bar of project pages.
2. **Add** a keyboard shortcut trigger in one of these better locations:
   - **Footer of the sidebar** (collapsed: `⌨` icon, expanded: `Keyboard Shortcuts`)
   - **Or** accessible via `?` keyboard shortcut only (no visible button) — pressing `?` opens the shortcut cheatsheet modal.
3. The shortcut modal should be a centered overlay with a clean 2-column list of all shortcuts grouped by category:
   ```
   Navigation          Issues
   ─────────           ──────
   G then D → Dashboard    C → Create issue
   G then P → Projects     E → Edit selected
   ...
   ```

---

## 9. Goals & OKRs — Fix "Failed to load goals" Error

**Problem**: Page shows a red error toast "Failed to load goals" (visible in screenshot 8, top right).

**Fix**:

1. Locate the API call in the Goals & OKRs component (likely a `fetch('/api/goals')` or Prisma query).
2. Add proper error handling:
   ```tsx
   const { data, error, isLoading } = useSWR(`/api/projects/${projectId}/goals`);
   
   if (error) {
     // Don't show error toast on first load if it's just empty
     // Only toast on actual network/server errors
   }
   ```
3. Check that the API route `/api/projects/[projectId]/goals` exists and handles the case where no goals exist (return `[]` not a 404 or 500).
4. The "No goals created yet." empty state text should show by default — the error toast should NOT fire just because goals array is empty.
5. Confirm DB schema has a `Goal` model linked to `projectId` and the Prisma query is correct.

---

## 10. Company Onboarding Flow — Make / Join Company

**Problem**: No company/workspace creation or joining mechanism. Users land directly in the app with no organizational structure.

**New flow — first-time user experience**:

### 10a. Onboarding trigger
After a user signs up OR logs in for the first time with no company association, redirect to `/onboarding` before showing any projects.

### 10b. Onboarding screen — `/onboarding`
A clean centered card with:
```
Welcome to Niyoplan 👋

What would you like to do?

  [🏢 Create a new company]        [🔗 Join an existing company]
  Start fresh with your team.       Enter an invite code from your admin.
```
Two large clickable cards. Single choice required.

### 10c. Create Company flow

**Route**: `/onboarding/create`

Form fields:
- Company Name (required)
- Company Slug / URL identifier (auto-generated from name, editable) — used in URLs: `niyoplan.vercel.app/org/[slug]`
- Industry (optional select: Software, Marketing, Design, Finance, Education, Other)
- Team Size (optional select: 1–10, 11–50, 51–200, 200+)
- Company Logo upload (optional, shows generated avatar fallback)

On submit:
1. Create `Organization` record in DB.
2. Create `OrganizationMember` record with role: `ADMIN` for the creator.
3. Generate a unique **Invite Code** (e.g., 8-char alphanumeric like `NYP-X9K2`) and store it on the Organization.
4. Redirect to `/dashboard` with a welcome modal: "Your company **[name]** is ready! Share this invite code with your team: **NYP-X9K2**"

### 10d. Join Company flow

**Route**: `/onboarding/join`

Form:
- Single input: "Enter Invite Code" (e.g., `NYP-X9K2`)
- Submit button: "Request to Join"

On submit:
1. Look up Organization by invite code.
2. If found: Create `OrganizationMember` record with status: `PENDING`, role: `MEMBER`.
3. Show confirmation screen: "✅ Request sent to **[Company Name]**. You'll get access once an admin approves your request."
4. Send in-app notification + email to all company admins: "[User name] has requested to join [Company Name]."
5. User sees a waiting screen on subsequent logins until approved.

### 10e. DB Schema additions

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  inviteCode  String   @unique @default(cuid()) // Generate short code
  industry    String?
  size        String?
  createdAt   DateTime @default(now())
  members     OrganizationMember[]
  projects    Project[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  role           OrgRole  @default(MEMBER)  // ADMIN | MEMBER | VIEWER
  status         MemberStatus @default(PENDING) // PENDING | ACTIVE | REJECTED
  joinedAt       DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  @@unique([userId, organizationId])
}

enum OrgRole {
  ADMIN
  MEMBER
  VIEWER
}

enum MemberStatus {
  PENDING
  ACTIVE
  REJECTED
}
```

---

## 11. Company Admin Panel — Members & Approvals

**Problem**: No admin interface for managing company members, approvals, or roles.

**New route**: `/settings/company` (visible to ADMIN role only)

### 11a. Company Settings tabs

**Tab 1: General**
- Company Name (editable)
- Company Slug (editable, with uniqueness validation)
- Company Logo (upload)
- Industry, Size
- Save button

**Tab 2: Members**

Full members table:
| Avatar | Name | Email | Role | Status | Joined | Actions |
|--------|------|-------|------|--------|--------|---------|
| [img]  | Dev  | d@... | Admin | Active | Mar 23 | — |
| [img]  | Jay  | j@... | Member | Active | Mar 21 | Change Role / Remove |

- **Pending requests section** at the top (highlighted in yellow/amber banner):
  ```
  ⚠ 2 pending join requests
  [Name] [Email]  [✅ Approve] [❌ Reject]
  ```
- Clicking Approve: sets `status = ACTIVE`, sends welcome email/notification to user.
- Clicking Reject: sets `status = REJECTED`, sends rejection notification.
- Admin can change member roles via inline dropdown.
- Admin can remove members (with confirmation dialog).

**Tab 3: Invite Code**
- Show current invite code in a styled code block with copy button.
- "Regenerate Code" button — invalidates old code, generates new one. Shows a warning: "Old code will no longer work."
- Toggle: Allow open join (auto-approve) vs. Require admin approval.

**Tab 4: Danger Zone**
- "Delete Company" — deletes organization and all associated data. Requires typing company name.

### 11b. Access control
- Wrap all admin routes with a middleware/HOC that checks `session.user.orgRole === 'ADMIN'`.
- Non-admins trying to access `/settings/company` should be redirected with a toast: "You don't have permission to access this page."
- Show "Company Settings" in the sidebar only for users with ADMIN role.

### 11c. Navbar org indicator
In the top-left of the sidebar (where "Niyoplan v2 / SOFTWARE PROJECT" appears), replace with:
```
[Org Logo]  [Company Name]
            [Plan badge if applicable]
```
Clicking it opens a small dropdown:
- Switch organization (if user is in multiple)
- Company Settings (admin only)
- Invite People

---

## Summary Checklist for Agent

| # | Task | Priority |
|---|------|----------|
| 1 | Remove all dark theme remnants from every page | 🔴 High |
| 2 | Rebuild sidebar as Gmail-style hover-expand | 🔴 High |
| 3 | Remove help icon; fix notification bell | 🔴 High |
| 4 | Fix favicon in `/public` + `metadata` | 🟡 Medium |
| 5 | Replace gradient avatars with geometric identicon system | 🟡 Medium |
| 6 | Create `/settings/profile` page with full edit capability | 🟡 Medium |
| 7 | Build `/projects/[id]/settings` with CRUD + Danger Zone | 🔴 High |
| 8 | Move Shortcuts button to sidebar footer or keyboard-only | 🟢 Low |
| 9 | Fix "Failed to load goals" API error | 🔴 High |
| 10 | Build `/onboarding` flow — create or join company | 🔴 High |
| 11 | Build Company Admin Panel with approvals + role management | 🔴 High |

---

## Notes for Agent

- **Framework**: Next.js (App Router assumed). All routes should follow `app/` directory conventions.
- **Auth**: Assume NextAuth.js or similar is set up. Session contains `user.id`, `user.email`, `user.orgRole`.
- **DB**: Assume Prisma + PostgreSQL or similar.
- **UI Library**: Tailwind CSS. Keep all new components consistent with existing Tailwind usage.
- **Notifications**: Use `sonner` or `react-hot-toast` (whichever is already in the project) for toasts.
- **State management**: Use SWR or React Query for data fetching where appropriate.
- **Do not break existing working features** while making these changes. Test each section independently.
