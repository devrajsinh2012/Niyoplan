'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

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
        // Profile trigger can lag right after first sign-in.
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
    // Check active sessions and sets the user
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

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      
      // Prevent full page loaders on focus if we already have a user
      const isRevalidation = _event === 'INITIAL_SESSION' || _event === 'SIGNED_IN';
      
      const prevUser = userRef.current;
      const prevProfile = profileRef.current;

      setUser(nextUser);
      userRef.current = nextUser;

      if (nextUser) {
        // Only trigger visible loading if it's the first load or if we had no user
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
      }
    });
    return { data, error };
  };

  const signIn = async (email, password, options = {}) => {
    const { rememberMe = true } = options;
    
    // Set the preference BEFORE signing in so the custom storage 
    // knows whether to use localStorage or sessionStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0');
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  };

  const signOut = async () => {
    // We stop removing REMEMBER_ME_KEY here to preserve the user's 
    // checkbox preference for their next login attempt.
    return supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, initialLoading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
