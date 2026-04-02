# 08-01 Summary - Google Drive Foundation

## What Was Built
- Added migration `20260402_google_drive_integration.sql` with:
  - `org_google_drive` for one Drive connection per organization
  - `file_attachments` for metadata-only attachment tracking (no file blobs in DB)
  - `projects.drive_folder_id` support for project folder persistence
  - RLS enabled and supporting indexes for org/project/card lookups
- Added `lib/drive.js`:
  - org-scoped Drive OAuth client creation
  - token refresh persistence to `org_google_drive`
  - folder create/upload/download-url/delete helpers
  - connection and root-folder status helpers
- Installed `googleapis` dependency.
- Updated `README.md` with required `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and Clerk `drive.file` scope + refresh token notes.
- Added `__tests__/drive.test.js` for helper behavior.

## Verification
- `node scripts/verify-migrations-simple.js` passed
- `npx vitest run __tests__/drive.test.js` passed
- `npm ls googleapis` confirms package installed

## Notes
- Implemented against current auth bridge and existing Supabase service-role route conventions.
- Kept unrelated in-progress files untouched.
