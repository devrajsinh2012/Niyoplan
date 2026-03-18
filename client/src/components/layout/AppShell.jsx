import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FolderKanban, Settings, LogOut, Loader2, Sun, Moon } from 'lucide-react';

export default function AppShell() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('niyoplan-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('niyoplan-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex pt-[30vh] justify-center h-screen bg-[#0F172A] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-inter">
      
      {/* Global Sidebar */}
      <aside className="hidden md:flex w-[68px] flex-col items-center py-4 bg-[var(--bg-panel)] border-r border-slate-800 shadow-2xl relative z-20">
        
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-8 cursor-pointer transform hover:scale-105 transition-transform">
          <span className="font-bold text-lg text-white">N</span>
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `p-3 rounded-xl flex justify-center transition-all duration-200 group ${
                isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
            title="Dashboard"
          >
            <LayoutDashboard size={22} className="group-hover:scale-110 transition-transform" />
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `p-3 rounded-xl flex justify-center transition-all duration-200 group ${
                isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
            title="Projects"
          >
            <FolderKanban size={22} className="group-hover:scale-110 transition-transform" />
          </NavLink>

          {profile?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `p-3 rounded-xl flex justify-center transition-all duration-200 group ${
                  isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
              title="Admin Settings"
            >
              <Settings size={22} className="group-hover:scale-110 transition-transform" />
            </NavLink>
          )}
        </nav>

        {/* Profile / Logout at bottom */}
        <div className="flex flex-col gap-4 w-full px-2">
          <button 
            onClick={handleLogout}
            className="p-3 rounded-xl flex justify-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors group"
            title="Log Out"
          >
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-semibold border-2 border-slate-600 self-center overflow-hidden">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               profile?.full_name?.charAt(0).toUpperCase() || 'U'
             )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-app)] overflow-hidden relative z-10">
        <div className="md:hidden sticky top-0 z-20 bg-[var(--bg-panel)] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="font-semibold">Niyoplan</div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary p-2" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="btn-secondary p-2" onClick={handleLogout} title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="hidden md:flex absolute top-4 right-4 z-30">
          <button className="btn-secondary p-2" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative z-10 w-full">
            <Outlet />
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-panel)] border-t border-slate-800 px-4 py-2 flex items-center justify-around">
          <NavLink to="/" end className={({ isActive }) => `p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}>
            <LayoutDashboard size={20} />
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}>
            <FolderKanban size={20} />
          </NavLink>
          {profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `p-2 rounded-lg ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}>
              <Settings size={20} />
            </NavLink>
          )}
        </nav>
      </main>
      
    </div>
  );
}
