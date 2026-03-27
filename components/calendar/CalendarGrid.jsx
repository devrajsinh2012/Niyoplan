'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachHourOfInterval,
  format,
  addDays,
  startOfToday,
  parseISO,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useScheduleStore } from '@/context/ScheduleStore';
import './CalendarGrid.css';
import { GenericPageSkeleton } from '@/components/ui/PageSkeleton';

const VIEW_TYPES = ['month', 'week', 'day', 'agenda'];

/**
 * Unified Calendar Grid Component
 * Supports Month, Week, Day, and Agenda views for unified planning
 * Integrates with planning API for schedule items and dependencies
 */
export default function CalendarGrid({
  projectId,
  onItemSelect,
  onItemDragEnd,
  onItemCreate,
}) {
  // Use shared schedule store (automatically syncs across views)
  const {
    scheduleItems: storeItems,
    isLoading: storeLoading,
    updateScheduleItem,
  } = useScheduleStore();

  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [selectedItem, setSelectedItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  // Day view inline writing state
  const [inlineHour, setInlineHour] = useState(null); // hour slot clicked
  const [inlineText, setInlineText] = useState('');
  const [dayNotes, setDayNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`niyoplan-day-notes-${projectId}`) || '{}');
    } catch { return {}; }
  });

  const saveDayNote = (dateStr, hour, text) => {
    if (!text.trim()) { setInlineHour(null); return; }
    const key = `${dateStr}_${hour}`;
    const updated = { ...dayNotes, [key]: text.trim() };
    setDayNotes(updated);
    try { localStorage.setItem(`niyoplan-day-notes-${projectId}`, JSON.stringify(updated)); } catch {}
    setInlineHour(null);
    setInlineText('');
    toast.success('Note saved');
  };

  useEffect(() => {
    if (selectedItem && typeof onItemSelect === 'function') {
      onItemSelect(selectedItem);
    }
  }, [selectedItem, onItemSelect]);

  // Month view renderer
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Group schedule items by date
    const itemsByDate = {};
    storeItems.forEach((item) => {
      const itemDate = format(parseISO(item.start_date), 'yyyy-MM-dd');
      if (!itemsByDate[itemDate]) itemsByDate[itemDate] = [];
      itemsByDate[itemDate].push(item);
    });

    return (
      <div className="calendar-month-grid">
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="calendar-weekday-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDate[dayKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, startOfToday());

            return (
              <div
                key={dayKey}
                className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                  isToday ? 'today' : ''
                }`}
              >
                <div className="calendar-day-number">{format(day, 'd')}</div>
                <div className="calendar-day-items">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={`calendar-item calendar-item-${item.priority}`}
                      onClick={() => setSelectedItem(item)}
                      title={item.title}
                    >
                      <span className="calendar-item-title">{item.custom_id || item.title}</span>
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="calendar-item-overflow">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week view renderer
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = eachHourOfInterval({
      start: new Date(weekStart.setHours(6, 0, 0, 0)),
      end: new Date(weekEnd.setHours(20, 0, 0, 0)),
    });

    // Group items by day
    const itemsByDay = {};
    weekDays.forEach((day) => {
      itemsByDay[format(day, 'yyyy-MM-dd')] = [];
    });

    storeItems.forEach((item) => {
      const itemDate = format(parseISO(item.start_date), 'yyyy-MM-dd');
      if (itemsByDay[itemDate]) {
        itemsByDay[itemDate].push(item);
      }
    });

    return (
      <div className="calendar-week-grid">
        <div className="calendar-week-header">
          <div className="calendar-week-time-gutter" />
          {weekDays.map((day) => (
            <div key={format(day, 'yyyy-MM-dd')} className="calendar-week-day-header">
              <div className="calendar-week-day-name">{format(day, 'EEE')}</div>
              <div className={`calendar-week-day-number ${isSameDay(day, startOfToday()) ? 'today' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        <div className="calendar-week-body">
          <div className="calendar-week-times">
            {hours.map((hour) => (
              <div key={hour.toISOString()} className="calendar-time-slot">
                {format(hour, 'ha')}
              </div>
            ))}
          </div>

          {weekDays.map((day) => (
            <div key={format(day, 'yyyy-MM-dd')} className="calendar-week-column">
              {itemsByDay[format(day, 'yyyy-MM-dd')].map((item) => (
                <div
                  key={item.id}
                  className={`calendar-week-item calendar-item-${item.priority}`}
                  onClick={() => setSelectedItem(item)}
                  draggable
                  onDragStart={() => setDraggedItem(item)}
                  title={item.title}
                >
                  <div className="calendar-item-title">{item.title}</div>
                  <div className="calendar-item-time">
                    {format(parseISO(item.start_date), 'h:mm a')} -{' '}
                    {format(parseISO(item.end_date), 'h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Day view renderer
  const renderDayView = () => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(21, 0, 0, 0);
    const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    const dayItems = storeItems.filter((item) =>
      isSameDay(parseISO(item.start_date), currentDate)
    );

    return (
      <div className="calendar-day-view">
        <div className="calendar-day-date">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
          <span style={{ fontSize: '11px', marginLeft: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Click any empty slot to add a note
          </span>
        </div>
        <div className="calendar-day-timeline">
          {hours.map((hour) => {
            const hourKey = `${dateStr}_${hour.getHours()}`;
            const existingNote = dayNotes[hourKey];
            const isEditing = inlineHour === hour.getHours();
            const hourItems = dayItems.filter((item) => parseISO(item.start_date).getHours() === hour.getHours());

            return (
              <div key={hour.toISOString()} className="calendar-day-hour">
                <div className="calendar-day-time">{format(hour, 'h a')}</div>
                <div className="calendar-day-events"
                  style={{ cursor: hourItems.length === 0 && !isEditing ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (hourItems.length === 0 && !isEditing) {
                      setInlineHour(hour.getHours());
                      setInlineText(existingNote || '');
                    }
                  }}
                >
                  {hourItems.map((item) => (
                    <div
                      key={item.id}
                      className={`calendar-day-event calendar-item-${item.priority}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                    >
                      <div className="calendar-event-title">{item.title}</div>
                      <div className="calendar-event-time">
                        {format(parseISO(item.start_date), 'h:mm a')} -{' '}
                        {format(parseISO(item.end_date), 'h:mm a')}
                      </div>
                    </div>
                  ))}

                  {/* Inline note editor */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }} onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={inlineText}
                        onChange={e => setInlineText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveDayNote(dateStr, hour.getHours(), inlineText);
                          if (e.key === 'Escape') { setInlineHour(null); setInlineText(''); }
                        }}
                        placeholder="Add a note for this hour... (Enter to save, Esc to cancel)"
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          padding: '5px 10px',
                          border: '1px solid #0C66E4',
                          borderRadius: '6px',
                          outline: 'none',
                          background: '#fff',
                          color: '#172B4D',
                          boxShadow: '0 0 0 2px rgba(12,102,228,0.15)',
                        }}
                      />
                      <button
                        onClick={() => saveDayNote(dateStr, hour.getHours(), inlineText)}
                        style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, background: '#0C66E4', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >Save</button>
                      <button
                        onClick={() => { setInlineHour(null); setInlineText(''); }}
                        style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, background: 'transparent', color: '#6B778C', border: '1px solid #DFE1E6', borderRadius: '6px', cursor: 'pointer' }}
                      >✕</button>
                    </div>
                  ) : existingNote ? (
                    <div
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: '#FFF7D1',
                        border: '1px solid #F7C948',
                        borderRadius: '6px',
                        color: '#172B4D',
                        cursor: 'pointer',
                        marginTop: '2px',
                      }}
                      onClick={(e) => { e.stopPropagation(); setInlineHour(hour.getHours()); setInlineText(existingNote); }}
                    >
                      📝 {existingNote}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Agenda view renderer
  const renderAgendaView = () => {
    const agendaItems = [...storeItems].sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );

    return (
      <div className="calendar-agenda-view">
        <div className="calendar-agenda-list">
          {agendaItems.length === 0 ? (
            <div className="calendar-agenda-empty">No upcoming items</div>
          ) : (
            agendaItems.map((item) => (
              <div
                key={item.id}
                className={`calendar-agenda-item calendar-item-${item.priority}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="agenda-item-date">
                  {format(parseISO(item.start_date), 'MMM d')}
                </div>
                <div className="agenda-item-content">
                  <div className="agenda-item-title">{item.title}</div>
                  <div className="agenda-item-meta">
                    <span className="agenda-item-time">
                      {format(parseISO(item.start_date), 'h:mm a')}
                    </span>
                    {item.assignee && (
                      <span className="agenda-item-assignee">{item.assignee.full_name}</span>
                    )}
                    <span className={`agenda-item-status status-${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const handlePrevious = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addDays(currentDate, -30));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, -7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'agenda':
        setCurrentDate(addDays(currentDate, -7));
        break;
      default:
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addDays(currentDate, 30));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, 7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'agenda':
        setCurrentDate(addDays(currentDate, 7));
        break;
      default:
        break;
    }
  };

  if (storeLoading) return <GenericPageSkeleton />;

  return (
    <div className="calendar-grid-container">
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          <h2 className="calendar-title">
            <Calendar size={20} />
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')}`}
            {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
            {view === 'agenda' && 'Agenda'}
          </h2>
          <div className="calendar-nav">
            <button onClick={handlePrevious} className="calendar-nav-btn" title="Previous">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentDate(startOfToday())}
              className="calendar-nav-btn calendar-nav-today"
            >
              Today
            </button>
            <button onClick={handleNext} className="calendar-nav-btn" title="Next">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="calendar-view-selector">
          {VIEW_TYPES.map((viewType) => (
            <button
              key={viewType}
              className={`calendar-view-btn ${view === viewType ? 'active' : ''}`}
              onClick={() => {
                setView(viewType);
                setCurrentDate(startOfToday());
              }}
            >
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-content">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
      </div>
    </div>
  );
}
