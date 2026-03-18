import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, addDays, startOfToday, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './GanttChart.css';

const ZOOM_LEVELS = {
  compact: 24,
  comfortable: 40,
  spacious: 64
};

const GanttChart = ({ projectId }) => {
  const [cards, setCards] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState('comfortable');
  const [dragging, setDragging] = useState(null); // { cardId, type: 'move'|'resize-left'|'resize-right', startX, initialStart, initialEnd }
  const timelineRef = useRef(null);
  const dayWidth = ZOOM_LEVELS[zoom];

  const today = startOfToday();
  const startDate = addDays(today, -14); // Wider range
  const endDate = addDays(today, 45);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, depsRes] = await Promise.all([
        supabase.from('cards').select('*').eq('project_id', projectId).not('start_date', 'is', null).order('start_date', { ascending: true }),
        supabase.from('card_dependencies').select('*').eq('project_id', projectId)
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (depsRes.error) throw depsRes.error;

      setCards(cardsRes.data);
      setDependencies(depsRes.data);
    } catch (err) {
      console.error('Error fetching Gantt data:', err);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMouseDown = (e, card, type) => {
    e.preventDefault();
    setDragging({
      cardId: card.id,
      type,
      startX: e.clientX,
      initialStart: new Date(card.start_date),
      initialEnd: new Date(card.due_date || card.start_date)
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;

    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    setCards(prev => prev.map(c => {
      if (c.id !== dragging.cardId) return c;
      
      let newStart = new Date(dragging.initialStart);
      let newEnd = new Date(dragging.initialEnd);

      if (dragging.type === 'move') {
        newStart = addDays(newStart, deltaDays);
        newEnd = addDays(newEnd, deltaDays);
      } else if (dragging.type === 'resize-left') {
        newStart = addDays(newStart, deltaDays);
        if (newStart > newEnd) newStart = newEnd;
      } else if (dragging.type === 'resize-right') {
        newEnd = addDays(newEnd, deltaDays);
        if (newEnd < newStart) newEnd = newStart;
      }

      return { ...c, start_date: newStart.toISOString(), due_date: newEnd.toISOString() };
    }));
  }, [dragging, dayWidth]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;

    const card = cards.find(c => c.id === dragging.cardId);
    if (!card) {
      setDragging(null);
      return;
    }
    setDragging(null);

    try {
      const { error } = await supabase
        .from('cards')
        .update({ 
          start_date: card.start_date, 
          due_date: card.due_date 
        })
        .eq('id', card.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating card dates:', err);
      toast.error('Failed to save changes');
      fetchData(); // Rollback UI
    }
  }, [cards, dragging, fetchData]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const getTaskStyle = (card) => {
    const start = new Date(card.start_date);
    const end = new Date(card.due_date || card.start_date);
    
    const leftOffset = differenceInDays(start, startDate) * dayWidth;
    const width = Math.max(dayWidth, (differenceInDays(end, start) + 1) * dayWidth);
    
    return {
      left: `${leftOffset}px`,
      width: `${width}px`,
      backgroundColor: card.priority === 'urgent' ? 'var(--status-danger)' : 
                       card.priority === 'high' ? 'var(--status-warning)' : 
                       'var(--accent-primary)'
    };
  };

  // Logic for drawing dependency lines (simplified)
  const renderDependencyLines = () => {
    return (
      <svg className="gantt-svg-overlay">
        {dependencies.map(dep => {
          const pred = cards.find(c => c.id === dep.predecessor_id);
          const succ = cards.find(c => c.id === dep.successor_id);
          if (!pred || !succ) return null;

          const predIdx = cards.indexOf(pred);
          const succIdx = cards.indexOf(succ);

          const predEnd = new Date(pred.due_date || pred.start_date);
          const succStart = new Date(succ.start_date);

          const x1 = (differenceInDays(predEnd, startDate) + 1) * dayWidth;
          const y1 = predIdx * 48 + 24; // 48 is row height, 24 is middle

          const x2 = differenceInDays(succStart, startDate) * dayWidth;
          const y2 = succIdx * 48 + 24;

          return (
            <path 
              key={dep.id}
              d={`M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`}
              className="dependency-line"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>
      </svg>
    );
  };

  const exportTimelineCsv = () => {
    if (!cards.length) {
      toast.error('No timeline data to export');
      return;
    }

    const headers = ['Card ID', 'Title', 'Priority', 'Status', 'Start Date', 'Due Date'];
    const rows = cards.map((card) => [
      card.custom_id || card.id,
      (card.title || '').replaceAll('"', '""'),
      card.priority || '',
      card.status || '',
      card.start_date ? format(new Date(card.start_date), 'yyyy-MM-dd') : '',
      card.due_date ? format(new Date(card.due_date), 'yyyy-MM-dd') : ''
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gantt-${projectId}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="gantt-loading">Loading Timeline...</div>;

  return (
    <div className="gantt-container glass-panel" style={{ '--day-width': `${dayWidth}px` }}>
      <div className="gantt-toolbar">
        <div className="gantt-zoom-controls">
          <span className="gantt-toolbar-label">Zoom</span>
          <button className={`zoom-btn ${zoom === 'compact' ? 'active' : ''}`} onClick={() => setZoom('compact')}>Compact</button>
          <button className={`zoom-btn ${zoom === 'comfortable' ? 'active' : ''}`} onClick={() => setZoom('comfortable')}>Comfortable</button>
          <button className={`zoom-btn ${zoom === 'spacious' ? 'active' : ''}`} onClick={() => setZoom('spacious')}>Spacious</button>
        </div>
        <button className="gantt-export-btn" onClick={exportTimelineCsv}>Export CSV</button>
      </div>

      <div className="gantt-header-row">
        <div className="gantt-names-column">Task Name</div>
        <div className="gantt-timeline-header" ref={timelineRef}>
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={`gantt-day-header ${isSameDay(day, today) ? 'today' : ''}`}
              style={{ minWidth: `${dayWidth}px`, width: `${dayWidth}px` }}
            >
              <span className="day-num">{format(day, 'd')}</span>
              <span className="day-name">{format(day, 'EEE')}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="gantt-body">
        {cards.length === 0 ? (
          <div className="gantt-empty">No cards with dates found. Set a start date to see them here.</div>
        ) : (
          <div className="gantt-rows-container">
            {renderDependencyLines()}
            {cards.map(card => (
              <div key={card.id} className="gantt-row">
                <div className="gantt-card-name">
                  <span className={`priority-dot ${card.priority}`}></span>
                  <span className="truncate">{card.title}</span>
                </div>
                <div className="gantt-timeline-row">
                  <div 
                    className={`gantt-task-bar ${dragging?.cardId === card.id ? 'dragging' : ''}`}
                    style={getTaskStyle(card)}
                    onMouseDown={(e) => handleMouseDown(e, card, 'move')}
                  >
                    <div className="resize-handle left" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, card, 'resize-left'); }} />
                    <span className="task-label">{card.title}</span>
                    <div className="resize-handle right" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, card, 'resize-right'); }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttChart;
