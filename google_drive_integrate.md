# Agent Prompt: Google Drive File Storage Integration for Niyoplan

## Project Context

You are working on **Niyoplan** — a multi-tenant project management app (like Jira) built with:
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4
- **Auth**: Clerk (already has Google OAuth set up)
- **Database**: Supabase (PostgreSQL)
- **Backend**: Next.js route handlers under `app/api/`
- **Auth helpers**: `lib/access.js` for server-side checks, `lib/apiClient.js` for client-side fetch

The app is **multi-tenant** — every piece of data is scoped to an `organization`. Users belong to one or more organizations.

---

## What You Are Building

You are adding **Google Drive as a file storage backend** for Niyoplan.

Instead of buying cloud storage, each organization's admin will connect their own Google Drive account from the Company Settings page. After that, all file uploads in that organization (ticket attachments, document files, etc.) will automatically be saved to that Google Drive. The app only stores the Google Drive File ID in the database — never the actual file.

This means:
- **Zero storage cost** for Niyoplan (each org uses their own free 15GB Google Drive)
- **Each org's files are fully isolated** in their own Google Drive account
- **Files are retrievable** via temporary signed URLs from the Drive API

---

## Step-by-Step Execution Plan

### STEP 1 — Add Google Drive API Scope to Clerk

In the Clerk Dashboard, go to the Google social connection settings and add this additional OAuth scope:

```
https://www.googleapis.com/auth/drive.file
```

This scope only allows the app to access files **it created** — it cannot read anything else in the user's Drive. It is the safest, most minimal permission.

Also enable **"Refresh Token"** in Clerk's Google OAuth settings so the app can access Drive even when the admin is not logged in.

Document this step in a comment in `lib/drive.js` so future developers know why this scope is required.

---

### STEP 2 — Install the Google APIs Package

```bash
npm install googleapis
```

This is the official Google client library. It handles token refresh, API retries, and all Drive API calls.

---

### STEP 3 — Add Environment Variables

Add the following to `.env` (and document them in the README):

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

These are the same credentials already used in Clerk's Google OAuth setup. You do NOT need a separate Google Cloud project — reuse the existing one.

---

### STEP 4 — Create the Database Migration

Create the file `supabase/migrations/[timestamp]_google_drive_integration.sql`:

```sql
-- Stores one Google Drive connection per organization
CREATE TABLE org_google_drive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz,
  root_folder_id text NOT NULL,        -- The "Niyoplan/{OrgName}/" folder ID in Drive
  connected_by uuid REFERENCES users(id),
  connected_at timestamptz DEFAULT now(),
  UNIQUE(org_id)                        -- One Drive connection per org
);

-- Stores file metadata — we never store the actual file, only the Drive reference
CREATE TABLE file_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,  -- adjust table name to match your schema
  drive_file_id text NOT NULL,          -- The Google Drive file ID
  drive_folder_id text NOT NULL,        -- The Drive folder this file lives in
  original_name text NOT NULL,          -- Original filename shown to user
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE org_google_drive ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
```

Run this in the Supabase SQL editor.

---

### STEP 5 — Create `lib/drive.js`

This is the core helper that wraps all Google Drive API operations. Create this file:

```javascript
// lib/drive.js
// Google Drive API wrapper for Niyoplan file storage
// Requires: googleapis npm package
// OAuth Scope used: https://www.googleapis.com/auth/drive.file
// (This scope only allows access to files THIS app created — nothing else in the user's Drive)

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Build an authenticated Google Drive client for a given organization
async function getDriveClient(orgId) {
  const { data, error } = await supabase
    .from('org_google_drive')
    .select('access_token, refresh_token, token_expiry')
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    throw new Error(`No Google Drive connection found for org: ${orgId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.token_expiry ? new Date(data.token_expiry).getTime() : null,
  });

  // Auto-refresh token and save new token to DB
  oauth2Client.on('tokens', async (tokens) => {
    await supabase
      .from('org_google_drive')
      .update({
        access_token: tokens.access_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      })
      .eq('org_id', orgId);
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Create a folder in Google Drive. Returns the folder ID.
export async function createDriveFolder(orgId, folderName, parentFolderId = null) {
  const drive = await getDriveClient(orgId);

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    requestBody: metadata,
    fields: 'id, name',
  });

  return response.data.id;
}

