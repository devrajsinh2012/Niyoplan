

**TaskFlow AI**

*Feature Specification & Requirements*

Version 2.0  ·  All Features  ·  Complete Specification

**7 Feature Modules  ·  60+ Sub-Features  ·  User Stories  ·  Acceptance Criteria**

Free & Open Source  ·  Groq AI  ·  Supabase  ·  Vercel  ·  Render

# **Overview and Feature Summary**

This document is the complete feature specification for TaskFlow AI version 2.0. It lists every feature module, its constituent sub-features, user stories, acceptance criteria, and implementation status. It is intended to serve as both a product reference for users and a development backlog for contributors.

**📋  How to Read This Document:**  Features are grouped into modules (F1–F7). Each module begins with a summary table, followed by detailed sub-feature specifications, user stories, and acceptance criteria. The Status column uses: Live, Beta, In Development, or Planned.

## **Complete Feature Index**

| ID | Feature Name | Status | Priority | Module |
| :---- | :---- | :---- | :---- | :---- |
| **F1** | **Kanban Board** | **Live** | P0 | Core board experience |
| **F1.1** | **Drag-and-Drop Cards** | **Live** | P0 | Card movement between lists |
| **F1.2** | **List Management** | **Live** | P0 | Add, rename, reorder, delete lists |
| **F1.3** | **Card Detail Panel** | **Live** | P0 | Full card editor side-sheet |
| **F1.4** | **Card Labels** | **Live** | P1 | Colour-coded categorisation tags |
| **F1.5** | **Card Checklists** | **Live** | P1 | Sub-task tracking with progress bar |
| **F1.6** | **Card Attachments** | **Live** | P1 | File uploads via Supabase Storage |
| **F1.7** | **Card Templates** | **Beta** | P2 | Reusable card structure presets |
| **F1.8** | **Board Filters** | **Live** | P1 | Filter by member, label, due date |
| **F1.9** | **Compact View** | **Live** | P2 | Condensed card display mode |
| **F2** | **Gantt Chart** | **Live** | P0 | Timeline view for project tracking |
| **F2.1** | **Task Bars** | **Live** | P0 | Date-driven horizontal task bars |
| **F2.2** | **Drag-to-Resize** | **Live** | P0 | Adjust dates by dragging bar edges |
| **F2.3** | **Dependencies** | **Live** | P1 | Finish-to-start arrows between tasks |
| **F2.4** | **Zoom Levels** | **Live** | P1 | Day / Week / Month / Quarter views |
| **F2.5** | **Gantt Export** | **Beta** | P2 | PNG and CSV export of chart |
| **F3** | **DSM Module** | **Live** | P0 | Daily stand-up meeting system |
| **F3.1** | **Daily Entry Form** | **Live** | P0 | Yesterday / Today / Blockers form |
| **F3.2** | **Team Grid View** | **Live** | P0 | All-team submissions in one view |
| **F3.3** | **DSM History** | **Live** | P1 | Searchable archive of past entries |
| **F3.4** | **AI DSM Summary** | **Live** | P1 | Groq-powered narrative summary |
| **F3.5** | **Reminder Notifications** | **Live** | P2 | Configurable submission reminders |
| **F3.6** | **Mood Check** | **Beta** | P2 | Team health emoji / rating field |
| **F4** | **Weekly PM Review** | **Live** | P0 | Structured weekly meeting sheet |
| **F4.1** | **Sprint RAG Status** | **Live** | P0 | Red / Amber / Green health indicator |
| **F4.2** | **Action Item Cards** | **Live** | P0 | Auto-create board cards from actions |
| **F4.3** | **AI Meeting Summary** | **Live** | P1 | Groq-generated executive summary |
| **F4.4** | **Sheet Finalisation** | **Live** | P1 | Lock sheet and notify attendees |
| **F5** | **HR Review Sheet** | **Live** | P0 | Auto-scheduled HR follow-up sheet |
| **F5.1** | **PM Review Linking** | **Live** | P0 | Auto-pull items from PM Review |
| **F5.2** | **Attendance Overview** | **Live** | P1 | DSM submission rate per member |
| **F5.3** | **Confidential Notes** | **Live** | P1 | Role-gated encrypted HR notes |
| **F5.4** | **Auto-Scheduling** | **Live** | P0 | Draft HR sheet created day after PM Review |
| **F6** | **ClickUp Workspace** | **Live** | P1 | Extended workspace features |
| **F6.1** | **Docs Module** | **Live** | P1 | Collaborative rich-text documents |
| **F6.2** | **Goals / OKRs** | **Live** | P1 | Objective and key result tracking |
| **F6.3** | **List View** | **Live** | P1 | Sortable flat table of all cards |
| **F6.4** | **Calendar View** | **Live** | P2 | Cards on a monthly date calendar |
| **F6.5** | **Workload View** | **Beta** | P2 | Member allocation heatmap by week |
| **F6.6** | **Spaces** | **Live** | P2 | Optional project grouping layer |
| **F6.7** | **My Work View** | **Live** | P1 | Cross-project personal task view |
| **F7** | **AI (Groq)** | **Live** | P0 | All AI features via Groq API |
| **F7.1** | **Card Description Gen** | **Live** | P0 | AI-written card descriptions |
| **F7.2** | **Description Improver** | **Live** | P0 | Rewrite existing descriptions |
| **F7.3** | **Priority Suggester** | **Live** | P1 | Recommend card priority level |
| **F7.4** | **Sprint Summary** | **Live** | P1 | Sprint progress narrative |
| **F7.5** | **Risk Description** | **Beta** | P2 | Expand risk title to full description |
| **F7.6** | **Goal Progress Narrative** | **Planned** | P2 | OKR status in plain language |

