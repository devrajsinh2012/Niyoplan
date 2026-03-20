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

  const [theme, setTheme] = useState(() => localStorage.getItem('niyoplan-theme') || 'dark');
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-app)',
      }}>
        <Loader2 style={{ width: 28, height: 28, color: 'var(--accent-primary)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', width: '100%',
      background: 'var(--bg-app)',
      overflow: 'hidden',
    }}>
      {/* ─── Top Navigation Bar ─── */}
      <TopNav
        onCreateClick={() => setShowCreateModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* ─── Body: Sidebar + Content ─── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar toggle button */}
        <button
          id="sidebar-toggle"
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            top: 12,
            left: sidebarCollapsed ? 8 : 'calc(var(--sidebar-width) - 12px)',
            zIndex: 20,
            width: 24, height: 24,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left var(--transition-smooth)',
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
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Subtle gradient overlay at top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 200,
            background: 'linear-gradient(180deg, rgba(12,102,228,0.04) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            position: 'relative', zIndex: 1,
          }}>
            <Outlet context={{ theme, currentProject, setShowCreateModal }} />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (xs screens only) */}
      <nav style={{
        display: 'none',
        // shown only on small screens via inline media query workaround
      }} className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-panel)] border-t border-slate-800 px-4 py-2 flex items-center justify-around">
        {/* Mobile nav left intentionally minimal; full app targets desktop */}
      </nav>
    </div>
  );
}
