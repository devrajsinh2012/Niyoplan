import React, { useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown, ChevronRight,
  LayoutDashboard, Layers, KanbanSquare,
  BarChart2, Tag,
  Settings, BookOpen, Target,
  Zap, MessageSquare, Calendar
} from 'lucide-react';

const NavSection = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '4px 12px',
          background: 'none', border: 'none',
          color: 'var(--text-muted)',
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 'var(--radius-md)',
          transition: 'color var(--transition-fast)',
        }}
      >
        {title}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div style={{ marginTop: 2 }}>{children}</div>}
    </div>
  );
};

const SideNavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px',
      borderRadius: 'var(--radius-md)',
      fontSize: 13, fontWeight: 500,
      color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
      background: isActive ? 'var(--accent-subtle)' : 'transparent',
      textDecoration: 'none',
      transition: 'background var(--transition-fast), color var(--transition-fast)',
    })}
    onMouseEnter={e => {
      if (!e.currentTarget.getAttribute('aria-current')) {
        e.currentTarget.style.background = 'var(--bg-panel-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={e => {
      if (!e.currentTarget.getAttribute('aria-current')) {
        e.currentTarget.style.background = '';
        e.currentTarget.style.color = '';
      }
    }}
  >
    {Icon && <Icon size={16} />}
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar({ project, collapsed }) {
  const { profile } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = id || project?.id;

  const width = collapsed ? 0 : 'var(--sidebar-width)';

  return (
    <aside
      id="project-sidebar"
      style={{
        width,
        minWidth: collapsed ? 0 : 'var(--sidebar-width)',
        maxWidth: collapsed ? 0 : 'var(--sidebar-width)',
        overflow: collapsed ? 'hidden' : 'visible',
        height: '100%',
        background: 'var(--bg-panel)',
        borderRight: collapsed ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        transition: 'min-width var(--transition-smooth), max-width var(--transition-smooth)',
        zIndex: 10,
      }}
    >
      {/* Project Header */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 4px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
        }}
          onClick={() => projectId && navigate(`/projects/${projectId}`)}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'linear-gradient(135deg, #0C66E4, #6554C0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {project?.name?.charAt(0) || 'N'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-heading)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 150,
            }}>
              {project?.name || 'Niyoplan V2'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Software Project
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        {projectId ? (
          <>
            <NavSection title="Planning">
              <SideNavItem to={`/projects/${projectId}`} end icon={Layers} label="Backlog" />
              <SideNavItem to={`/projects/${projectId}?tab=board`} icon={KanbanSquare} label="Board" />
              <SideNavItem to={`/projects/${projectId}?tab=gantt`} icon={Calendar} label="Timeline" />
            </NavSection>

            <NavSection title="Development">
              <SideNavItem to={`/projects/${projectId}?tab=dsm`} icon={Zap} label="DSM Module" />
              <SideNavItem to={`/projects/${projectId}?tab=meetings`} icon={MessageSquare} label="Meetings" />
              <SideNavItem to={`/projects/${projectId}?tab=goals`} icon={Target} label="Goals &amp; OKRs" />
              <SideNavItem to={`/projects/${projectId}?tab=docs`} icon={BookOpen} label="Docs" />
              <SideNavItem to={`/projects/${projectId}?tab=ai`} icon={Zap} label="AI Tools" />
            </NavSection>

            <NavSection title="Analytics">
              <SideNavItem to={`/projects/${projectId}?tab=reports`} icon={BarChart2} label="Reports" />
              <SideNavItem to={`/projects/${projectId}?tab=list`} icon={Tag} label="Issues" />
            </NavSection>
          </>
        ) : (
          <>
            {/* Non-project sidebar (dashboard, projects list) */}
            <SideNavItem to="/" end icon={LayoutDashboard} label="Dashboard" />
            <SideNavItem to="/projects" icon={KanbanSquare} label="Projects" />
            {profile?.role === 'admin' && (
              <SideNavItem to="/admin" icon={Settings} label="Admin Settings" />
            )}
          </>
        )}
      </nav>

      {/* Project Settings at bottom */}
      {projectId && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '8px 4px',
          flexShrink: 0,
        }}>
          <SideNavItem to={`/projects/${projectId}?tab=settings`} icon={Settings} label="Project settings" />
        </div>
      )}
    </aside>
  );
}
