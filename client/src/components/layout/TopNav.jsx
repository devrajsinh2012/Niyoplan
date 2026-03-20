import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, HelpCircle, Sun, Moon, Plus, LogOut } from 'lucide-react';

export default function TopNav({ onCreateClick, theme, onToggleTheme }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'text-white bg-white/10'
        : 'text-white/75 hover:text-white hover:bg-white/10'
    }`;

  return (
    <header
      id="top-nav"
      style={{
        height: 'var(--topnav-height)',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 12px',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', marginRight: '4px', flexShrink: 0 }}
        title="NiyoPlan Home"
      >
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg, #0C66E4, #8B5CF6)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, color: '#fff',
          boxShadow: '0 2px 8px rgba(12,102,228,0.4)',
        }}>N</div>
      </div>

      {/* Global Nav Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <NavLink to="/projects" className={navLinkClass}>Projects</NavLink>
        <NavLink to="/" end className={navLinkClass}>Dashboards</NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/admin" className={navLinkClass}>Settings</NavLink>
        )}
      </nav>

      {/* Create Button */}
      <button
        id="global-create-btn"
        onClick={onCreateClick}
        className="btn-primary"
        style={{ marginLeft: '4px', minWidth: 'fit-content', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
      >
        <Plus size={14} />
        Create
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search Bar */}
      <div style={{
        position: 'relative',
        maxWidth: 280,
        width: '100%',
        transition: 'max-width var(--transition-smooth)',
        ...(searchFocused ? { maxWidth: 360 } : {}),
      }}>
        <Search
          size={14}
          style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
          }}
        />
        <input
          id="global-search"
          type="text"
          placeholder="Search"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            color: '#fff',
            padding: '5px 10px 5px 30px',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color var(--transition-fast), background var(--transition-fast)',
            ...(searchFocused ? {
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.4)',
            } : {}),
          }}
        />
      </div>

      {/* Right Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
        <button
          className="btn-icon"
          title="Notifications"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onClick={() => {}}
        >
          <Bell size={17} />
        </button>

        <button
          className="btn-icon"
          title="Toggle theme"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          className="btn-icon"
          title="Help"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <HelpCircle size={17} />
        </button>

        {/* User avatar / dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            id="user-menu-trigger"
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #0C66E4, #6554C0)',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
              transition: 'border-color var(--transition-fast)',
              marginLeft: 4,
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </button>

          {userMenuOpen && (
            <div
              className="animate-scale-in"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 200,
                overflow: 'hidden',
                zIndex: 200,
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
                  {profile?.full_name || 'User'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {profile?.email || ''}
                </div>
              </div>
              <div style={{ padding: '4px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'none', border: 'none',
                    color: 'var(--priority-highest)',
                    fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-blocked)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
