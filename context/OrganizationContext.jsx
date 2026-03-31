'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/apiClient';

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
    
    setActiveOrganization(prev => {
      if (prev?.id === next?.id) return prev; // Avoid new object reference if same ID
      return next;
    });

    if (userId) {
      if (next?.id) {
        localStorage.setItem(storageKey(userId), next.id);
      } else {
        localStorage.removeItem(storageKey(userId));
      }
    }

    return next;
  }, []);

  const userOrgsRef = useRef([]);

  const refreshOrganizations = useCallback(async () => {
    if (!user?.id) {
      setUserOrganizations([]);
      userOrgsRef.current = [];
      setActiveOrganization(null);
      setLoading(false);
      return;
    }

    // Only set loading true if we don't have any organizations yet (initial load)
    const currentOrgs = userOrgsRef.current;
    const isInitialLoad = currentOrgs.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiFetch('/api/organizations');

      if (!response.ok) {
        throw new Error('Failed to load organizations');
      }

      const organizations = await response.json();
      const normalized = Array.isArray(organizations) ? organizations : [];
      setUserOrganizations(normalized);
      userOrgsRef.current = normalized;

      const storedOrgId = localStorage.getItem(storageKey(user.id));
      setActiveById(storedOrgId, normalized, user.id);
    } catch (error) {
      console.error('Organization load failed:', error);
      if (isInitialLoad) {
        setUserOrganizations([]);
        userOrgsRef.current = [];
        setActiveOrganization(null);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [user?.id, setActiveById]); // Removed userOrganizations.length to break potential loop

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
