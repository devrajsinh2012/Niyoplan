# 08-03 Summary - File Attachment APIs + Reusable UI

## What Was Built
- Added attachment list/upload/download/delete routes:
  - `app/api/files/route.js`
  - `app/api/files/upload/route.js`
  - `app/api/files/[fileId]/route.js`
- Implemented org/project/card boundary checks and user-friendly error paths.
- Enforced 25MB upload limit server-side and retained metadata-only persistence to `file_attachments`.
- Added reusable `components/FileAttachment.jsx`:
  - upload state + 25MB client pre-check
  - attachment listing with mime-type icons and human-readable file sizes
  - download and delete actions with confirmation
  - inline warning when Drive is not connected
- Added route coverage in `__tests__/fileAttachmentRoutes.test.js`.

## Verification
- `npx vitest run __tests__/fileAttachmentRoutes.test.js` passed
- `npm run lint` passed (existing warning in onboarding middleware remains unrelated)

## Notes
- `card_id` is used instead of `issue_id` to match actual schema (`cards` table).
- File data is sent directly to Drive; only Drive IDs and metadata are stored in Supabase.
