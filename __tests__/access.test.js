import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyOrganizationAccess, verifyProjectAccess, verifyValidAssignee } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';

vi.mock('@/lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  }
}));

describe('Access Control Logic - lib/access.js', () => {
  let mockSingle;
  let mockEq;
  let mockSelect;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({
      eq: mockEq,
      single: mockSingle
    }));
    mockSelect = vi.fn(() => ({
      eq: mockEq
    }));

    supabaseAdmin.from.mockReturnValue({
      select: mockSelect
    });
  });

  describe('verifyOrganizationAccess', () => {
    it('returns false for missing parameters', async () => {
      const result = await verifyOrganizationAccess(null, 'user-1');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Missing parameters');
    });

    it('returns false if user is not a member', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const result = await verifyOrganizationAccess('org-1', 'user-1');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('User is not a member of this organization');
    });

    it('returns false if membership is inactive', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'x', status: 'inactive' }, error: null });
      const result = await verifyOrganizationAccess('org-1', 'user-1');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('User organization membership is inactive');
    });

    it('returns true if membership is active', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'x', status: 'active' }, error: null });
      const result = await verifyOrganizationAccess('org-1', 'user-1');
      expect(result.hasAccess).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('verifyProjectAccess', () => {
    it('returns false for missing parameters', async () => {
      const result = await verifyProjectAccess('proj-1', null);
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Missing parameters');
    });

    it('returns false if project not found', async () => {
      // Mock the project lookup
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      const result = await verifyProjectAccess('proj-1', 'user-1');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Project not found');
    });

    it('verifies organization access based on project org_id', async () => {
      // First call: project lookup
      mockSingle.mockResolvedValueOnce({ data: { organization_id: 'org-1' }, error: null });
      // Second call: organization access verification
      mockSingle.mockResolvedValueOnce({ data: { id: 'x', status: 'active' }, error: null });
      
      const result = await verifyProjectAccess('proj-1', 'user-1');
      expect(supabaseAdmin.from).toHaveBeenNthCalledWith(1, 'projects');
      expect(supabaseAdmin.from).toHaveBeenNthCalledWith(2, 'organization_members');
      expect(result.hasAccess).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('verifyValidAssignee', () => {
    it('returns false for missing parameters', async () => {
      const result = await verifyValidAssignee(null, 'user-1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing parameters');
    });

    it('returns false if user is not in project_members', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const result = await verifyValidAssignee('proj-1', 'user-1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Assignee is not a member of this project');
    });

    it('returns true if user is in project_members', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'x' }, error: null });
      const result = await verifyValidAssignee('proj-1', 'user-1');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});
