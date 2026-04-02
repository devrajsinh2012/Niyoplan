import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthUserMock = vi.fn();
const verifyOrganizationAccessMock = vi.fn();
const verifyProjectAccessMock = vi.fn();

const getOrgRootFolderIdMock = vi.fn();
const uploadFileToDriveMock = vi.fn();
const getDriveFileDownloadUrlMock = vi.fn();
const deleteFileFromDriveMock = vi.fn();

const fileMaybeSingleMock = vi.fn();
const orgMemberMaybeSingleMock = vi.fn();
const insertSingleMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args) => getAuthUserMock(...args),
}));

vi.mock('@/lib/access', () => ({
  verifyOrganizationAccess: (...args) => verifyOrganizationAccessMock(...args),
  verifyProjectAccess: (...args) => verifyProjectAccessMock(...args),
}));

vi.mock('@/lib/drive', () => ({
  getOrgRootFolderId: (...args) => getOrgRootFolderIdMock(...args),
  uploadFileToDrive: (...args) => uploadFileToDriveMock(...args),
  getDriveFileDownloadUrl: (...args) => getDriveFileDownloadUrlMock(...args),
  deleteFileFromDrive: (...args) => deleteFileFromDriveMock(...args),
  createDriveFolder: vi.fn(),
}));

vi.mock('@/lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: vi.fn((table) => {
      if (table === 'file_attachments') {
        return {
          insert: vi.fn(() => ({
            select: () => ({ single: insertSingleMock }),
          })),
          select: () => ({
            eq: () => ({ maybeSingle: fileMaybeSingleMock }),
          }),
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
        };
      }

      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: orgMemberMaybeSingleMock }),
            }),
          }),
        };
      }

      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        };
      }

      if (table === 'cards') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        };
      }

      return { select: () => ({}) };
    }),
  },
}));

function makeFormData(entries) {
  return {
    get: (key) => entries[key] ?? null,
  };
}

describe('File attachment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserMock.mockResolvedValue({ user: { id: 'user-1' }, error: null });
    verifyOrganizationAccessMock.mockResolvedValue({ hasAccess: true, error: null });
    verifyProjectAccessMock.mockResolvedValue({ hasAccess: true, error: null });
    getOrgRootFolderIdMock.mockResolvedValue('root-folder');
    uploadFileToDriveMock.mockResolvedValue({ driveFileId: 'drive-file-1', size: 1234 });
    insertSingleMock.mockResolvedValue({
      data: { id: 'att-1', drive_file_id: 'drive-file-1' },
      error: null,
    });
    fileMaybeSingleMock.mockResolvedValue({
      data: { id: 'att-1', org_id: 'org-1', drive_file_id: 'drive-file-1', original_name: 'a.txt' },
      error: null,
    });
    orgMemberMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    getDriveFileDownloadUrlMock.mockResolvedValue({ downloadUrl: 'https://example.com/file' });
    deleteFileFromDriveMock.mockResolvedValue();
  });

  it('rejects upload larger than 25MB', async () => {
    const { POST } = await import('@/app/api/files/upload/route');

    const response = await POST({
      formData: async () =>
        makeFormData({
          file: {
            size: 26 * 1024 * 1024,
            name: 'big.bin',
            type: 'application/octet-stream',
            arrayBuffer: async () => new ArrayBuffer(0),
          },
          orgId: 'org-1',
        }),
    });

    expect(response.status).toBe(413);
  });

  it('returns 403 when file is requested from another org', async () => {
    const { GET } = await import('@/app/api/files/[fileId]/route');

    const response = await GET({}, { params: Promise.resolve({ fileId: 'att-1' }) });
    expect(response.status).toBe(403);
  });

  it('stores metadata for successful upload', async () => {
    const { POST } = await import('@/app/api/files/upload/route');

    const response = await POST({
      formData: async () =>
        makeFormData({
          file: {
            size: 10,
            name: 'ok.txt',
            type: 'text/plain',
            arrayBuffer: async () => new TextEncoder().encode('ok').buffer,
          },
          orgId: 'org-1',
        }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(uploadFileToDriveMock).toHaveBeenCalled();
  });
});
