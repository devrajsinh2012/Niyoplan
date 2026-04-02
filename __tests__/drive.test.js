import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  maybeSingle: vi.fn(),
  update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  eq: vi.fn(),
  select: vi.fn(),
};

const fromMock = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: db.maybeSingle })),
  })),
  update: db.update,
  upsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}));

const onHandlers = {};
const oauthSetCredentials = vi.fn();
const oauthOn = vi.fn((event, handler) => {
  onHandlers[event] = handler;
});
const OAuth2Mock = vi.fn(function OAuth2Mock() {
  this.setCredentials = oauthSetCredentials;
  this.on = oauthOn;
});

const driveCreate = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: OAuth2Mock,
    },
    drive: vi.fn(() => ({
      files: {
        create: driveCreate,
        get: vi.fn(),
        delete: vi.fn(),
      },
      permissions: {
        create: vi.fn(),
      },
    })),
  },
}));

describe('lib/drive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    db.maybeSingle.mockResolvedValue({
      data: {
        org_id: 'org-1',
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        token_expiry: null,
        root_folder_id: 'root-1',
      },
      error: null,
    });

    driveCreate.mockResolvedValue({
      data: { id: 'drive-file-1', size: '2048', webViewLink: 'https://drive.google.com/file' },
    });
  });

  it('throws a readable error when org drive connection is missing', async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { createDriveFolder } = await import('@/lib/drive');

    await expect(createDriveFolder('missing-org', 'Folder')).rejects.toThrow(
      'No Google Drive connection found for org: missing-org'
    );
  });

  it('persists refreshed tokens emitted by OAuth client', async () => {
    const { createDriveFolder } = await import('@/lib/drive');
    await createDriveFolder('org-1', 'Test Folder');

    expect(oauthOn).toHaveBeenCalledWith('tokens', expect.any(Function));

    await onHandlers.tokens({ access_token: 'next-token', expiry_date: Date.now() + 3600000 });

    expect(db.update).toHaveBeenCalled();
  });

  it('returns drive file id and size on upload', async () => {
    const { uploadFileToDrive } = await import('@/lib/drive');

    const result = await uploadFileToDrive(
      'org-1',
      'folder-1',
      'report.txt',
      'text/plain',
      Buffer.from('hello')
    );

    expect(result.driveFileId).toBe('drive-file-1');
    expect(result.size).toBe(2048);
  });
});
