

**TaskFlow AI**

*Open-Source AI-Enhanced Project Management Suite*

Complete Product Documentation  ·  Version 2.0

**Kanban Board  ·  Gantt Chart  ·  DSM  ·  Meeting Reviews  ·  AI via Groq  ·  100% Free**

Powered by Supabase  ·  Vercel  ·  Render  ·  Groq API

# **1\. Introduction**

TaskFlow AI is a free, open-source project management suite that combines the visual familiarity of Trello-style Kanban boards with the structural depth of ClickUp, the timeline clarity of a Gantt chart, and a full suite of AI-powered productivity features — all running at zero cost on free-tier cloud infrastructure.

Version 2.0 introduces five major feature additions: a full drag-and-drop Kanban Board, a Gantt Chart timeline view, a Daily Stand-Up Meeting (DSM) module, structured Weekly PM Review and HR Review meeting sheets, and a ClickUp-inspired workspace layer for documents, goals, and custom views. The AI engine has been unified to use the Groq API — the fastest and most accessible free-tier AI provider available.

**✅  Completely Free:**  Every feature described in this document runs on free-tier infrastructure. No credit card. No trial period. No hidden costs. This is the core commitment of TaskFlow AI.

## **1.1  Who Is TaskFlow AI For?**

* Individual developers and freelancers tracking personal projects

* Small teams of up to approximately 15 members

* Student teams working on coursework, capstones, or hackathons

* Startups in early stages who need structure without SaaS subscription costs

* Technical project managers who want a self-hosted, customisable tool

## **1.2  What Is New in Version 2.0?**

| New Feature | Summary |
| :---- | :---- |
| Kanban Board (Trello-style) | Full drag-and-drop card and list management with real-time sync. |
| Gantt Chart View | Horizontal timeline with drag-to-resize bars, dependencies, and progress fill. |
| DSM Module | Daily stand-up entry, team grid view, blocker tracking, and AI summaries. |
| Weekly PM Review Sheet | Structured meeting record with action item → board card integration. |
| HR Review Sheet | Auto-scheduled follow-up sheet linked to the PM Review, with role-gated access. |
| ClickUp Workspace Features | Docs, Goals/OKRs, Custom Views (List, Calendar, Workload), Spaces. |
| Groq AI Integration | All AI features now use the Groq API. Free tier, no credit card required. |

# **2\. Core Concepts**

Understanding the hierarchy and terminology of TaskFlow AI makes the rest of the documentation easier to navigate. The application organises work in a simple top-to-bottom structure.

| Level | Description |
| :---- | :---- |
| Workspace | The top-level container for an organisation or individual. Users, billing (none), and global settings live here. |
| Space | An optional grouping layer for related projects (e.g., a Product space, a Marketing space). |
| Project | A bounded scope of work. Each project has its own board, backlog, sprints, Gantt view, DSM, meeting sheets, docs, and goals. |
| List (Column) | A workflow stage within the Kanban board. Lists are project-specific and fully configurable. |
| Card | The atomic unit of work. Equivalent to a Jira issue or Trello card. Lives in a list and can appear on the Gantt chart. |
| Epic | A large container card that groups related cards. Epics span lists and sprints. |
| Sprint | A time-boxed period. Cards are assigned to sprints from the backlog for focused execution. |

# **3\. Navigation and Interface**

TaskFlow AI uses a consistent three-panel layout across all views. Understanding this layout makes it easy to find any feature in the application.

## **3.1  Application Layout**

* Global Sidebar (far left, 56px) — workspace switcher, profile menu, inbox, and settings

* Project Sidebar (second from left, 240px) — project navigation: Board, Gantt, Backlog, Sprints, DSM, Meetings, Docs, Goals

* Main Content Area (remaining width) — the active view

## **3.2  Universal Keyboard Shortcuts**

| Shortcut | Action |
| :---- | :---- |
| C | Create a new card (within a project) |
| Shift+D | Open the DSM entry form for today |
| Shift+M | Open the Meetings section for the current project |
| Ctrl+K  /  Cmd+K | Open global search and command palette |
| G then B | Navigate to Board view |
| G then G | Navigate to Gantt view |
| Esc | Close any open modal, panel, or popover |
| ? | Open the keyboard shortcuts reference overlay |

# **4\. Kanban Board — Trello-Style Task Management**