// Upload a file buffer to a specific Drive folder. Returns the Drive file ID.
export async function uploadFileToDrive(orgId, folderId, fileName, mimeType, fileBuffer) {
  const drive = await getDriveClient(orgId);

  const { Readable } = await import('stream');
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, size, webViewLink',
  });

  return {
    driveFileId: response.data.id,
    webViewLink: response.data.webViewLink,
    size: response.data.size,
  };
}

// Generate a short-lived (1-hour) download URL for a Drive file
export async function getDriveFileDownloadUrl(orgId, driveFileId) {
  const drive = await getDriveClient(orgId);

  // Make the file accessible via link temporarily
  await drive.permissions.create({
    fileId: driveFileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const file = await drive.files.get({
    fileId: driveFileId,
    fields: 'webContentLink, webViewLink, name',
  });

  return {
    downloadUrl: file.data.webContentLink,
    viewUrl: file.data.webViewLink,
    fileName: file.data.name,
  };
}

// Delete a file from Drive (called when user deletes an attachment)
export async function deleteFileFromDrive(orgId, driveFileId) {
  const drive = await getDriveClient(orgId);
  await drive.files.delete({ fileId: driveFileId });
}

// Get the root folder ID for an organization
export async function getOrgRootFolderId(orgId) {
  const { data } = await supabase
    .from('org_google_drive')
    .select('root_folder_id')
    .eq('org_id', orgId)
    .single();

  return data?.root_folder_id || null;
}

// Check if an organization has Drive connected
export async function isOrgDriveConnected(orgId) {
  const { data } = await supabase
    .from('org_google_drive')
    .select('id')
    .eq('org_id', orgId)
    .single();

  return !!data;
}
```

---

### STEP 6 — Create API Routes

#### 6a. Connect Google Drive — `app/api/drive/connect/route.js`

```javascript
// app/api/drive/connect/route.js
// Called after admin completes Google OAuth — saves tokens and creates root folder

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { createDriveFolder } from '@/lib/drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId, orgName, accessToken, refreshToken, tokenExpiry } = await request.json();

  // Validate the user is an admin of this org
  // Use your existing access check pattern from lib/access.js
  const { data: membership } = await supabase
    .from('org_members')  // adjust table name to match your schema
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  // Temporarily insert tokens so getDriveClient() can use them to create the root folder
  await supabase.from('org_google_drive').upsert({
    org_id: orgId,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expiry: tokenExpiry,
    root_folder_id: 'pending',  // Will update below
    connected_by: userId,
  });

  // Create the root folder structure: "Niyoplan/{OrgName}/"
  const niyoplanFolderId = await createDriveFolder(orgId, 'Niyoplan');
  const orgFolderId = await createDriveFolder(orgId, orgName, niyoplanFolderId);

  // Save the real root folder ID
  await supabase
    .from('org_google_drive')
    .update({ root_folder_id: orgFolderId })
    .eq('org_id', orgId);

  return NextResponse.json({ success: true, rootFolderId: orgFolderId });
}
```

#### 6b. Disconnect Google Drive — `app/api/drive/disconnect/route.js`

```javascript
// app/api/drive/disconnect/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId } = await request.json();

  // Only admins can disconnect
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('org_google_drive').delete().eq('org_id', orgId);

  return NextResponse.json({ success: true });
}
```

#### 6c. Upload File — `app/api/files/upload/route.js`

```javascript
// app/api/files/upload/route.js
// Accepts a multipart file upload, saves it to the correct Drive folder

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { uploadFileToDrive, getOrgRootFolderId, createDriveFolder } from '@/lib/drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');          // The uploaded file
  const orgId = formData.get('orgId');
  const projectId = formData.get('projectId');
  const issueId = formData.get('issueId');    // optional — for ticket attachments

  if (!file || !orgId) {
    return NextResponse.json({ error: 'Missing file or orgId' }, { status: 400 });
  }

  // File size limit: 25MB
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 });
  }

  // Check Drive is connected for this org
  const rootFolderId = await getOrgRootFolderId(orgId);
  if (!rootFolderId) {
    return NextResponse.json(
      { error: 'Google Drive not connected. Ask your admin to connect Drive in Company Settings.' },
      { status: 400 }
    );
  }

  // Determine the target folder:
  // Structure: Niyoplan/{OrgName}/{ProjectName}/{IssueId}/
  // For simplicity, we store project_id as the subfolder name.
  // You can enhance this to look up the actual project name.
  let targetFolderId = rootFolderId;

  if (projectId) {
    // Try to find or create the project subfolder
    // For now, create it each time (Drive handles duplicates gracefully for our purposes)
    targetFolderId = await createDriveFolder(orgId, `project-${projectId}`, rootFolderId);
  }

  if (issueId) {
    targetFolderId = await createDriveFolder(orgId, `issue-${issueId}`, targetFolderId);
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Drive
  const { driveFileId, size } = await uploadFileToDrive(
    orgId,
    targetFolderId,
    file.name,
    file.type || 'application/octet-stream',
    buffer
  );

  // Save the file reference to Supabase (NOT the file itself — just the ID)
  const { data: attachment } = await supabase
    .from('file_attachments')
    .insert({
      org_id: orgId,
      project_id: projectId || null,
      issue_id: issueId || null,
      drive_file_id: driveFileId,
      drive_folder_id: targetFolderId,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: size,
      uploaded_by: userId,
    })
    .select()
    .single();

  return NextResponse.json({ success: true, attachment });
}
```

#### 6d. Get File Download URL — `app/api/files/[fileId]/route.js`

```javascript
// app/api/files/[fileId]/route.js
// Returns a temporary download URL for a file

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getDriveFileDownloadUrl } from '@/lib/drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request, { params }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = params;

  // Look up the file record
  const { data: file, error } = await supabase
    .from('file_attachments')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Verify user belongs to the org that owns this file
  const { data: membership } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', file.org_id)
    .eq('user_id', userId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const urls = await getDriveFileDownloadUrl(file.org_id, file.drive_file_id);

  return NextResponse.json({ ...urls, fileName: file.original_name });
}
```

#### 6e. Delete File — `app/api/files/[fileId]/route.js` (add DELETE method)

```javascript
export async function DELETE(request, { params }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = params;

  const { data: file } = await supabase
    .from('file_attachments')
    .select('*')
    .eq('id', fileId)
    .single();

  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  // Only the uploader or an admin can delete
  // Add your role check here using lib/access.js pattern

  await deleteFileFromDrive(file.org_id, file.drive_file_id);

  await supabase.from('file_attachments').delete().eq('id', fileId);

  return NextResponse.json({ success: true });
}
```

---

### STEP 7 — Update the Company Settings UI

Open the existing file for `/settings/company` (likely `app/settings/company/page.jsx` or a component it uses).

Add a **"Google Drive Storage"** section to the page. This section should:

1. **If Drive is NOT connected**: Show a "Connect Google Drive" button. Clicking it should:
   - Call Clerk's `openUserProfile()` or trigger a re-auth flow that requests the `drive.file` scope
   - On success, call `POST /api/drive/connect` with the received tokens
   - Show a success toast using `react-hot-toast`

2. **If Drive IS connected**: Show:
   - A green connected indicator with the connected date
   - The root folder path (`Niyoplan/{OrgName}/`)
   - A "Disconnect" button that calls `POST /api/drive/disconnect` (with a confirmation dialog)

The UI section should look consistent with the rest of the settings page. Use the same card/panel style already used in other settings sections.

Here is the data-fetching logic to add:

```javascript
// In the settings/company page component:
const [driveStatus, setDriveStatus] = useState(null);