**F1  Kanban Board***Trello-style drag-and-drop task management with real-time collaboration*

The Kanban Board is the primary interface for day-to-day task management. It mirrors the Trello mental model closely while adding AI-powered card assistance and real-time collaborative updates via Supabase Realtime.

## **F1 — User Stories**

As a **team member**, I want to *see all project tasks organised in workflow columns*, so that I can understand the current state of the project at a glance

As a **team member**, I want to *drag cards between columns*, so that I can update task status without leaving the board view

As a **PM**, I want to *add new columns to match our workflow*, so that the board reflects our team's actual process rather than a generic default

As a **team member**, I want to *open a card and see its full detail without leaving the board*, so that I can read and update card details while maintaining board context

As a **PM**, I want to *filter the board by team member*, so that I can see one person's workload during a one-on-one

## **F1 — Acceptance Criteria**

### **F1.1 — Drag-and-Drop Cards**

* Cards can be dragged to any position within the same list

* Cards can be dragged to any list on the board

* A ghost placeholder is visible at the card's original position during drag

* A highlighted insertion line appears at valid drop targets

* Card position updates persist to the database within 500 ms of drop

* All other users on the same board see the card movement within 2 seconds via Realtime

* Ctrl+Z within 10 seconds of a drag action reverts the move

### **F1.2 — List Management**

* Users can add a new list by clicking \+ Add List at the right of the board

* List names can be edited inline by double-clicking the header

* Lists can be reordered by dragging the list header

* The three-dot ⋯ menu provides: Rename, Move all cards, Archive, Delete, Sort, Copy

* Deleting a list with cards requires a confirmation prompt listing the number of affected cards

### **F1.3 — Card Detail Panel**

* Clicking a card opens a side-sheet without navigating to a new page

* All card fields are editable inline within the panel

* Changes are auto-saved after 1 second of inactivity in any field

* The panel displays a full activity log of all changes with timestamps and actor names

* The panel can be dismissed with the Esc key or by clicking outside it

### **F1.4 — Card Labels**

* Workspace-level label palette with at least 10 colour options

* Labels can be named and renamed by any Admin or Member

* A card can carry multiple labels simultaneously

* Labels are rendered as coloured chips on the card face on the board

* Labels can be used as filter criteria on the board filter bar

## **F1 — Technical Notes**