The Kanban Board is the visual heart of TaskFlow AI. Modelled closely on the Trello board experience, it gives every project a drag-and-drop workspace where work items — called Cards — are organised into columns representing their current state. The board is collaborative and live: changes made by any team member appear instantly for all other users in the same project.

## **4.1  Board Anatomy**

A board consists of three core elements: Lists (columns), Cards (individual tasks), and the Board Canvas itself. Each project has exactly one board, though the lists within it are fully configurable.

| Element | Description |
| :---- | :---- |
| Board Canvas | The full-width workspace that contains all lists side by side. Scrolls horizontally when lists exceed the viewport width. |
| List (Column) | A named vertical lane representing a workflow stage. Default lists are To Do, In Progress, In Review, and Done. Lists can be renamed, reordered, and deleted. |
| Card | A single work item within a list. Cards hold a title, description, labels, assignees, due dates, checklists, attachments, and comments. |
| Quick-Add Bar | A persistent \+ Add a card button at the bottom of each list for fast card creation without opening a modal. |
| Board Header | Contains the project name, member avatars, filter controls, and the Add List button. |

## **4.2  Lists — Creating and Managing Columns**

Lists define the shape of your workflow. TaskFlow AI ships with four default lists for new projects, but these can be changed at any time to match your team's process.

### **Adding a New List**

1. Click the \+ Add List button at the far right of the board canvas.

2. Type a name for the list (e.g., Blocked, QA, Staging, Released).

3. Press Enter or click Add List to confirm.

### **Reordering Lists**

Lists can be reordered by clicking and holding the list header, then dragging it left or right to the desired position. All cards within the list move with it. Other lists shift automatically to accommodate the move.

### **List Actions Menu**

Every list has a three-dot ⋯ menu in its header. From this menu you can: rename the list, move all cards to another list, archive the list, delete the list, sort cards by due date or assignee, and copy the list to another project.

## **4.3  Cards — Creating, Editing, and Managing**

Cards are the primary unit of work on the board. Each card is a rich object that can carry as much or as little information as your team needs.

### **Creating a Card**

4. Click \+ Add a card at the bottom of any list.

5. Type the card title in the inline text field.

6. Press Enter to create and immediately start a new card, or click Add Card to create and close.

7. For richer cards, click the Edit icon on hover before confirming to open the full card creation modal.

### **Card Detail View**

Clicking on any card opens the Card Detail panel — a side-sheet that slides in from the right without navigating away from the board. The detail view contains:

* Title — editable inline by clicking it

* Description — supports full Markdown: bold, italic, code blocks, checklists, bullet lists, and hyperlinks

* Labels — colour-coded tags for categorisation (e.g., Bug, Feature, Design, Urgent). Labels are project-scoped and reusable.

* Members — assign one or more team members to the card

* Due Date — a date (and optional time) picker. Overdue cards display a red date badge on the board

* Checklist — one or more named checklists with individual checkable items and a progress bar

* Attachments — file uploads stored in Supabase Storage (images preview inline)

* Cover Image — any attached image can be promoted to a card cover, displayed as a coloured banner on the board face

* Comments — threaded discussion with Markdown support and @mention notifications

* Activity Log — a timestamped record of every change ever made to the card

* AI Generate — request an AI-written description or acceptance criteria via the Groq-powered assistant

### **Drag-and-Drop Behaviour**

Cards can be dragged between any lists on the board and reordered within a list. The drag interaction follows standard Trello conventions:

* Click and hold a card face for 150 ms to initiate a drag

* A ghost placeholder remains in the card's original position while dragging

* Drop targets highlight with a blue insertion line as the card passes over valid positions

* Releasing the card moves it instantly and syncs the change to all connected users via Supabase Realtime

* Undo the last card move with Ctrl+Z within 10 seconds of the action

### **Card Quick Actions**

Hovering over a card on the board surface reveals a set of quick-action icons without needing to open the full detail view:

* Pencil — edit the card title inline

* Label icon — toggle label assignment from a popover

* Member icon — assign or unassign a team member

* Clock — set or clear a due date

* Archive icon — archive the card (removes it from the board without deleting)

## **4.4  Board Filters and View Options**

The board toolbar provides a set of filters that narrow the visible cards without removing them from the board. Active filters are indicated by a coloured badge on the filter button. Multiple filters compose with AND logic.

* Filter by Member — show only cards assigned to selected members