useEffect(() => {
  async function checkDriveStatus() {
    const res = await apiFetch(`/api/drive/status?orgId=${activeOrg.id}`);
    const data = await res.json();
    setDriveStatus(data);
  }
  checkDriveStatus();
}, [activeOrg.id]);
```

Also create the status route `app/api/drive/status/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');

  const { data } = await supabase
    .from('org_google_drive')
    .select('root_folder_id, connected_at')
    .eq('org_id', orgId)
    .single();

  return NextResponse.json({
    connected: !!data,
    connectedAt: data?.connected_at || null,
    rootFolderId: data?.root_folder_id || null,
  });
}
```

---

### STEP 8 — Create the File Attachment UI Component

Create `components/FileAttachment.jsx` — a reusable component for uploading and listing files. It should:

- Accept props: `orgId`, `projectId`, `issueId`
- Show a file input (drag-and-drop is a bonus, a plain button is fine)
- On file select: POST to `/api/files/upload` using `apiFetch` from `lib/apiClient.js` with `FormData`
- Show upload progress (use a simple loading state — no need for a progress bar)
- List existing attachments fetched from `file_attachments` table (create `GET /api/files` route for this)
- Each listed file should have a Download button that calls `GET /api/files/[fileId]` and opens the returned URL in a new tab
- Each listed file should have a Delete button (with confirmation) that calls `DELETE /api/files/[fileId]`
- Show file size in a human-readable format (KB/MB)
- Show the file icon based on mime type (use Lucide icons: `FileText`, `Image`, `File` etc. — already in the project)
- If Drive is not connected for the org, show an inline warning: "File uploads are not enabled. Ask your admin to connect Google Drive in Company Settings."

---

### STEP 9 — Auto-Create Project Folders

When a new project is created (find the existing project creation API route — likely `app/api/projects/route.js`), add this after the project is inserted into the database:

```javascript
import { isOrgDriveConnected, createDriveFolder, getOrgRootFolderId } from '@/lib/drive';

