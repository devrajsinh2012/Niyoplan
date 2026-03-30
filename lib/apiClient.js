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

/**
 * A wrapper around fetch that automatically includes the Supabase Authorization header.
 * @param {string} url The API endpoint URL.
 * @param {Object} options Standard fetch options.
 * @returns {Promise<Response>} The fetch response.
 */
export async function apiFetch(url, options = {}) {
  const authHeaders = await getSupabaseAuthHeaders(options.headers || {});
  
  const mergedOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  };

  return fetch(url, mergedOptions);
}
