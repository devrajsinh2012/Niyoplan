'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, addDays, startOfToday, eachDayOfInterval, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { Plus, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useScheduleStore } from '@/context/ScheduleStore';
import './GanttChart.css';
import { GanttPanelSkeleton } from '@/components/ui/PageSkeleton';
import DependencyManager from './DependencyManager';

const ZOOM_LEVELS = {
  compact: 24,
  comfortable: 40,
  spacious: 64
};

const ROW_HEIGHT = 52; // Responsive row height (updated from hardcoded 48px)

/**
 * Modernized Gantt Chart Component
 * - Consumes unified planning API
 * - Full dependency type support (finish_start, finish_finish, start_start, start_finish)
 * - Fixed scroll-sync with SVG overlay
 * - "Today" reference line
 * - Baseline + progress tracking
 * - Critical path highlighting
 */
const GanttChart = ({ projectId, refreshNonce = 0 }) => {
  // Use shared schedule store (automatically syncs across views)
  const {
    scheduleItems: storeItems,
    dependencies: storeDeps,
    isLoading: storeLoading,
    updateScheduleItem,
    refetchScheduleData
  } = useScheduleStore();

  const [localItems, setLocalItems] = useState([]);
  const [zoom, setZoom] = useState('comfortable');
  const [dragging, setDragging] = useState(null); // { itemId, type: 'move'|'resize-left'|'resize-right', startX, initialStart, initialEnd }
  const [selectedDependencyId, setSelectedDependencyId] = useState(null);
  const [showDependencyManager, setShowDependencyManager] = useState(false);

  const timelineHeaderRef = useRef(null);
  const timelineBodyRef = useRef(null);
  const svgRef = useRef(null);

  const dayWidth = ZOOM_LEVELS[zoom];
  const today = startOfToday();
  const startDate = addDays(today, -14);
  const endDate = addDays(today, 45);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    setLocalItems(storeItems);
  }, [storeItems]);

  // Sync scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (timelineBodyRef.current && timelineHeaderRef.current && svgRef.current) {
      const scrollLeft = timelineBodyRef.current.scrollLeft;
      timelineHeaderRef.current.scrollLeft = scrollLeft;
      svgRef.current.style.transform = `translateX(-${scrollLeft}px)`;
    }
  }, []);

  // Drag handlers
  const handleMouseDown = (e, item, type) => {
    e.preventDefault();
    setDragging({
      itemId: item.id,
      type,
      startX: e.clientX,
      initialStart: new Date(item.start_date),
      initialEnd: new Date(item.end_date),
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;

    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== dragging.itemId) return item;

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

        return {
          ...item,
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString(),
        };
      })
    );
  }, [dragging, dayWidth]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;

    const item = localItems.find((c) => c.id === dragging.itemId);
    if (!item) {
      setDragging(null);
      return;
    }

    setDragging(null);

    try {
      // Use shared store to update (syncs across all views)
      await updateScheduleItem(item.id, {
        start_date: item.start_date,
        due_date: item.end_date,
      }, { silent: true });
    } catch (err) {
      console.error('Error updating item dates:', err);
      setLocalItems(storeItems);
    }
  }, [dragging, localItems, storeItems, updateScheduleItem]);

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

  // Compute task styles with proper date positioning
  const getItemStyle = (item) => {
    const start = parseISO(item.start_date);
    const end = parseISO(item.end_date);

    // Hide malformed items rather than rendering visual artifacts.
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { display: 'none' };
    }

    const leftOffset = differenceInDays(start, startDate) * dayWidth;
    const duration = Math.max(1, differenceInDays(end, start) + 1);
    const width = duration * dayWidth;

    const bgColor = item.is_critical_path
      ? '#dc2626'
      : item.priority === 'urgent'
      ? '#dc2626'
      : item.priority === 'high'
      ? '#ea8c55'
      : item.priority === 'low'
      ? '#8b5cf6'
      : '#2563eb';

    return {
      left: `${leftOffset}px`,
      width: `${width}px`,
      backgroundColor: bgColor,
      opacity: item.progress_percent ? `${0.5 + item.progress_percent / 200}` : '1',
    };
  };

  // Render dependency lines with proper positioning
  const renderDependencyLines = useMemo(() => {
      if (!svgRef.current) return null;

      const lines = storeDeps
        .map((dep) => {
          const source = localItems.find((item) => item.id === dep.predecessor_id);
          const target = localItems.find((item) => item.id === dep.successor_id);

          if (!source || !target) return null;

          const sourceStart = parseISO(source.start_date);
          const sourceEnd = parseISO(source.end_date);
          const targetStart = parseISO(target.start_date);

          const sourceIdx = localItems.indexOf(source);
          const targetIdx = localItems.indexOf(target);

          // Calculate endpoints based on dependency type
          let x1, y1, x2, y2;

          const sourceDuration = Math.max(1, differenceInDays(sourceEnd, sourceStart) + 1);
          x1 = (differenceInDays(sourceEnd, startDate) + 1) * dayWidth; // Right edge of source
          y1 = sourceIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

          x2 = differenceInDays(targetStart, startDate) * dayWidth; // Left edge of target
          y2 = targetIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

          // Add lead/lag offset if present
          const lagOffset = (dep.lead_or_lag_days || 0) * dayWidth;
          x2 += lagOffset;

          const labelText = `${dep.type}${dep.lead_or_lag_days ? ' ' + dep.lead_or_lag_days + 'd' : ''}`;

          return (
            <g key={dep.id} className={`dependency-group ${selectedDependencyId === dep.id ? 'selected' : ''}`}>
              {/* Quadratic bezier path */}
              <path
                d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} Q ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`}
                className="dependency-line"
                markerEnd="url(#arrowhead)"
                onClick={() => {
                  setSelectedDependencyId(dep.id === selectedDependencyId ? null : dep.id);
                  if (dep.id !== selectedDependencyId) {
                    setShowDependencyManager(true);
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
              {/* Label */}
              <text
                x={(x1 + x2) / 2}
                y={Math.min(y1, y2) - 8}
                className="dependency-label"
                textAnchor="middle"
              >
                {labelText}
              </text>
            </g>
          );
        })
        .filter(Boolean);

      const svgHeight = localItems.length * ROW_HEIGHT + 100;
      const svgWidth = days.length * dayWidth + 200;

      return (
        <svg
          ref={svgRef}
          className="gantt-svg-overlay"
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(59, 130, 246, 0.6)" />
            </marker>
          </defs>
          {lines}
        </svg>
      );
  }, [storeDeps, localItems, startDate, dayWidth, days.length, selectedDependencyId]);

  // Export to CSV
  const exportTimelineCSV = () => {
    if (!storeItems.length) {
      toast.error('No timeline data to export');
      return;
    }

    const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Start Date', 'End Date', 'Progress %', 'Assignee'];
    const rows = storeItems.map((item) => [
      item.custom_id || item.id,
      (item.title || '').replaceAll('"', '""'),
      item.priority || '',
      item.status || '',
      format(parseISO(item.start_date), 'yyyy-MM-dd'),
      format(parseISO(item.end_date), 'yyyy-MM-dd'),
      item.progress_percent || 0,
      item.assignee?.full_name || '',
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

  if (storeLoading) return <GanttPanelSkeleton />;

  return (
    <div className="gantt-container glass-panel" style={{ '--day-width': `${dayWidth}px`, '--row-height': `${ROW_HEIGHT}px` }}>
      <div className="gantt-toolbar">
        <div className="gantt-zoom-controls">
          <span className="gantt-toolbar-label">Zoom</span>
          <button
            className={`zoom-btn ${zoom === 'compact' ? 'active' : ''}`}
            onClick={() => setZoom('compact')}
          >
            Compact
          </button>
          <button
            className={`zoom-btn ${zoom === 'comfortable' ? 'active' : ''}`}
            onClick={() => setZoom('comfortable')}
          >
            Comfortable
          </button>
          <button
            className={`zoom-btn ${zoom === 'spacious' ? 'active' : ''}`}
            onClick={() => setZoom('spacious')}
          >
            Spacious
          </button>
        </div>
        <div className="gantt-toolbar-actions">
          <button
            className="gantt-action-btn"
            onClick={() => {
              setSelectedDependencyId(null);
              setShowDependencyManager(true);
            }}
            title="Create a new dependency"
          >
            <Plus size={16} /> Add Dependency
          </button>
          <button className="gantt-export-btn" onClick={exportTimelineCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Fixed header with scrollable timeline */}
      <div className="gantt-header-row">
        <div className="gantt-names-column">Task Name</div>
        <div className="gantt-timeline-header" ref={timelineHeaderRef}>
          {days.map((day) => (
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

      {/* Scrollable body with SVG overlay */}
      <div className="gantt-body">
        {localItems.length === 0 ? (
          <div className="gantt-empty">No items with dates found. Set start/end dates to see them here.</div>
        ) : (
          <>
            <div className="gantt-rows-container" ref={timelineBodyRef} onScroll={handleBodyScroll}>
              {/* SVG dependency lines */}
              {renderDependencyLines}

              {/* Today reference line */}
              <div
                className="gantt-today-line"
                style={{
                  left: `${differenceInDays(today, startDate) * dayWidth}px`,
                }}
              />

              {/* Rows */}
              {localItems.map((item, idx) => (
                <div key={item.id} className="gantt-row" style={{ height: `${ROW_HEIGHT}px` }}>
                  <div className="gantt-card-name">
                    <span className={`priority-dot ${item.priority}`} />
                    <span className="truncate" title={item.title}>
                      {item.custom_id ? `${item.custom_id} - ` : ''}{item.title}
                    </span>
                  </div>
                  <div className="gantt-timeline-row">
                    {item.progress_percent > 0 && (
                      <div
                        className="gantt-progress-bar"
                        style={{
                          left: `${Math.max(0, parseFloat(getItemStyle(item).left))}px`,
                          width: `${(parseFloat(getItemStyle(item).width) * item.progress_percent) / 100}px`,
                        }}
                      />
                    )}
                    <div
                      className={`gantt-task-bar ${dragging?.itemId === item.id ? 'dragging' : ''} ${
                        item.is_critical_path ? 'critical' : ''
                      }`}
                      style={getItemStyle(item)}
                      onMouseDown={(e) => handleMouseDown(e, item, 'move')}
                    >
                      <div
                        className="resize-handle left"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, item, 'resize-left');
                        }}
                      />
                      <span className="task-label">{item.custom_id || item.title}</span>
                      <div
                        className="resize-handle right"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, item, 'resize-right');
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dependency Manager Modal */}
      <DependencyManager
        isOpen={showDependencyManager}
        onClose={() => {
          setShowDependencyManager(false);
          setSelectedDependencyId(null);
        }}
        scheduleItems={storeItems}
        selectedDependency={
          selectedDependencyId ? storeDeps.find(d => d.id === selectedDependencyId) : null
        }
        onCreateDependency={refetchScheduleData}
        onUpdateDependency={refetchScheduleData}
        onDeleteDependency={refetchScheduleData}
        projectId={projectId}
      />
    </div>
  );
};

export default GanttChart;
