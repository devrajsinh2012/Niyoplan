import { supabase } from './supabase';

export async function getSupabaseAuthHeaders(extraHeaders = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('Your session expired. Please log in again.');
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}
