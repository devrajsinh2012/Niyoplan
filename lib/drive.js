import { google } from 'googleapis';
import { Readable } from 'stream';
import { supabaseAdmin } from '@/lib/supabaseServer';

// Clerk Google OAuth must include `https://www.googleapis.com/auth/drive.file`
// with refresh tokens enabled so org storage access survives admin sessions.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function buildOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Drive is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  return new google.auth.OAuth2(clientId, clientSecret);
}

async function getOrgDriveConnection(orgId) {
  const { data, error } = await supabaseAdmin
    .from('org_google_drive')
    .select('org_id, access_token, refresh_token, token_expiry, root_folder_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to load Google Drive connection for this organization.');
  }

  if (!data) {
    throw new Error(`No Google Drive connection found for org: ${orgId}`);
  }

  return data;
}

async function persistDriveTokens(orgId, tokens) {
  if (!tokens?.access_token && !tokens?.refresh_token && !tokens?.expiry_date) {
    return;
  }

  const payload = {
    ...(tokens.access_token ? { access_token: tokens.access_token } : {}),
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    ...(tokens.expiry_date
      ? { token_expiry: new Date(tokens.expiry_date).toISOString() }
      : {}),
  };

  const { error } = await supabaseAdmin
    .from('org_google_drive')
    .update(payload)
    .eq('org_id', orgId);

  if (error) {
    console.error('Failed to persist refreshed Google Drive token:', error);
  }
}

async function getDriveClient(orgId) {
  const connection = await getOrgDriveConnection(orgId);
  const oauth2Client = buildOAuthClient();

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : undefined,
    scope: DRIVE_SCOPE,
  });

  oauth2Client.on('tokens', async (tokens) => {
    await persistDriveTokens(orgId, tokens);
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function createDriveFolder(orgId, folderName, parentFolderId = null) {
  const drive = await getDriveClient(orgId);

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentFolderId ? { parents: [parentFolderId] } : {}),
  };

  const response = await drive.files.create({
    requestBody: metadata,
    fields: 'id,name',
  });

  return response?.data?.id || null;
}

export async function uploadFileToDrive(orgId, folderId, fileName, mimeType, fileBuffer) {
  const drive = await getDriveClient(orgId);
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id,name,size,webViewLink',
  });

  return {
    driveFileId: response?.data?.id,
    webViewLink: response?.data?.webViewLink || null,
    size: response?.data?.size ? Number(response.data.size) : null,
  };
}

export async function getDriveFileDownloadUrl(orgId, driveFileId) {
  const drive = await getDriveClient(orgId);

  await drive.permissions.create({
    fileId: driveFileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const file = await drive.files.get({
    fileId: driveFileId,
    fields: 'id,name,webContentLink,webViewLink',
  });

  return {
    downloadUrl: file?.data?.webContentLink || null,
    viewUrl: file?.data?.webViewLink || null,
    fileName: file?.data?.name || null,
  };
}

export async function deleteFileFromDrive(orgId, driveFileId) {
  const drive = await getDriveClient(orgId);
  await drive.files.delete({ fileId: driveFileId });
}

export async function getOrgRootFolderId(orgId) {
  const { data, error } = await supabaseAdmin
    .from('org_google_drive')
    .select('root_folder_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to check Google Drive folder status for this organization.');
  }

  return data?.root_folder_id || null;
}

export async function isOrgDriveConnected(orgId) {
  const { data, error } = await supabaseAdmin
    .from('org_google_drive')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to verify Google Drive connection status.');
  }

  return Boolean(data?.id);
}

export async function upsertOrgDriveConnection({
  orgId,
  accessToken,
  refreshToken,
  tokenExpiry,
  rootFolderId,
  connectedBy,
}) {
  if (!orgId || !accessToken || !refreshToken || !rootFolderId) {
    throw new Error('Missing required Drive connection details.');
  }

  const { error } = await supabaseAdmin
    .from('org_google_drive')
    .upsert(
      {
        org_id: orgId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry || null,
        root_folder_id: rootFolderId,
        connected_by: connectedBy || null,
      },
      { onConflict: 'org_id' }
    );

  if (error) {
    throw new Error('Failed to save Google Drive connection for this organization.');
  }
}