* Drag-and-drop implemented with @dnd-kit/core and @dnd-kit/sortable for accessibility-compliant drag interactions

* Card order persisted as a rank float (Fractional Indexing) to allow O(1) reorder operations without renumbering all siblings

* Realtime updates implemented via Supabase Realtime channels, one channel per project board

* Card detail panel is a React portal rendered outside the board DOM tree to prevent z-index conflicts

**F2  Gantt Chart***Horizontal project timeline with dependencies, progress, and drag-to-reschedule*

The Gantt Chart view transforms the project's cards into a visual timeline. It is designed for planning and progress review conversations with stakeholders who think in terms of dates and milestones rather than Kanban columns.

## **F2 — User Stories**

As a **PM**, I want to *see all project tasks on a timeline*, so that I can identify scheduling conflicts and dependencies before they become blockers

As a **PM**, I want to *drag task bar edges to reschedule*, so that I can adjust the plan in a review meeting without switching to card detail views

As a **team member**, I want to *see which tasks I am blocking and which tasks are blocking me*, so that I can prioritise my work based on downstream dependencies

As a **PM**, I want to *export the Gantt chart as an image*, so that I can include it in stakeholder presentations or status reports

## **F2 — Acceptance Criteria**

### **F2.1 — Task Bars**

* Every card with a start date and due date appears as a horizontal bar on the Gantt timeline

* Bar colour corresponds to the card's primary label colour, or to status colour if no label is set

* A darker inner fill represents checklist completion percentage (0% \= empty, 100% \= fully filled)

* Milestone cards (zero duration) are rendered as a diamond shape

### **F2.2 — Drag-to-Resize**

* Dragging the right edge of a task bar updates the card's due date in real time

* Dragging the left edge updates the card's start date

* Dragging the bar centre shifts both dates simultaneously, preserving duration

* A tooltip displaying the updated date appears near the cursor during drag

* Changes are committed to the database on mouse-up

### **F2.3 — Dependencies**

* Hovering a task bar reveals circular handles on its left and right edges

* Dragging from the right handle of Task A to any part of Task B creates a finish-to-start dependency

* A dependency arrow (curved line) is drawn from Task A's end to Task B's start

* If Task B's start date is earlier than Task A's end date, a warning badge appears on Task B

* Dependencies can be deleted by clicking the arrow and pressing Delete

## **F2 — Technical Notes**

* Gantt rendered on an HTML5 Canvas element for performance with large task counts

* Date arithmetic uses the date-fns library for reliable cross-locale handling

* Fractional Indexing used for task row ordering, consistent with the Kanban board

* PNG export uses the canvas.toDataURL() API; CSV export generates a flat file client-side

**F3  Daily Stand-Up Meeting (DSM)***Structured daily check-in with team grid view, history, and AI summaries*

The DSM module replaces the informal stand-up tradition with a purpose-built workspace that keeps stand-up data searchable, linked to board cards, and analysable by AI. It reduces meeting time while preserving the value of the daily check-in.

## **F3 — User Stories**

As a **team member**, I want to *submit my daily stand-up in under 2 minutes*, so that the stand-up ritual doesn't become a productivity drain

As a **PM**, I want to *see all team stand-ups in a single grid view*, so that I can run a remote stand-up meeting without asking each person in turn

As a **PM**, I want to *identify who has flagged blockers today*, so that I can proactively unblock the team before it impacts sprint velocity

As a **PM**, I want to *get an AI-written summary of the last two weeks of stand-ups*, so that I can prepare a retrospective or status report in minutes

As a **team member**, I want to *link specific board cards in my stand-up entries*, so that the stand-up record is traceable to actual work items

## **F3 — Acceptance Criteria**

### **F3.1 — Daily Entry Form**

* The form has three required fields: Yesterday, Today, and Blockers

* An optional Mood Check field accepts a single emoji or a 1–5 rating

* Any text in the form can reference a board card using the syntax \#CARD-ID

* Referenced cards render as linked chips; clicking navigates to the card detail

* Submitting the form when an entry already exists for today presents an Edit confirmation before overwriting