* Filter by Label — show only cards carrying selected labels

* Filter by Due Date — show cards due today, this week, or overdue

* Search — a live text search that dims non-matching cards

A Toggle Compact View option in the board toolbar reduces card padding and hides cover images and member avatars, fitting more cards in the viewport — useful during sprint reviews or stakeholder demos.

## **4.5  Card Templates**

Frequently-used card structures — such as bug report templates or feature request templates — can be saved as Card Templates. When creating a new card, a Use Template button applies a saved template's description, checklist, and labels to the new card, saving setup time on repetitive work types.

# **5\. Gantt Chart — Project Timeline View**

The Gantt Chart view provides a horizontal timeline representation of all tasks within a project, showing start dates, end dates, durations, and dependencies at a glance. It is accessible from the project sidebar under Views \> Timeline and is designed to complement — not replace — the Kanban Board.

## **5.1  Understanding the Gantt Layout**

The Gantt view is divided into two panels. The left panel is a scrollable task list showing the card title, assignee avatar, and status badge for each item. The right panel is the timeline grid, where each card is rendered as a horizontal bar spanning its start and end dates. The two panels scroll vertically in sync.

| Component | Description |
| :---- | :---- |
| Timeline Header | Date axis showing days, weeks, or months depending on the zoom level. Today is highlighted with a vertical orange line. |
| Task Bar | A coloured horizontal bar for each card. Colour corresponds to the card's label or status. Width represents duration. |
| Milestone Diamond | A diamond marker on the timeline for zero-duration milestone cards. |
| Dependency Arrow | A curved arrow drawn from one task bar to another, indicating a finish-to-start dependency. |
| Progress Fill | A darker inner fill within the task bar representing checklist completion percentage. |
| Group Row | Cards grouped by Epic or Sprint appear under collapsible group headers with a summary bar spanning the group. |

## **5.2  Setting Dates on Cards**

The Gantt chart is driven by the Start Date and Due Date fields on each card. These fields are set via the Card Detail panel or by directly interacting with the Gantt timeline:

* Drag the left edge of a task bar to adjust its start date

* Drag the right edge to adjust its due date

* Drag the centre of a task bar to move the entire date range without changing the duration

* Click an empty area of the timeline row to set a start date for a card that has none

## **5.3  Dependencies**

Task dependencies communicate sequencing constraints — that one task cannot start until another is finished. Dependencies are visualised as arrows on the Gantt chart and generate automatic warnings when a dependent task's start date is earlier than its predecessor's end date.

### **Adding a Dependency**

8. On the Gantt chart, hover over a task bar until small circular handles appear on its left and right edges.

9. Click and drag from the right-edge handle of the predecessor task.

10. Drop onto any other task bar to create a finish-to-start dependency.

11. The dependency arrow is drawn immediately. A warning badge appears if the dates create a conflict.

## **5.4  Zoom Levels and Navigation**

* Day view — each column represents one day. Best for detailed short-term planning.

* Week view — each column represents one week. The default view for most projects.

* Month view — each column represents one month. Best for high-level roadmap planning.

* Quarter view — each column represents one quarter. Suitable for long-range annual planning.

Use the mouse wheel or pinch gesture to zoom between levels. Click Today in the toolbar to scroll the timeline to the current date. The Jump to Date picker allows navigation to any specific date.

## **5.5  Exporting the Gantt Chart**

The Gantt chart can be exported in two formats from the Export button in the chart toolbar:

* PNG — a snapshot of the current view at the current zoom level. Useful for quick sharing in documents or presentations.

* CSV — a flat file containing all tasks with their start dates, end dates, assignees, and status. Suitable for import into external tools.

# **6\. Daily Stand-Up Meeting (DSM) Module**

The DSM module provides a structured daily check-in workspace for Agile or Scrum-style teams. It replaces the informal Slack thread or shared document that teams typically cobble together for stand-ups, offering a purpose-built interface that keeps stand-up data organised, searchable, and linked to actual board cards.

## **6.1  What Is a DSM Entry?**

Each day, team members submit a DSM Entry — a brief structured update covering three standard stand-up questions, plus an optional blockers field. The entry takes under two minutes to complete and is permanently archived for retrospective reference.

