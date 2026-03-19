import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import './SprintManager.css';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

function DraggableIssue({ issue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${issue.id}`,
    data: { issueId: issue.id }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className={`backlog-row ${isDragging ? 'dragging' : ''}`} {...attributes} {...listeners}>
      <span className="backlog-prefix">{issue.custom_id}</span>
      <span className="backlog-title">{issue.title}</span>
      <div className="backlog-meta">
        <span className="story-points">{issue.story_points || '-'}</span>
      </div>
    </div>
  );
}

function DropZone({ id, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`sprint-dropzone ${isOver ? 'dropzone-over' : ''}`}>
      {children}
    </div>
  );
}

export default function SprintManager({ projectId, refreshNonce = 0 }) {
  const [sprints, setSprints] = useState([]);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchSprintsAndBacklog = useCallback(async () => {
    try {
      const [sprintsRes, cardsRes] = await Promise.all([
        supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('cards').select('*').eq('project_id', projectId).order('rank', { ascending: true })
      ]);

      if (sprintsRes.error) throw sprintsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setSprints(sprintsRes.data);
      setCards(cardsRes.data || []);
    } catch (err) {
      toast.error('Failed to load Sprint data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchSprintsAndBacklog();
    }
  }, [projectId, refreshNonce, fetchSprintsAndBacklog]);

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

  const backlog = useMemo(() => cards.filter((card) => !card.sprint_id), [cards]);

  const cardsBySprint = useMemo(() => {
    const map = new Map();
    cards.forEach((card) => {
      if (!card.sprint_id) return;
      if (!map.has(card.sprint_id)) map.set(card.sprint_id, []);
      map.get(card.sprint_id).push(card);
    });
    return map;
  }, [cards]);

  const assignCardToSprint = async (cardId, sprintId) => {
    const previousCards = cards;
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, sprint_id: sprintId } : card)));

    const { error } = await supabase.from('cards').update({ sprint_id: sprintId }).eq('id', cardId);
    if (error) {
      setCards(previousCards);
      toast.error('Failed to update sprint assignment');
      return;
    }
    toast.success(sprintId ? 'Issue moved to sprint' : 'Issue moved to backlog');
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const activeId = String(active.id);
    if (!activeId.startsWith('card-')) return;
    const cardId = activeId.replace('card-', '');

    const overId = String(over.id);
    let targetSprintId = null;
    if (overId.startsWith('sprint-')) {
      targetSprintId = overId.replace('sprint-', '');
    } else if (overId !== 'backlog') {
      return;
    }

    const currentCard = cards.find((card) => card.id === cardId);
    if (!currentCard || currentCard.sprint_id === targetSprintId) return;
    await assignCardToSprint(cardId, targetSprintId);
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
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="sprint-list">
          {sprints.map(sprint => {
            const sprintIssues = cardsBySprint.get(sprint.id) || [];
            return (
              <div key={sprint.id} className={`sprint-container ${sprint.status}`}>
                <div className="sprint-container-header">
                  <div className="sprint-info">
                    <h3>{sprint.name}</h3>
                    <span className={`sprint-badge ${sprint.status}`}>
                      {sprint.status.toUpperCase()}
                    </span>
                    <span className="issue-count">{sprintIssues.length} issues</span>
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

                <DropZone id={`sprint-${sprint.id}`}>
                  {sprintIssues.length ? (
                    <div className="backlog-items w-full">
                      {sprintIssues.map((item) => (
                        <DraggableIssue key={item.id} issue={item} />
                      ))}
                    </div>
                  ) : (
                    <p className="empty-sprint-text">Drop issues here to plan this sprint.</p>
                  )}
                </DropZone>
              </div>
            );
          })}
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
            <button className="btn-outline" onClick={() => toast('Use the top Create Issue button')}>+ Create Issue</button>
          </div>

          <DropZone id="backlog">
            <div className="backlog-items w-full">
              {backlog.map(item => (
                <DraggableIssue key={item.id} issue={item} />
              ))}
              {backlog.length === 0 && (
                <div className="p-4 text-slate-500">Backlog is empty.</div>
              )}
            </div>
          </DropZone>
        </div>
      </DndContext>
    </div>
  );
}
