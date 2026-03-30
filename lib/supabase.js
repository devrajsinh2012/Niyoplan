import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const REMEMBER_ME_KEY = 'niyoplan-remember-me';
const isBrowser = typeof window !== 'undefined';

// Custom storage handler that chooses between localStorage and sessionStorage 
// based on the 'Remember Me' preference.
const customStorage = {
  getItem: (key) => {
    if (!isBrowser) return null;
    // Check localStorage first
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
    // Fallback to sessionStorage
    return sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (!isBrowser) return;
    
    // Check if user has opted for "Remember Me"
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === '1';
    
    if (rememberMe) {
      localStorage.setItem(key, value);
      // Clean up sessionStorage to avoid redundant/stale data
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      // Ensure we don't leave persistent data if "Remember Me" is off
      localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    if (!isBrowser) return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

