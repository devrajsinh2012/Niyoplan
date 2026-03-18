import React, { useState, useEffect } from 'react';
import './SprintManager.css';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

export default function SprintManager({ projectId }) {
  const [sprints, setSprints] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchSprintsAndBacklog();
    }
  }, [projectId]);

  const fetchSprintsAndBacklog = async () => {
    try {
      const [sprintsRes, cardsRes] = await Promise.all([
        supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('cards').select('*').eq('project_id', projectId).is('sprint_id', null).order('rank', { ascending: true })
      ]);

      if (sprintsRes.error) throw sprintsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setSprints(sprintsRes.data);
      setBacklog(cardsRes.data);
    } catch (err) {
      toast.error('Failed to load Sprint data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSprint = async () => {
    const name = prompt('Sprint Name (e.g. Sprint 4):');
    if (!name) return;

    const { data, error } = await supabase.from('sprints').insert({
      project_id: projectId,
      name,
      status: 'planning'
    }).select().single();

    if (error) {
      toast.error('Failed to create sprint');
    } else {
      setSprints([data, ...sprints]);
      toast.success('Sprint created');
    }
  };

  const updateSprintStatus = async (id, status) => {
    const { error } = await supabase.from('sprints').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      setSprints(sprints.map(s => s.id === id ? { ...s, status } : s));
      toast.success(`Sprint marked as ${status}`);
    }
  };

  if (isLoading) {
    return <div className="sprint-manager-wrapper"><div className="p-10 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div></div></div>;
  }

  return (
    <div className="sprint-manager-wrapper">
      <header className="sprint-header">
        <h2 className="sprint-title">Sprints & Backlog</h2>
        <button className="btn-primary" onClick={handleCreateSprint}>+ Create Sprint</button>
      </header>

      <div className="sprint-list">
        {sprints.map(sprint => (
          <div key={sprint.id} className={`sprint-container ${sprint.status}`}>
            <div className="sprint-container-header">
              <div className="sprint-info">
                <h3>{sprint.name}</h3>
                <span className={`sprint-badge ${sprint.status}`}>
                  {sprint.status.toUpperCase()}
                </span>
                {sprint.start_date && (
                  <span className="sprint-dates">
                    {new Date(sprint.start_date).toLocaleDateString()} - {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                )}
              </div>
              <div className="sprint-actions">
                {sprint.status === 'planning' && <button className="btn-outline" onClick={() => updateSprintStatus(sprint.id, 'active')}>Start Sprint</button>}
                {sprint.status === 'active' && <button className="btn-success" onClick={() => updateSprintStatus(sprint.id, 'completed')}>Complete Sprint</button>}
                <button className="btn-icon">⋯</button>
              </div>
            </div>
            
            <div className="sprint-dropzone">
              {sprint.status === 'active' ? (
                <p className="empty-sprint-text">Active sprint tasks are visible on the Kanban Board.</p>
              ) : (
                <p className="empty-sprint-text">Issue dragging from backlog to sprints is pending integration. For now, edit the issue to assign it to this sprint.</p>
              )}
            </div>
          </div>
        ))}
        {sprints.length === 0 && (
          <p className="text-slate-400 p-4">No sprints created yet.</p>
        )}
      </div>

      <div className="sprint-container backlog-container">
        <div className="sprint-container-header backlog-header">
          <div className="sprint-info">
            <h3>Backlog</h3>
            <span className="issue-count">{backlog.length} issues</span>
          </div>
          {/* Create issue button connects to parent project page technically, but we leave it inactive visually */}
          <button className="btn-outline" onClick={() => toast('Use the top Create Issue button')}>+ Create Issue</button>
        </div>
        
        <div className="backlog-items">
          {backlog.map(item => (
            <div key={item.id} className="backlog-row">
              <span className="backlog-prefix">{item.custom_id}</span>
              <span className="backlog-title">{item.title}</span>
              <div className="backlog-meta">
                <span className="story-points">{item.story_points || '-'}</span>
              </div>
            </div>
          ))}
          {backlog.length === 0 && (
            <div className="p-4 text-slate-500">Backlog is empty.</div>
          )}
        </div>
      </div>
    </div>
  );
}