* A submitted entry is time-stamped with the server's UTC time, displayed in the user's local time zone

### **F3.2 — Team Grid View**

* The grid shows one column per active team member

* Each column displays the member's avatar, name, and today's entry (or a 'Not submitted' placeholder)

* Entry cards use a green border for on-time submissions, amber for late, grey-dashed for missing

* The 'on time' threshold is configurable by Admin (default: before 10:00 AM local time)

### **F3.3 — DSM History**

* All past entries are accessible on the History page, paginated at 30 entries per page

* Filters: by member, by date range, by 'has blocker' boolean, by free-text search

* Each historical entry links back to the project's board state on that date (read-only snapshot)

### **F3.4 — AI DSM Summary**

* The Generate Summary button sends the last N entries (default 10 days, configurable) to the Groq API

* The Groq model returns a narrative paragraph covering: completed work, blockers encountered, recurring themes, and team activity level

* The summary is displayed in a modal with a Copy to Clipboard button

* The raw Groq API response is logged server-side for debugging; no PII is stored in the log

## **F3 — Technical Notes**

* DSM entries stored in the dsm\_entries table with foreign keys to user and project

* Realtime subscription on dsm\_entries allows the team grid view to update live as members submit

* The AI summary endpoint batches entry text and sends it as a single user message; the system prompt instructs the model to produce a structured narrative rather than a list

**F4  Weekly PM Review Sheet***Structured meeting record with RAG status, decisions, risks, and action item integration*

The Weekly PM Review Sheet provides a formal record of the weekly review meeting between the Project Manager and the team. Every section is designed to generate actionable outputs — not just minutes that sit unread in a folder.

## **F4 — User Stories**

As a **PM**, I want to *fill in a structured meeting sheet during the review*, so that all decisions and actions are captured in a consistent format without extra effort

As a **PM**, I want to *have action items automatically create board cards*, so that no actions fall through the gap between the meeting record and the actual work board

As a **team member**, I want to *see the finalised meeting sheet*, so that I know exactly what was decided and what I am expected to do next

As a **PM**, I want to *generate an AI summary of the meeting before sending it to stakeholders*, so that I don't spend 30 minutes writing up meeting notes after a long review session

## **F4 — Acceptance Criteria**

### **F4.1 — Sprint RAG Status**

* The sheet contains a single-field RAG selector with three options: Green (On Track), Amber (At Risk), Red (Off Track)

* The selected status is displayed as a coloured indicator on the Meeting Calendar entry

* Historic RAG status is preserved on archived sheets; a sprint health trend chart is shown on the project dashboard

### **F4.2 — Action Item to Card Integration**

* Each action item in the sheet has: description, owner (project member), due date, and a Create Card toggle

* When Create Card is enabled and the sheet is saved, a card is created in the To Do list of the project board

* The created card is tagged with the label 'Meeting Action', assigned to the specified owner, and given the specified due date

* The sheet action item displays a link to the created card once it exists

### **F4.3 — AI Meeting Summary**

* The Generate Summary button is available on any sheet that has at least one section filled in

* The button is disabled and shows a tooltip if no Groq API key is configured

* The Groq API is called with a prompt containing all filled sheet sections; the model returns a 150–250 word executive summary

* The summary is placed in an editable text area so the PM can refine before copying

### **F4.4 — Sheet Finalisation**

* The Finalise Sheet button locks all fields from further editing

* Admin users retain an Unlock Sheet option for post-finalisation corrections

* On finalisation, a notification is sent to all listed attendees with a link to the sheet

* The HR Review draft sheet for the following day is created automatically upon finalisation

## **F4 — Technical Notes**

* Sheets stored in meeting\_sheets table with a type column differentiating PM Review and HR Review

* Action item creation uses a server-side webhook triggered by sheet save events

* Sheet locking implemented via a locked\_at timestamp column; the API rejects write requests if this field is populated and the requestor is not Admin

**F5  HR Review Sheet***Auto-scheduled, role-gated follow-up sheet linked to the Weekly PM Review*