| Field | Guidance |
| :---- | :---- |
| Yesterday | What did you complete yesterday? Link specific cards from the board for traceability. |
| Today | What are you planning to work on today? Link or create cards directly from this field. |
| Blockers | Is anything preventing you from progressing? Tag a team member or the PM to flag it visibly. |
| Mood Check (optional) | A single emoji or 1–5 rating for team health monitoring. Data feeds into the Team Pulse dashboard. |
| Submitted At | Auto-filled with the current timestamp when the entry is saved. |

## **6.2  Submitting a DSM Entry**

12. Navigate to a project and click DSM in the left sidebar, or use the keyboard shortcut Shift+D.

13. The DSM form for today opens automatically. If an entry has already been submitted today, it is displayed with an Edit option.

14. Complete the Yesterday, Today, and Blockers fields. Use @username to mention a team member in a blocker.

15. Click Submit Stand-Up. The entry is posted to the team's daily view and a notification is sent to the PM.

**⏰  Reminder Window:**  Admins can configure an automated reminder notification that prompts team members to submit their DSM between a configurable time window (e.g., 9:00 AM – 10:00 AM). Members who have not submitted by the reminder time receive an in-app alert.

## **6.3  The DSM Board View**

The DSM Board View shows all team members' stand-up entries for the current day in a grid. Each member has a column, and their entry is displayed as a card. This mirrors the format of an in-person stand-up where the whole team's status is visible at once.

Entry cards use a colour system to communicate submission status at a glance:

* Green border — entry submitted on time

* Amber border — entry submitted late (after the configured reminder window)

* Grey border with dashed outline — no entry submitted yet today

## **6.4  DSM History and Search**

All DSM entries are stored permanently and accessible via the DSM History page. Entries can be filtered by:

* Team member

* Date range

* Presence of a blocker (shows only entries that flagged blockers)

* Full-text search across all entry content

The AI Summary button on the DSM History page sends the last N entries (configurable, default 10 days) to the Groq AI model and returns a narrative paragraph summarising team activity, recurring blockers, and velocity trends.

# **7\. Meeting Review Sheets**

TaskFlow AI includes two structured meeting review modules tailored to a common team rhythm: a weekly review with the Project Manager (PM), and a follow-up HR session the next day. Both modules use a consistent sheet-based interface that allows meeting records to be created, completed live during the meeting, and archived for future reference.

## **7.1  Weekly PM Review Sheet**

The Weekly PM Review is a structured one-page document that captures the discussion, decisions, and action items from a regular weekly review meeting between the PM and the team or individual contributors.

### **Sheet Structure**

Each Weekly PM Review sheet contains the following sections, which the PM or a designated note-taker fills in during or immediately after the meeting:

| Section | Content |
| :---- | :---- |
| Meeting Header | Auto-filled: date, week number, project name, attendees, and meeting duration. |
| Sprint Health | RAG status (Red/Amber/Green) for the current sprint: on track, at risk, or off track. |
| Progress Summary | A brief narrative or bullet list of what was accomplished since the last review. |
| Key Decisions | A numbered list of decisions made during the meeting, each with a decision owner. |
| Risks and Issues | New or updated risks. Each risk has a description, likelihood, impact, and mitigation owner. |
| Action Items | Tasks arising from the meeting. Each action item links to a board card or creates one on save. |
| Next Meeting Date | Auto-suggested as 7 days from today, editable. |
| PM Sign-Off | A digital acknowledgement field for the PM to mark the sheet as reviewed. |

### **Creating a Weekly PM Review Sheet**

16. Navigate to Meetings \> Weekly PM Review in the project sidebar.

17. Click \+ New Review Sheet. The sheet for the current week is created automatically if none exists, or a new manual sheet can be created for any date.

18. Fill in each section during the meeting. All changes are auto-saved every 30 seconds.

19. Click Finalise Sheet when complete. The sheet is locked from further edits (except by Admin) and a summary notification is sent to all attendees.

### **Action Item Integration**

When an action item is added to the PM Review sheet, a linked card is automatically created on the Kanban board in the To Do list, assigned to the named action owner, and tagged with the label Meeting Action. This ensures no discussion outcomes fall through the cracks between the meeting room and the board.

**💡  AI Meeting Summary:**  Clicking Generate Summary before finalising the sheet sends all filled sections to the Groq AI and returns a concise executive-style paragraph summarising the meeting outcomes. This can be pasted directly into a team email or Slack message.

## **7.2  HR Review Sheet**

