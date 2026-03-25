'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const OrganizationContext = createContext({
  activeOrganization: null,
  userOrganizations: [],
  loading: true,
  switchOrganization: async () => {},
  refreshOrganizations: async () => {},
});

const storageKey = (userId) => `niyoplan-active-org-${userId}`;

export function OrganizationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const setActiveById = useCallback((orgId, organizations, userId) => {
    const next = organizations.find((org) => org.id === orgId) || organizations[0] || null;
    setActiveOrganization(next);

    if (userId) {
      if (next?.id) {
        localStorage.setItem(storageKey(userId), next.id);
      } else {
        localStorage.removeItem(storageKey(userId));
      }
    }

    return next;
  }, []);

  const refreshOrganizations = useCallback(async () => {
    if (!user?.id) {
      setUserOrganizations([]);
      setActiveOrganization(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setUserOrganizations([]);
        setActiveOrganization(null);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load organizations');
      }

      const organizations = await response.json();
      const normalized = Array.isArray(organizations) ? organizations : [];
      setUserOrganizations(normalized);

      const storedOrgId = localStorage.getItem(storageKey(user.id));
      setActiveById(storedOrgId, normalized, user.id);
    } catch (error) {
      console.error('Organization load failed:', error);
      setUserOrganizations([]);
      setActiveOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setActiveById]);

  useEffect(() => {
    if (authLoading) return;
    refreshOrganizations();
  }, [authLoading, refreshOrganizations]);

  const switchOrganization = useCallback(async (orgId) => {
    if (!user?.id) return null;
    return setActiveById(orgId, userOrganizations, user.id);
  }, [user?.id, userOrganizations, setActiveById]);

  const value = useMemo(() => ({
    activeOrganization,
    userOrganizations,
    loading,
    switchOrganization,
    refreshOrganizations,
  }), [activeOrganization, userOrganizations, loading, switchOrganization, refreshOrganizations]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