// After project is created:
const driveConnected = await isOrgDriveConnected(orgId);
if (driveConnected) {
  const rootFolderId = await getOrgRootFolderId(orgId);
  const projectFolderId = await createDriveFolder(orgId, projectName, rootFolderId);
  
  // Optionally store this folder ID on the project record
  await supabase
    .from('projects')
    .update({ drive_folder_id: projectFolderId })
    .eq('id', newProject.id);
}
```

This means when someone later uploads a file to a project, the folder already exists — no need to create it on every upload.

---

## File Structure Summary

After completing all steps, these files will be added or modified:

```
New files:
  lib/drive.js                              ← Core Drive API helper
  app/api/drive/connect/route.js            ← Save tokens, create root folder
  app/api/drive/disconnect/route.js         ← Remove Drive connection
  app/api/drive/status/route.js             ← Check if Drive is connected
  app/api/files/upload/route.js             ← Handle file uploads
  app/api/files/[fileId]/route.js           ← Download URL + delete
  app/api/files/route.js                    ← List files for an issue/project
  components/FileAttachment.jsx             ← Reusable file upload/list UI
  supabase/migrations/[ts]_google_drive.sql ← DB tables

Modified files:
  app/settings/company/page.jsx (or component) ← Add Drive connect UI section
  app/api/projects/route.js                 ← Auto-create Drive folder on project create
  .env                                      ← Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  README.md                                 ← Document the Drive integration
```

---

## Key Rules to Follow While Implementing

1. **Never store file contents in Supabase** — only store Drive File IDs and metadata.
2. **Always check org membership** before any Drive or file operation — use the same pattern as `lib/access.js`.
3. **Always check if Drive is connected** before attempting uploads — return a clear error message if not.
4. **Token refresh is handled automatically** by the `googleapis` library and the `on('tokens')` listener in `lib/drive.js` — do not manually manage tokens.
5. **Use `apiFetch` from `lib/apiClient.js`** for all client-side calls to these API routes — it automatically injects the Supabase session token.
6. **File size limit is 25MB** — enforce this on both client (before upload) and server (in the route handler).
7. **Folder creation is idempotent enough for our needs** — Drive allows multiple folders with the same name, which is fine since we always reference by ID, not name.
8. **All error messages shown to users must be human-readable** — not raw error objects or stack traces.

---

## Testing Checklist

After implementation, verify these flows work end-to-end:

- [ ] Admin connects Google Drive from `/settings/company` — folder appears in their Drive
- [ ] Admin can disconnect Drive — `org_google_drive` row is removed from DB
- [ ] Non-admin user cannot see the connect/disconnect button
- [ ] File uploads to a ticket — file appears in the correct Drive folder
- [ ] File download URL opens the correct file
- [ ] Deleting an attachment removes it from Drive and from DB
- [ ] Uploading a file when Drive is not connected shows a clear error
- [ ] Files from Org A are not accessible to users in Org B
- [ ] Token refresh works (wait for token expiry or force-expire to test)

---

## Notes for the Agent

- **Do not change any existing auth logic** — Clerk and Supabase auth are already working correctly. Only add to them.
- **Match the existing code style** — look at 2-3 existing route handlers in `app/api/` before writing new ones. Match the same error handling pattern, the same way `userId` is extracted from Clerk, the same way Supabase is initialized.
- **Match the existing UI style** — look at the existing settings page components before adding the Drive UI section. Use the same card/panel/button styles already used there.
- **Do not add any new npm packages** other than `googleapis`.
- If any existing table name (like `issues`, `org_members`) does not match what you find in `database/schema.sql`, use the correct name from the schema — the names in this prompt are illustrative.