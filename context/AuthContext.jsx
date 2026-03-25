'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
const REMEMBER_ME_KEY = 'niyoplan-remember-me';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, attempt = 0) => {
    let shouldRetry = false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const { data: authData } = await supabase.auth.getUser();
        setProfile({ ...data, email: authData?.user?.email || data.email || '' });
      } else if (error && error.code === 'PGRST116' && attempt < 5) {
        // Profile trigger can lag right after first sign-in.
        shouldRetry = true;
        setTimeout(() => fetchProfile(userId, attempt + 1), 800);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      if (!shouldRetry) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchProfile(session.user.id);
      }
      else setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email, password, fullName) => {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(appUrl ? { emailRedirectTo: `${appUrl}/login` } : {}),
      }
    });
    return { data, error };
  };

  const signIn = async (email, password, options = {}) => {
    const { rememberMe = true } = options;
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (!result.error) {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0');
    }

    return result;
  };

  const signOut = async () => {
    localStorage.removeItem(REMEMBER_ME_KEY);
    return supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
