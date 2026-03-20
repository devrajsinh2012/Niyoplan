import React, { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, PanelLeftClose, PanelLeft } from 'lucide-react';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { supabase } from '../../lib/supabase';

export default function AppShell() {
  const { loading } = useAuth();
  const { id } = useParams();

  const [theme, setTheme] = useState(() => localStorage.getItem('niyoplan-theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [, setShowCreateModal] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('niyoplan-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Fetch current project info for the sidebar header
  useEffect(() => {
    if (id) {
      supabase.from('projects').select('id, name, prefix').eq('id', id).single()
        .then(({ data }) => setCurrentProject(data));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentProject(null);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-app)]">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-app)]">
      {/* ─── Top Navigation Bar ─── */}
      <TopNav
        onCreateClick={() => setShowCreateModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Sidebar toggle button (ADS style: floating on edge) */}
        <button
          id="sidebar-toggle"
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-all duration-300"
          style={{
            top: 12,
            left: sidebarCollapsed ? 8 : 'calc(var(--sidebar-width) - 12px)',
          }}
        >
          {sidebarCollapsed
            ? <PanelLeft size={13} />
            : <PanelLeftClose size={13} />}
        </button>

        {/* ─── Project Sidebar ─── */}
        <Sidebar
          project={currentProject}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(c => !c)}
        />

        {/* ─── Main Content Area ─── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* Subtle gradient overlay at top (Jira-style depth) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-[var(--accent-primary)]/[0.03] to-transparent" />

          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
            <Outlet context={{ theme, currentProject, setShowCreateModal }} />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (xs screens only - placeholder support) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 md:hidden">
        {/* Mobile nav content would go here if needed */}
      </nav>
    </div>
  );
}