The HR Review Sheet is automatically created the day after each Weekly PM Review is finalised. It provides HR stakeholders with a structured view of team health, attendance, and any personnel-related items surfaced in the PM Review — without requiring them to read the full PM document.

## **F5 — User Stories**

As a **HR manager**, I want to *receive a draft HR Review sheet automatically after the PM Review is finalised*, so that I don't have to manually create a sheet or dig through the PM's document for relevant items

As a **HR manager**, I want to *see a summary of the team's DSM mood data for the week*, so that I can identify team health trends without reading 70 individual stand-up entries

As a **HR manager**, I want to *add confidential notes that only HR-role users can see*, so that I can record sensitive observations without them being visible to the whole team

As a **PM**, I want to *know that relevant HR items from my review have been forwarded to HR automatically*, so that I don't need to copy-paste information between two separate systems

## **F5 — Acceptance Criteria**

### **F5.1 — PM Review Linking**

* The HR sheet header displays the linked PM Review ID and date with a clickable link

* Risks and action items from the PM Review that are tagged with the 'HR' category are automatically copied into the 'Items from PM Review' section

* The linked PM Review items are read-only in the HR sheet; editing must occur in the original PM sheet

### **F5.2 — Attendance Overview**

* A table shows each team member, their number of DSM submissions in the past 7 days, and their submission rate as a percentage

* Members with a submission rate below a configurable threshold (default 60%) are highlighted in amber

* The table is auto-populated from DSM data; HR cannot manually edit these figures

### **F5.3 — Confidential Notes**

* The Confidential Notes section is hidden from all users except those with the HR or Admin role

* Confidential note content is encrypted at rest using AES-256 via a server-side encryption key stored as a Render environment variable

* Attempting to access a sheet's confidential notes without the HR or Admin role returns a 403 Forbidden response

### **F5.4 — Auto-Scheduling**

* When a PM Review sheet is finalised, the system creates a draft HR sheet dated for the following calendar day

* A notification is sent to all HR-role users in the workspace containing a link to the new draft

* If the following day falls on a weekend, the draft is dated for the following Monday, with a note indicating the PM Review date

**F6  ClickUp-Inspired Workspace***Docs, Goals/OKRs, Custom Views, Spaces, Inbox, and multi-view task management*

The workspace features extend TaskFlow AI from a pure task tracker into a more holistic team collaboration environment. Each feature is deliberately scoped to remain lightweight — providing genuine utility without the complexity overhead that makes enterprise tools unwieldy.

## **F6 — User Stories**

As a **PM**, I want to *write a project brief in the same tool I use to manage tasks*, so that I don't context-switch to Google Docs or Notion for written content

As a **team lead**, I want to *define OKRs and link them to board cards*, so that I can connect daily work to strategic outcomes

As a **team member**, I want to *see all cards assigned to me across all projects in one view*, so that I can start my day with a clear picture of my commitments without checking each project separately

As a **PM**, I want to *see which team members are overloaded this week*, so that I can redistribute work before someone burns out or misses a deadline

## **F6 — Sub-Feature Acceptance Criteria**

### **F6.1 — Docs Module**

* Each project has a Docs section accessible from the project sidebar

* Documents support: headings (H1–H3), bold, italic, inline code, code blocks, bullet lists, numbered lists, blockquotes, and hyperlinks

* Typing / on an empty line opens a block-type picker (slash command menu)

* Typing /card in a document opens a card search; selecting a card inserts a live card preview block

* Two or more users editing the same document simultaneously see each other's cursors in real time

* Every edit is recorded in the document version history; any version can be restored

### **F6.2 — Goals and OKRs**

* Goals are created at the workspace or project level

* Each goal has: a title, an owner, a due date, and 1–5 key results

* Key results support four measurement types: percentage (0–100%), number (start → target), boolean (not done / done), and currency

* Linking a card to a key result causes the card's Done status to contribute to key result progress

* A goal's overall progress is the average of its key results' individual progress values

### **F6.3 — List View**

* The List View displays all cards in the project as a flat, scrollable table

