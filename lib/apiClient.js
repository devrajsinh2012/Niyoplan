import { supabase } from './supabase';

const SESSION_RETRY_DELAYS_MS = [0, 100, 250];

const normalizeHeaders = (headers = {}) => {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getSupabaseAuthHeaders(extraHeaders = {}) {
  const mergedHeaders = normalizeHeaders(extraHeaders);
  let token = null;

  for (const delayMs of SESSION_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData?.session?.access_token;

    if (token) {
      break;
    }
  }

  if (!token) {
    throw new Error('Your session expired. Please log in again.');
  }

  return {
    ...mergedHeaders,
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
