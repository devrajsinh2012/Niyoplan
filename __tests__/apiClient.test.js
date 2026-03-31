import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, getSupabaseAuthHeaders } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('getSupabaseAuthHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a bearer token header from the active session', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
        },
      },
    });

    await expect(getSupabaseAuthHeaders()).resolves.toEqual({
      Authorization: 'Bearer test-token',
    });
  });

  it('merges extra headers with the auth header', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
        },
      },
    });

    await expect(getSupabaseAuthHeaders({ 'Content-Type': 'application/json' })).resolves.toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    });
  });

  it('throws a clear error when the session has no token', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    await expect(getSupabaseAuthHeaders()).rejects.toThrow('Your session expired. Please log in again.');
  });

  it('adds auth headers when performing a fetch request', async () => {
    const response = {
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    };

    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
        },
      },
    });

    global.fetch.mockResolvedValue(response);

    await expect(apiFetch('/api/projects/123', {
      method: 'PATCH',
      headers: { 'X-Test': 'value' },
      body: JSON.stringify({ name: 'Demo' }),
    })).resolves.toBe(response);

    expect(global.fetch).toHaveBeenCalledWith('/api/projects/123', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Test': 'value',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ name: 'Demo' }),
    });
  });
});