* Visible columns: Card ID, Title, Status, Assignee, Priority, Due Date, Labels, Sprint, Created Date

* Any column can be sorted ascending or descending by clicking the column header

* The same filter controls available on the Kanban board apply to the List View

* Clicking a row opens the card detail panel

### **F6.5 — Workload View**

* The Workload View shows a grid of team members (rows) against weeks (columns)

* Each cell shows the number of cards due in that week for that member

* Cells with more than a configurable threshold of cards (default: 5\) are highlighted in amber

* Clicking a cell opens a filtered List View showing the specific cards for that member and week

**F7  AI Features — Powered by Groq***Eight intelligent productivity tools using the Groq API with Llama 3 and Mixtral models*

All AI features in TaskFlow AI are powered by the Groq API. Groq provides inference on open-weight models at industry-leading speeds with a generous free tier — no credit card required. AI features are entirely optional and gracefully degrade when no API key is configured.

## **F7 — AI Feature Specifications**

| Feature | Trigger | Output |
| :---- | :---- | :---- |
| Card Description Gen | Click Generate Description in card detail | Structured description: summary, acceptance criteria, implementation notes |
| Description Improver | Click Improve Description when description exists | Rewritten description in editable diff view; user accepts or rejects changes |
| Priority Suggester | Leave priority blank; badge appears on save | Recommended priority (Urgent/High/Medium/Low) with a one-sentence rationale |
| Sprint Summary | Click Generate Summary in Sprint view | 150–250 word narrative of sprint progress, blockers, and projected completion |
| DSM AI Summary | Click Generate Summary on DSM History page | Narrative covering completed work, blockers, themes, and velocity over selected period |
| Meeting Summary | Click Generate Summary in PM Review sheet | Executive summary paragraph of the meeting, ready to share or email |
| Risk Description | Click Expand in PM Review risk table row | Full risk description with likelihood, impact assessment, and mitigation options |
| Goal Narrative | Click Generate Narrative on a Goal detail page | Plain-language OKR progress paragraph for stakeholder reporting |

## **F7 — Acceptance Criteria**

* All AI requests are proxied through the backend; the Groq API key is never exposed to the client

* AI buttons display a loading spinner during the API call and are disabled to prevent duplicate requests

* If the Groq API returns an error, a user-facing toast notification describes the issue in plain language (e.g., 'AI is temporarily unavailable — please try again in a moment')

* If no GROQ\_API\_KEY is configured, all AI buttons are visible but disabled with a tooltip reading 'AI features require a Groq API key — see documentation'

* Generated content is always placed in an editable field; it is never saved automatically

* A Regenerate button allows users to request a new AI response if the first output is unsatisfactory

* AI responses are streamed to the UI using server-sent events for perceived performance; the user sees text appearing progressively rather than waiting for the full response

## **F7 — Groq Model Configuration**

| Model | Context Window | Best Used For |
| :---- | :---- | :---- |
| llama3-70b-8192 (recommended) | 8,192 tokens | Card descriptions, meeting summaries, sprint reports |
| llama3-8b-8192 | 8,192 tokens | Priority suggestions, quick rewrites (faster but lighter output) |
| mixtral-8x7b-32768 | 32,768 tokens | DSM history summaries with large volumes of entries |

# **Roles and Permissions Matrix**

TaskFlow AI implements role-based access control at the workspace, project, and feature level. The following matrix defines what each role can do across all feature modules.

