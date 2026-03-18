import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalProjects: 0, totalCards: 0, openCards: 0, doneCards: 0 });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    try {
      // In a real app we would call our /api/dashboard/stats endpoint via fetch()
      // Since we already have the supabase client here, we can query directly for MVP speed
      const [{ count: totalProjects }, { count: totalCards }, { count: doneCards }, { data: activityLogs }] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('cards').select('*', { count: 'exact', head: true }),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('activity_log').select('*, user:profiles(full_name, avatar_url), card:cards(custom_id, title)').order('created_at', { ascending: false }).limit(10)
      ]);

      setStats({
        totalProjects: totalProjects || 0,
        totalCards: totalCards || 0,
        openCards: (totalCards || 0) - (doneCards || 0),
        doneCards: doneCards || 0
      });

      setActivities(activityLogs || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const StatCard = ({ title, value, icon, colorClass }) => (
    <div className="glass-card rounded-2xl p-6 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-default">
      <div>
        <h3 className="text-slate-400 font-medium mb-1">{title}</h3>
        <p className="text-4xl font-bold text-white">{value}</p>
      </div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${colorClass}`}>
        {React.createElement(icon, { size: 28, className: 'text-white' })}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full animate-fade-in pb-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}</h1>
          <p className="text-slate-400">Here's what's happening across your workspace today.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard title="Active Projects" value={stats.totalProjects} icon={LayoutDashboard} colorClass="bg-blue-600 shadow-blue-500/30" />
            <StatCard title="Total Cards" value={stats.totalCards} icon={Clock} colorClass="bg-indigo-600 shadow-indigo-500/30" />
            <StatCard title="Open Tasks" value={stats.openCards} icon={AlertCircle} colorClass="bg-rose-500 shadow-rose-500/30" />
            <StatCard title="Completed" value={stats.doneCards} icon={CheckCircle} colorClass="bg-emerald-500 shadow-emerald-500/30" />
          </div>

          {/* Activity Feed */}
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            </div>
            
            <div className="divide-y divide-slate-800 p-2">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No activity recorded yet</div>
              ) : (
                activities.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-800/30 rounded-xl transition-colors flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-600">
                      {log.user?.avatar_url ? (
                        <img src={log.user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-medium text-slate-300">
                          {log.user?.full_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300">
                        <span className="font-medium text-white">{log.user?.full_name || 'Unknown User'}</span>
                        {' '}
                        {log.action === 'created' ? 'created card ' : 'updated card '}
                        <span className="font-medium text-blue-400">{log.card?.custom_id}</span>
                        {': '}
                        <span className="text-slate-200">{log.card?.title}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
