'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});
const REMEMBER_ME_KEY = 'niyoplan-remember-me';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const userRef = useRef(null);
  const profileRef = useRef(null);
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
        const profileData = { ...data, email: authData?.user?.email || data.email || '' };

        setProfile(profileData);
        profileRef.current = profileData;
      } else if (error && error.code === 'PGRST116' && attempt < 5) {
        shouldRetry = true;
        setTimeout(() => fetchProfile(userId, attempt + 1), 800);
      } else {
        setProfile(null);
        profileRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      if (!shouldRetry) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        setLoading(true);
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
        setInitialLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const prevUser = userRef.current;
      const prevProfile = profileRef.current;
      const isRevalidation = _event === 'INITIAL_SESSION' || _event === 'SIGNED_IN';

      setUser(nextUser);
      userRef.current = nextUser;

      if (nextUser) {
        if (isRevalidation && !prevUser && !prevProfile) {
          setLoading(true);
        }
        fetchProfile(nextUser.id);
      } else {
        setProfile(null);
        profileRef.current = null;
        setLoading(false);
        setInitialLoading(false);
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
      },
    });

    return { data, error };
  };

  const signIn = async (email, password, options = {}) => {
    const { rememberMe = true } = options;

    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0');
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  };

  const signInWithGoogle = async (options = {}) => {
    const { rememberMe = true, redirectPath = '/login', callbackPath = '/sso-callback' } = options;

    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0');
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : null);

    const normalizedRedirectPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
    const normalizedCallbackPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;

    const redirectTo = baseUrl
      ? `${baseUrl}${normalizedCallbackPath}?redirect=${encodeURIComponent(normalizedRedirectPath)}`
      : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        ...(redirectTo ? { redirectTo } : {}),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    userRef.current = null;
    setProfile(null);
    profileRef.current = null;
    setLoading(false);
    setInitialLoading(false);
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const authReady = !initialLoading;
  const authInitializing = initialLoading;
  const signInReady = !initialLoading;
  const signUpReady = !initialLoading;

  return (
    <AuthContext.Provider value={{ user, profile, loading, initialLoading, authReady, authInitializing, signInReady, signUpReady, signInInitializing: !signInReady, signUpInitializing: !signUpReady, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
