import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthUserMock = vi.fn();
const checkRoleMock = vi.fn();
const isOrgDriveConnectedMock = vi.fn();
const getOrgRootFolderIdMock = vi.fn();
const createDriveFolderMock = vi.fn();

const projectInsertSingleMock = vi.fn();
const membershipMaybeSingleMock = vi.fn();
const projectUpdateEqMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args) => getAuthUserMock(...args),
}));

vi.mock('@/lib/roles', () => ({
  checkRole: (...args) => checkRoleMock(...args),
}));

vi.mock('@/lib/drive', () => ({
  isOrgDriveConnected: (...args) => isOrgDriveConnectedMock(...args),
  getOrgRootFolderId: (...args) => getOrgRootFolderIdMock(...args),
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
                maybeSingle: membershipMaybeSingleMock,
              }),
            }),
          }),
        };
      }

      if (table === 'projects') {
        return {
          insert: () => ({
            select: () => ({ single: projectInsertSingleMock }),
          }),
          update: () => ({ eq: projectUpdateEqMock }),
        };
      }

      return { select: () => ({}) };
    }),
  },
}));

describe('POST /api/projects drive provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAuthUserMock.mockResolvedValue({ user: { id: 'user-1' }, error: null });
    membershipMaybeSingleMock.mockResolvedValue({ data: { role: 'admin', status: 'active' }, error: null });
    checkRoleMock.mockReturnValue(true);

    projectInsertSingleMock.mockResolvedValue({
      data: { id: 'project-1', name: 'Alpha', organization_id: 'org-1' },
      error: null,
    });

    projectUpdateEqMock.mockResolvedValue({ error: null });
    isOrgDriveConnectedMock.mockResolvedValue(true);
    getOrgRootFolderIdMock.mockResolvedValue('root-1');
    createDriveFolderMock.mockResolvedValue('folder-1');
  });

  it('creates a Drive folder when org storage is connected', async () => {
    const { POST } = await import('@/app/api/projects/route');

    const response = await POST({
      json: async () => ({
        name: 'Alpha',
        description: 'desc',
        prefix: 'alp',
        organizationId: 'org-1',
      }),
    });

    expect(response.status).toBe(201);
    expect(createDriveFolderMock).toHaveBeenCalledWith('org-1', 'Alpha', 'root-1');
  });

  it('skips Drive folder creation when storage is not connected', async () => {
    isOrgDriveConnectedMock.mockResolvedValueOnce(false);

    const { POST } = await import('@/app/api/projects/route');
    const response = await POST({
      json: async () => ({
        name: 'Alpha',
        description: 'desc',
        prefix: 'alp',
        organizationId: 'org-1',
      }),
    });

    expect(response.status).toBe(201);
    expect(createDriveFolderMock).not.toHaveBeenCalled();
  });

  it('does not leak Drive provisioning error to API client', async () => {
    createDriveFolderMock.mockRejectedValueOnce(new Error('raw internal drive error'));

    const { POST } = await import('@/app/api/projects/route');
    const response = await POST({
      json: async () => ({
        name: 'Alpha',
        description: 'desc',
        prefix: 'alp',
        organizationId: 'org-1',
      }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.id).toBe('project-1');
  });
});