| Action | Admin | PM | Member | Viewer |
| :---- | :---: | :---: | :---: | :---: |
| Create / delete projects | **✓** | **✓** | ✗ | ✗ |
| Invite / remove members | **✓** | **✓** | ✗ | ✗ |
| Create and edit cards | **✓** | **✓** | **✓** | ✗ |
| Move cards on board | **✓** | **✓** | **✓** | ✗ |
| Create and manage lists | **✓** | **✓** | ✗ | ✗ |
| Start and complete sprints | **✓** | **✓** | ✗ | ✗ |
| Create PM Review sheet | **✓** | **✓** | ✗ | ✗ |
| View PM Review sheet | **✓** | **✓** | **✓** | ✗ |
| View HR Review sheet | **✓** | ✗ | ✗ | ✗ |
| Access HR confidential notes | **✓** | ✗ | ✗ | ✗ |
| Submit DSM entry | **✓** | **✓** | **✓** | ✗ |
| View DSM grid | **✓** | **✓** | **✓** | ✗ |
| Generate AI content | **✓** | **✓** | **✓** | ✗ |
| Manage workspace settings | **✓** | ✗ | ✗ | ✗ |
| Create / edit Docs | **✓** | **✓** | **✓** | ✗ |
| Create Goals / OKRs | **✓** | **✓** | ✗ | ✗ |
| View all content | **✓** | **✓** | **✓** | **✓** |

# **Development Backlog and Roadmap**

The following features are identified for future development. Priority is assigned based on user demand, implementation complexity, and alignment with the tool's personal-use scope.

## **Priority Definitions**

* P0 — Must have. Core functionality. Blocking other features.

* P1 — Should have. High-value improvement. Will be included in the next release.

* P2 — Nice to have. Quality-of-life improvement. Scheduled for a future release.

* P3 — Wishlist. Valuable but complex. Community contribution welcome.

## **Planned Features**

| Feature | Priority | Description |
| :---- | :---- | :---- |
| Email Notifications | P1 | Transactional emails for mentions, assignments, and due date reminders. Requires an SMTP or Resend.com integration. |
| Dark Mode | P1 | A complete dark theme using CSS custom property overrides on \[data-theme='dark'\]. |
| Time Tracking | P2 | Manual time log entries per card. Daily and weekly totals per member. CSV export for invoicing. |
| Burndown Charts | P2 | Sprint burndown visualisation on the sprint detail page. Points or card count on Y-axis; days on X-axis. |
| GitHub / GitLab Webhooks | P2 | Link commits and PRs to cards via card ID in commit messages. Automatically moves cards on PR merge. |
| Custom Workflows | P2 | Admin-configurable list names and order per project, replacing the default four-column structure. |
| Recurring Cards | P3 | Cards that automatically recreate themselves on a configurable schedule (daily, weekly, monthly). |
| API Webhooks (Outbound) | P3 | Configurable outbound webhooks triggered by card events. Enables Zapier / Make integrations. |
| Mobile App (React Native) | P3 | Native mobile application for iOS and Android. Community contribution project. |

# **Glossary**

| Term | Definition |
| :---- | :---- |
| Card | The atomic unit of work. Equivalent to a Jira Issue or Trello Card. Contains title, description, metadata, and comments. |
| DSM | Daily Stand-Up Meeting. A short daily check-in where team members share what they did yesterday, plan for today, and flag blockers. |
| Epic | A large card that groups related child cards. Epics span multiple sprints and represent a significant feature or theme. |
| Fractional Indexing | A technique for ordering items in a list where each item holds a floating-point rank, enabling O(1) reorder operations. |
| Groq | An AI inference provider offering fast, free-tier access to open-weight models including Llama 3 and Mixtral via an OpenAI-compatible API. |
| HR Review | A structured meeting sheet for the HR stakeholder, auto-scheduled for the day after each Weekly PM Review is finalised. |
| List | A vertical column on the Kanban board representing a workflow stage (e.g., To Do, In Progress, Done). |
| OKR | Objective and Key Result. A goal-setting framework where an Objective is a qualitative goal and Key Results are measurable outcomes. |
| PM | Project Manager. In TaskFlow AI, the PM role has elevated permissions for creating meeting sheets and starting sprints. |
| RAG Status | Red / Amber / Green. A traffic-light indicator used in the PM Review sheet to communicate sprint health at a glance. |
| RLS | Row-Level Security. A PostgreSQL feature used by Supabase to enforce per-user data access rules at the database level. |
| Sprint | A time-boxed period (typically 1–2 weeks) during which the team commits to completing a defined set of cards from the backlog. |
| Supabase | An open-source Firebase alternative providing a PostgreSQL database, authentication, file storage, and realtime subscriptions. |

