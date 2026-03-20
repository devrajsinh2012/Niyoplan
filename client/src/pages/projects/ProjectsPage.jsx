import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, Plus, Star, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { profile } = useAuth();
  
  // New Project Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles ( full_name, avatar_url )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data);
    } catch (err) {
      toast.error('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          prefix: prefix.toUpperCase(),
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Project prefix must be unique');
        throw error;
      }

      await supabase.from('lists').insert(DEFAULT_LISTS.map((list) => ({
        project_id: project.id,
        name: list.name,
        rank: list.rank
      })));

      toast.success('Project created!');
      setShowModal(false);
      setName('');
      setDescription('');
      setPrefix('');
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!prefix || prefix.length < 4) {
      const words = val.split(' ').filter(w => w.length > 0);
      let newPrefix = '';
      if (words.length === 1) {
        newPrefix = words[0].substring(0, 4).toUpperCase();
      } else {
        newPrefix = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
      }
      setPrefix(newPrefix);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border-strong)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      
      {/* ── Header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>
            View and manage all your workspace projects.
          </p>
        </div>
        
        {['admin', 'pm'].includes(profile?.role) && (
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Create Project
          </button>
        )}
      </header>

      {/* ── Search / Filter Bar (Placeholder UI) ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input 
          type="text" 
          placeholder="Search projects" 
          style={{ 
            width: 300, padding: '8px 12px', background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)', fontSize: 13
          }} 
        />
        <select style={{ 
          padding: '8px 12px', background: 'var(--bg-panel)',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', fontSize: 13
        }}>
          <option>All Projects</option>
          <option>My Projects</option>
          <option>Starred</option>
        </select>
      </div>

      {/* ── Project Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
            <FolderKanban size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: 18, color: 'var(--text-heading)', marginBottom: 8 }}>No projects found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13 }}>Create your first project to start tracking work.</p>
            {['admin', 'pm'].includes(profile?.role) && (
              <button className="btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
            )}
          </div>
        ) : (
          projects.map(project => (
            <Link 
              to={`/projects/${project.id}`} 
              key={project.id}
              className="card"
              style={{
                display: 'block', padding: 20, textDecoration: 'none',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--accent-primary), #6554C0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1
                  }}>
                    {project.prefix}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px', lineHeight: 1.2 }}>
                      {project.name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Software Project</div>
                  </div>
                </div>
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                  onClick={e => e.preventDefault()}
                >
                  <Star size={16} />
                </button>
              </div>
              
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
                margin: '0 0 20px 0', height: 40,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {project.description || 'Manage tasks, bugs, and features for this project.'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: -8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface-hover)',
                    border: '2px solid var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, overflow: 'hidden', position: 'relative', zIndex: 3
                  }} title={project.profiles?.full_name}>
                    {project.profiles?.avatar_url 
                      ? <img src={project.profiles.avatar_url} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                      : (project.profiles?.full_name?.charAt(0) || '?')}
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface-hover)',
                    border: '2px solid var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, marginLeft: -8, position: 'relative', zIndex: 2
                  }}>+4</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                  <Activity size={12} /> Active
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 30, 66, 0.54)', backdropFilter: 'blur(2px)', 
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 480, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>Create Project</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Project Name <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <input
                  type="text" required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-panel)', border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, transition: 'var(--transition-fast)' }}
                  placeholder="e.g. Website Redesign"
                  value={name} onChange={handleNameChange}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Key (Prefix) <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <input
                  type="text" required maxLength={6}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-panel)', border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, textTransform: 'uppercase', fontFamily: 'monospace' }}
                  value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0 0' }}>Tickets will look like {prefix || 'WEB'}-123</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Description (Optional)
                </label>
                <textarea
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-panel)', border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, minHeight: 80, resize: 'vertical' }}
                  value={description} onChange={e => setDescription(e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
