'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AppShellSkeleton } from '@/components/ui/PageSkeleton';

export default function AppShell({ children }) {
  const { loading, user } = useAuth();
  const { projectId } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState('light');
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('niyoplan-theme') || 'light';
    setTheme(savedTheme);
    setThemeLoaded(true);
  }, []);

  // Apply theme
  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('niyoplan-theme', theme);
  }, [theme, themeLoaded]);

  // Listen for shortcuts modal event
  useEffect(() => {
    const handleShowShortcuts = () => setShortcutsModalOpen(true);
    window.addEventListener('niyoplan:show-shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('niyoplan:show-shortcuts', handleShowShortcuts);
  }, []);

  // Keyboard shortcut: ? to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsModalOpen(true);
      }
      if (e.key === 'Escape') {
        setShortcutsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Fetch current project info for the sidebar header
  useEffect(() => {
    if (projectId) {
      supabase.from('projects').select('id, name, prefix').eq('id', projectId).single()
        .then(({ data }) => setCurrentProject(data));
    } else {
      setCurrentProject(null);
    }
  }, [projectId]);

  if (loading) {
    return <AppShellSkeleton />;
  }

  // Auth and onboarding flows should render without app chrome.
  if (
    ['/login', '/register'].includes(pathname) ||
    pathname.startsWith('/onboarding')
  ) {
    return <>{children}</>;
  }

  // If not authenticated, don't show the shell while redirecting
  if (!user) {
    return null;
  }

  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'P'], description: 'Go to Projects' },
      { keys: ['G', 'B'], description: 'Go to Board' },
      { keys: ['G', 'L'], description: 'Go to Backlog' },
      { keys: ['1-0'], description: 'Switch project tabs' },
    ]},
    { category: 'Issues', items: [
      { keys: ['C'], description: 'Create new issue' },
      { keys: ['E'], description: 'Edit selected issue' },
      { keys: ['Enter'], description: 'Open selected issue' },
      { keys: ['Esc'], description: 'Close modal' },
    ]},
    { category: 'General', items: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['/'], description: 'Focus search' },
      { keys: ['Ctrl', 'K'], description: 'Quick search' },
    ]},
  ];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-app)]">
      {/* ─── Top Navigation Bar ─── */}
      <TopNav
        onCreateClick={() => {
          if (projectId) {
            window.dispatchEvent(new CustomEvent('niyoplan:create-issue'));
            return;
          }
          toast('Open a project to create an issue.');
          router.push('/projects');
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ─── Project Sidebar ─── */}
        <Sidebar
          project={currentProject}
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />

        {/* ─── Main Content Area ─── */}
        <main
          className={`relative flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200 ${sidebarExpanded ? 'ml-60' : 'ml-16'}`}
        >
          {/* Subtle gradient overlay at top (Jira-style depth) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-[var(--accent-primary)]/[0.03] to-transparent" />

          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShortcutsModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-heading)]">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Press <kbd className="ml-1 px-2 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-xs font-mono">Esc</kbd> to close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shortcuts.map((section) => (
                <div key={section.category}>
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">{section.category}</h3>
                  <div className="space-y-2">
                    {section.items.map((shortcut, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              <kbd className="px-2 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-xs font-mono text-[var(--text-primary)]">{key}</kbd>
                              {keyIdx < shortcut.keys.length - 1 && <span className="text-[var(--text-muted)]">+</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav (xs screens only - placeholder support) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 md:hidden">
        {/* Mobile nav content would go here if needed */}
      </nav>
    </div>
  );
}