The HR Review sheet is automatically scheduled for the day following each Weekly PM Review. It serves as a companion document for the HR stakeholder to review team health, attendance, performance notes, and any HR-related actions arising from the PM review.

### **Relationship to the PM Review**

The HR Review sheet is linked to its preceding PM Review. Relevant items from the PM Review — such as flagged risks related to personnel, blockers attributed to resource issues, or action items with an HR owner — are automatically surfaced in the HR sheet as pre-filled context. The HR reviewer does not need to re-read the PM sheet; the system extracts what is relevant.

### **HR Sheet Structure**

| Section | Content |
| :---- | :---- |
| Header | Date (auto-set to day after PM Review), attendees, linked PM Review reference. |
| Team Pulse Summary | Aggregated mood data from the DSM module for the past week. Displayed as a simple bar chart. |
| Attendance Overview | A table of team members, their DSM submission rate for the week, and any noted absences. |
| Performance Notes | Free-text notes section for HR to record observations. This section is visible only to Admin and HR roles. |
| Items from PM Review | Auto-populated list of relevant items flagged in the preceding PM Review for HR attention. |
| HR Action Items | New actions for HR, each linked to a board card or HR-specific task. |
| Confidential Notes | A separate encrypted field for sensitive HR notes, accessible only to the HR role. |

### **Scheduling and Notifications**

When a PM Review sheet is finalised, the system automatically creates a draft HR Review sheet dated for the following day and sends a notification to all users assigned the HR role in the workspace. The notification includes a link to the new draft sheet and a summary of the items pulled from the PM Review.

**🔒  Privacy Note:**  HR Review sheets and their confidential notes fields are strictly role-gated. Members and Viewers cannot access HR Review content. Only Admin and HR-role users can view, edit, or export these sheets.

## **7.3  Meeting Calendar**

A Meeting Calendar view in the sidebar aggregates all scheduled PM Reviews and HR Reviews into a visual monthly calendar. Clicking any calendar event opens the corresponding sheet directly. Past meetings with action items that remain open are highlighted in amber as a nudge to follow up.

# **8\. ClickUp-Inspired Workspace Features**

Drawing inspiration from ClickUp's unified workspace philosophy, TaskFlow AI includes a set of productivity features that extend beyond issue tracking — bringing documents, goals, custom views, and team workspaces into a single coherent interface.

## **8.1  Docs — Collaborative Documentation**

The Docs module provides a lightweight collaborative document editor within each project. Docs are suitable for project briefs, technical specifications, onboarding guides, retrospective notes, or any structured written content the team needs to share.

