import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated successfully');
    } catch (err) {
      toast.error('Failed to update role');
      console.error(err);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      pm: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      member: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      viewer: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    };
    return badges[role] || badges.viewer;
  };

  return (
    <div className="max-w-6xl mx-auto w-full animate-fade-in pb-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ShieldAlert className="text-rose-500" />
          Admin Settings
        </h1>
        <p className="text-slate-400">Manage user roles and workspace permissions.</p>
      </header>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
          <Users className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">Users & Roles</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium border-b border-slate-700">User</th>
                  <th className="p-4 font-medium border-b border-slate-700">Email ID</th>
                  <th className="p-4 font-medium border-b border-slate-700 text-center">Current Role</th>
                  <th className="p-4 font-medium border-b border-slate-700">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
                           {user.avatar_url ? (
                             <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                           ) : (
                             user.full_name?.charAt(0) || 'U'
                           )}
                        </div>
                        <span className="font-medium text-white">{user.full_name || 'Unnamed User'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-slate-400">{user.id.substring(0,8)}...</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadge(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <select 
                        className="input-dark py-1.5 px-3 text-sm w-36"
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="pm">Project Manager</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
