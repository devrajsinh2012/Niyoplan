import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthUserMock = vi.fn();
const memberMaybeSingleMock = vi.fn();
const driveMaybeSingleMock = vi.fn();
const updateEqMock = vi.fn();
const deleteEqMock = vi.fn();

const upsertOrgDriveConnectionMock = vi.fn();
const createDriveFolderMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args) => getAuthUserMock(...args),
}));

vi.mock('@/lib/drive', () => ({
  upsertOrgDriveConnection: (...args) => upsertOrgDriveConnectionMock(...args),
  createDriveFolder: (...args) => createDriveFolderMock(...args),
}));

vi.mock('@/lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: vi.fn((table) => {
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: memberMaybeSingleMock,
              }),
            }),
          }),
        };
      }

      if (table === 'org_google_drive') {
        return {
          update: () => ({ eq: updateEqMock }),
          delete: () => ({ eq: deleteEqMock }),
          select: () => ({
            eq: () => ({
              maybeSingle: driveMaybeSingleMock,
            }),
          }),
        };
      }

      return { select: () => ({}) };
    }),
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      getUserOauthAccessToken: vi.fn().mockResolvedValue([]),
    },
  })),
}));

describe('Drive connection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserMock.mockResolvedValue({ user: { id: 'user-1', clerk_user_id: 'clerk-1' }, error: null });
    memberMaybeSingleMock.mockResolvedValue({ data: { role: 'admin', status: 'active' }, error: null });
    driveMaybeSingleMock.mockResolvedValue({
      data: { root_folder_id: 'root-1', connected_at: '2026-04-02T00:00:00.000Z' },
      error: null,
    });
    updateEqMock.mockResolvedValue({ error: null });
    deleteEqMock.mockResolvedValue({ error: null });
    upsertOrgDriveConnectionMock.mockResolvedValue();
    createDriveFolderMock
      .mockResolvedValueOnce('niyoplan-folder')
      .mockResolvedValueOnce('org-folder');
  });

  it('returns 401 on connect when unauthenticated', async () => {
    getAuthUserMock.mockResolvedValueOnce({ user: null, error: 'Unauthorized' });
    const { POST } = await import('@/app/api/drive/connect/route');

    const response = await POST({ json: async () => ({ orgId: 'org-1', orgName: 'Acme' }) });

    expect(response.status).toBe(401);
  });

  it('returns 403 on disconnect when user is not org admin', async () => {
    memberMaybeSingleMock.mockResolvedValueOnce({ data: { role: 'member', status: 'active' }, error: null });
    const { POST } = await import('@/app/api/drive/disconnect/route');

    const response = await POST({ json: async () => ({ orgId: 'org-1' }) });

    expect(response.status).toBe(403);
  });

  it('connect route stores root folder on success', async () => {
    const { POST } = await import('@/app/api/drive/connect/route');

    const response = await POST({
      json: async () => ({
        orgId: 'org-1',
        orgName: 'Acme',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(upsertOrgDriveConnectionMock).toHaveBeenCalled();
    expect(createDriveFolderMock).toHaveBeenCalledTimes(2);
  });
});