* Rich text editing with Markdown shortcuts (type \#\# for heading, \- for bullet, etc.)

* Inline card mentions — type /card to embed a live card preview from the board

* Real-time collaborative editing — multiple users can edit the same document simultaneously

* Document versioning — a full edit history with the ability to restore any previous version

* Permission control — documents can be set to Workspace (all members), Project (project members only), or Private

* Export to PDF or Markdown

## **8.2  Goals and OKRs**

The Goals module provides a structured space for teams to define and track Objectives and Key Results (OKRs). Goals sit above projects in the hierarchy — a single goal can be linked to multiple projects and multiple cards.

### **Creating a Goal**

20. Navigate to Workspace \> Goals in the sidebar.

21. Click \+ New Goal and enter the objective title.

22. Add Key Results: each key result has a name, a measurement type (percentage, number, true/false, or currency), a start value, and a target value.

23. Link relevant projects or cards to the goal. Progress on linked cards contributes to key result completion automatically.

### **Goal Progress**

Each goal displays a rollup progress bar calculated from the completion status of its linked cards. Key result progress can also be updated manually via the key result detail panel. Goals support a status of On Track, At Risk, and Off Track, which the PM assigns based on their judgement.

## **8.3  Custom Views**

TaskFlow AI supports multiple saved view configurations per project. In addition to the Kanban Board and Gantt Chart, users can create:

* List View — a flat, sortable, filterable table of all cards in the project. Columns are configurable.

* Calendar View — cards are displayed on a monthly calendar based on their due date. Overdue cards appear at the top of the view.

* My Work View — a personal cross-project view showing all cards assigned to the current user, sorted by due date and priority.

* Workload View — a team-level view showing how many cards each member is assigned, grouped by week or sprint. Helps PMs spot over- and under-allocation.

## **8.4  Spaces and Folders**

For teams managing multiple projects, TaskFlow AI uses a three-tier hierarchy: Workspace \> Space \> Project. A Space is an optional grouping layer — for example, a Product space might contain separate projects for the Web App, Mobile App, and API, each with their own boards and sprints.

Spaces can have their own member lists, colour themes, and default view settings. Users who are not members of a space cannot see its projects, providing a clean access boundary for organisations with distinct teams.

## **8.5  Inbox and Notifications**

The Inbox collects all notifications across projects and workspaces into a single feed. Notifications are generated for:

* Card assignments and unassignments

* @mentions in comments, DSM entries, or documents

* Due date approaching (configurable: 1 day, 2 days, or 1 week in advance)

* Card moved to a new status

* New PM Review or HR Review sheet created

* Sprint started or completed

* New comment on a card you are watching

Notifications can be dismissed individually or in bulk. A Do Not Disturb mode silences all notifications during configurable hours and is accessible from the profile menu.

# **9\. AI Integration — Powered by Groq**

TaskFlow AI uses the Groq API as its sole AI provider. Groq offers access to leading open-source language models — including Llama 3 and Mixtral — via an API that is compatible with the OpenAI interface and, crucially, provides a free tier with a generous daily request and token allowance. No credit card is required to use the Groq free tier.

## **9.1  Why Groq?**

| Advantage | Detail |
| :---- | :---- |
| Free tier available | Groq provides 14,400 free requests per day on the free tier — sufficient for any personal or small team deployment. |
| Exceptional speed | Groq's LPU inference hardware delivers token generation speeds significantly faster than traditional GPU-based providers. AI features feel near-instant. |
| No credit card required | Signing up for a Groq API key requires only an email address — consistent with TaskFlow AI's fully free-tier philosophy. |
| OpenAI-compatible API | The Groq API uses the same request and response format as the OpenAI API, making integration straightforward and well-documented. |
| Open-weight models | Llama 3, Mixtral, and Gemma are open-weight models with transparent training data and licensing, appropriate for a free open-source project. |

## **9.2  Obtaining a Groq API Key**

24. Visit console.groq.com and create a free account using your email address.

25. Navigate to API Keys in the left sidebar and click Create API Key.

26. Give the key a descriptive name (e.g., taskflow-ai-production) and copy the key value.

27. Add the key to your Render backend environment as: GROQ\_API\_KEY=your-key-here

28. Set GROQ\_MODEL=llama3-70b-8192 for best results, or llama3-8b-8192 for faster but lighter responses.

**🔑  Security Reminder:**  Your Groq API key must only be stored as a backend environment variable on Render. It must never be placed in the frontend .env file or committed to a public GitHub repository. The backend proxies all AI requests so the key is never exposed to the browser.

## **9.3  Available AI Features**

| Feature | What It Does |
| :---- | :---- |
| Card Description Generator | Sends the card title and type to Groq and returns a structured description with acceptance criteria. |
| Description Improver | Rewrites an existing description for clarity, completeness, and professional tone. |
| Priority Suggester | Analyses the card title and description and recommends a priority level with a brief rationale. |
| Sprint Summary Report | Generates a narrative summary of sprint progress from the current sprint's card data. |
| DSM AI Summary | Summarises team stand-up entries over a selected period into a coherent report. |
| Meeting Summary | Generates an executive summary paragraph from a PM Review sheet before it is finalised. |
| Goal Progress Narrative | Writes a plain-language summary of OKR progress for a selected goal. |
| Risk Description Helper | Expands a brief risk title into a full risk description with suggested mitigations. |

## **9.4  Model Selection**

The GROQ\_MODEL environment variable controls which model is used for all AI features. The recommended options are:

* llama3-70b-8192 — Best quality. Recommended for production-like use. Slower than the 8B variant but produces noticeably better structured outputs.

* llama3-8b-8192 — Fastest response time. Suitable if speed is a priority and outputs will be reviewed and edited by the user.

* mixtral-8x7b-32768 — Larger context window (32K tokens). Useful for the DSM AI Summary feature when summarising long histories.

# **10\. Technology Stack**

TaskFlow AI is built entirely on free-tier infrastructure. The stack has been updated in version 2.0 to replace the generic AI provider option with a dedicated Groq integration. Every service in the stack offers a free tier that is sufficient for personal and small-team use with no credit card required.

| Layer | Service | Free Tier Limits |
| :---- | :---- | :---- |
| Database | Supabase (PostgreSQL) | 500 MB storage, 2 GB transfer/month |
| Backend / API | Render (Node.js) | 512 MB RAM, sleeps after 15 min inactivity |
| Frontend | Vercel (React \+ Vite) | 100 GB bandwidth/month, unlimited deploys |
| Auth & Realtime | Supabase Auth \+ Realtime | 50,000 MAU, 200 concurrent connections |
| File Storage | Supabase Storage | 1 GB included with free project |
| AI Provider | Groq API | 14,400 requests/day, no credit card needed |
| Version Control / CI | GitHub Actions | 2,000 free minutes/month for Actions |

# **11\. Installation and Setup**

The following steps deploy the complete TaskFlow AI v2.0 stack on free infrastructure. Estimated time: 45 minutes for a developer with familiarity with environment variables and cloud dashboards.

## **11.1  Prerequisites**

* GitHub account (free) — to fork and host the source code

* Supabase account (free) — console.supabase.com

* Render account (free) — render.com

* Vercel account (free) — vercel.com

* Groq account (free) — console.groq.com

* Node.js 18+ and npm installed locally

## **11.2  Steps 1–2: Repository and Supabase**

29. Fork the repository at github.com/your-username/taskflow-ai and clone it locally.

30. Create a new Supabase project. In the SQL Editor, run the file at database/schema.sql to create all tables, RLS policies, and indexes.

31. Enable Realtime on the following tables in Supabase \> Database \> Replication: cards, lists, dsm\_entries, meeting\_sheets.

## **11.3  Steps 3–5: Environment Variables, Render, and Vercel**

### **Backend — server/.env**

SUPABASE\_URL=https://your-project-id.supabase.co

SUPABASE\_SERVICE\_KEY=your-service-role-key

GROQ\_API\_KEY=your-groq-api-key

GROQ\_MODEL=llama3-70b-8192

PORT=4000

### **Frontend — client/.env**

VITE\_SUPABASE\_URL=https://your-project-id.supabase.co

VITE\_SUPABASE\_ANON\_KEY=your-anon-public-key

VITE\_API\_BASE\_URL=https://your-service.onrender.com

32. Deploy the backend to Render: New \> Web Service. Set Build Command to npm install \--prefix server and Start Command to node server/index.js. Add all backend env vars. Choose the Free instance.

33. Deploy the frontend to Vercel: Import the repository, set Root Directory to client, add all frontend env vars, and deploy.

34. Create the first Admin account by visiting /register on your deployed Vercel URL.

# **12\. Limitations and Disclaimers**

TaskFlow AI is a lightweight, personal-use tool. It is not designed for enterprise deployment, high-availability production environments, or mission-critical data storage.

## **12.1  Key Limitations**

* Render cold start — the backend service may take 30–60 seconds to respond after a period of inactivity on the free tier.

* Supabase storage — the 500 MB database and 1 GB file storage limits are appropriate for small teams but will be reached by large projects with many file attachments over time.

* No email notifications — in-app notifications are fully functional; email delivery is not implemented in the current version.

* No mobile app — the interface is responsive for tablet and desktop browsers. A dedicated mobile application is not planned.

* Groq daily limits — the free tier allows 14,400 requests per day. This is ample for a small team using AI features normally, but automated or bulk usage could exhaust the daily quota.

* No SLA or uptime guarantee — all services are on free tiers with no SLA. Do not use TaskFlow AI as the sole record for business-critical data.

## **12.2  Licence**

TaskFlow AI is released under the MIT Licence. You are free to use, copy, modify, merge, publish, distribute, sublicence, and sell copies of the software. The above copyright notice and permission notice shall be included in all copies or substantial portions of the software.

The software is provided as-is, without warranty of any kind, express or implied. The maintainers are not liable for any claim, damages, or other liability arising from the use of the software.

# **A Note from the Maintainers**

TaskFlow AI began as a weekend project to answer a simple question: how close can a fully free stack get to the experience of paid project management tools? The answer — after two major versions — is: quite close.

Kanban boards, Gantt timelines, daily stand-up modules, structured meeting reviews, ClickUp-style workspaces, and genuinely fast AI assistance — all running on services that cost nothing to start. We hope it serves you well.

*Happy building.*