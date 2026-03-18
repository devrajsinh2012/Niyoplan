import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, Plus, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const { data, error } = await supabase
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

  // Auto-generate prefix from name
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

  return (
    <div className="max-w-7xl mx-auto w-full animate-fade-in pb-10">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FolderKanban className="text-blue-500" />
            Projects
          </h1>
          <p className="text-slate-400">Manage all your workspaces and boards.</p>
        </div>
        
        {['admin', 'pm'].includes(profile?.role) && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            New Project
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link 
              to={`/projects/${project.id}`} 
              key={project.id}
              className="glass-card rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-blue-400">
                  {project.prefix}
                </div>
                <button className="text-slate-500 hover:text-white p-1 rounded transition-colors" onClick={(e) => e.preventDefault()}>
                  <MoreVertical size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{project.name}</h3>
              <p className="text-slate-400 text-sm line-clamp-2 mb-6 h-10">
                {project.description || 'No description provided.'}
              </p>
              
              <div className="flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                    {project.profiles?.avatar_url ? (
                      <img src={project.profiles.avatar_url} alt="Creator" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center h-full w-full font-medium text-[10px] text-slate-300">
                        {project.profiles?.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card rounded-2xl border-dashed border-2 border-slate-700">
              <FolderKanban size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Create your first project to start managing tasks.</p>
              {['admin', 'pm'].includes(profile?.role) && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="btn-primary"
                >
                  Create Project
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-2xl p-8 border border-slate-700 relative shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>
            
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="label-dark" htmlFor="projectName">Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. Website Redesign"
                  value={name}
                  onChange={handleNameChange}
                />
              </div>

              <div>
                <label className="label-dark" htmlFor="projectPrefix">Prefix (Ticket ID)</label>
                <input
                  id="projectPrefix"
                  type="text"
                  required
                  maxLength={6}
                  className="input-dark uppercase font-mono"
                  placeholder="e.g. WEB"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-slate-500 mt-1.5">Tickets will look like {prefix || 'WEB'}-123</p>
              </div>

              <div>
                <label className="label-dark" htmlFor="projectDesc">Description <span className="text-slate-500 font-normal">(Optional)</span></label>
                <textarea
                  id="projectDesc"
                  className="input-dark min-h-[100px] resize-y"
                  placeholder="Briefly describe the project goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary flex-1 flex justify-center items-center"
                >
                  {isCreating ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
