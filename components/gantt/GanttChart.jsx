'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  format,
  addDays,
  startOfToday,
  eachDayOfInterval,
  differenceInDays,
  parseISO,
  isWeekend
} from 'date-fns';
import { Plus, Search, Layers, Link as LinkIcon, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useScheduleStore } from '@/context/ScheduleStore';
import { useAuth } from '@/context/AuthContext';
import CardDetail from '@/components/kanban/CardDetail';
import './GanttChart.css';
import { GanttPanelSkeleton } from '@/components/ui/PageSkeleton';
import DependencyManager from './DependencyManager';

const TIMELINE_PRESETS = {
  days: { dayWidth: 32, showWeekendShade: true },
  weeks: { dayWidth: 14, showWeekendShade: true },
  months: { dayWidth: 6, showWeekendShade: false },
  quarters: { dayWidth: 3, showWeekendShade: false }
};

const TIMELINE_SCALE_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'quarters', label: 'Quarters' }
];

const ROW_HEIGHT = 52; // Responsive row height (updated from hardcoded 48px)
const GROUP_ROW_HEIGHT = 36;

const GROUP_BY_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'none', label: 'None' }
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' }
];

const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done'
};

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

const normalizeStatus = (value) => {
  const status = (value || '').trim().toLowerCase();
  if (status === 'to do') return 'todo';
  if (status === 'in progress') return 'in_progress';
  if (status === 'in review') return 'in_review';
  return status || 'backlog';
};

const getDateOrNull = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const numericDate = new Date(value);
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const parsed = parseISO(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getItemStartDate = (item) => getDateOrNull(item?.start_date || item?.due_date || item?.created_at);

const getItemEndDate = (item) =>
  getDateOrNull(item?.end_date || item?.due_date || item?.start_date || item?.created_at);

const isMilestoneItem = (item) => {
  const issueType = (item?.issue_type || '').toLowerCase();
  const itemType = (item?.type || '').toLowerCase();
  return issueType === 'milestone' || itemType === 'milestone' || item?.is_milestone === true;
};

const formatGroupName = (item, groupBy) => {
  if (groupBy === 'status') {
    const status = normalizeStatus(item.status);
    return {
      key: `status:${status}`,
      label: STATUS_LABELS[status] || 'Backlog',
      order: STATUS_ORDER.indexOf(status)
    };
  }

  if (groupBy === 'priority') {
    const priority = (item.priority || 'medium').toLowerCase();
    return {
      key: `priority:${priority}`,
      label: PRIORITY_LABELS[priority] || 'Medium',
      order: PRIORITY_ORDER.indexOf(priority)
    };
  }

  if (groupBy === 'assignee') {
    const assigneeName = item.assignee?.full_name || 'Unassigned';
    return {
      key: `assignee:${assigneeName}`,
      label: assigneeName,
      order: Number.MAX_SAFE_INTEGER
    };
  }

  return {
    key: 'all:all',
    label: 'All Tasks',
    order: 0
  };
};

const toTimestamp = (item) => {
  const start = getDateOrNull(item.start_date);
  if (start) return start.getTime();
  const fallback = getDateOrNull(item.created_at);
  return fallback ? fallback.getTime() : 0;
};

const buildSegments = (days, keyFactory, labelFactory) => {
  const segments = [];
  days.forEach((day, index) => {
    const key = keyFactory(day);
    if (!segments.length || segments[segments.length - 1].key !== key) {
      segments.push({
        key,
        label: labelFactory(day),
        startIndex: index,
        span: 1
      });
    } else {
      segments[segments.length - 1].span += 1;
    }
  });
  return segments;
};

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
  const { profile } = useAuth();

  // Use shared schedule store (automatically syncs across views)
  const {
    scheduleItems: storeItems,
    dependencies: storeDeps,
    isLoading: storeLoading,
    updateScheduleItem,
    createScheduleItem,
    createDependency,
    bulkUpdateItems,
    refetchScheduleData
  } = useScheduleStore();

  const [localItems, setLocalItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('status');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [quickCreate, setQuickCreate] = useState({
    isOpen: false,
    x: 24,
    y: 88,
    title: '',
    startDate: format(startOfToday(), 'yyyy-MM-dd'),
    dueDate: format(addDays(startOfToday(), 1), 'yyyy-MM-dd'),
    status: 'backlog',
    priority: 'medium'
  });
  const [timelineScale, setTimelineScale] = useState('weeks');
  const [dragging, setDragging] = useState(null); // { itemId, type: 'move'|'resize-left'|'resize-right', startX, initialStart, initialEnd }
  const [selectedDependencyId, setSelectedDependencyId] = useState(null);
  const [showDependencyManager, setShowDependencyManager] = useState(false);

  const containerRef = useRef(null);
  const timelineHeaderRef = useRef(null);
  const timelineBodyRef = useRef(null);
  const svgRef = useRef(null);
  const quickCreateRef = useRef(null);
  const previousScaleRef = useRef(timelineScale);
  const previousDayWidthRef = useRef(TIMELINE_PRESETS.weeks.dayWidth);

  const scalePreset = TIMELINE_PRESETS[timelineScale] || TIMELINE_PRESETS.weeks;
  const dayWidth = scalePreset.dayWidth;
  const today = useMemo(() => startOfToday(), []);

  const timelineRange = useMemo(() => {
    let minTimestamp = Number.POSITIVE_INFINITY;
    let maxTimestamp = Number.NEGATIVE_INFINITY;

    localItems.forEach((item) => {
      const start = getItemStartDate(item);
      const end = getItemEndDate(item) || start;

      if (start) {
        minTimestamp = Math.min(minTimestamp, start.getTime());
      }

      if (end) {
        maxTimestamp = Math.max(maxTimestamp, end.getTime());
      }
    });

    const fallbackStart = addDays(today, -45);
    const fallbackEnd = addDays(today, 120);

    const minDate = Number.isFinite(minTimestamp) ? new Date(minTimestamp) : fallbackStart;
    const maxDate = Number.isFinite(maxTimestamp) ? new Date(maxTimestamp) : fallbackEnd;

    const bufferedStart = addDays(minDate, -21);
    const bufferedEnd = addDays(maxDate, 28);

    return {
      startDate: bufferedStart < fallbackStart ? bufferedStart : fallbackStart,
      endDate: bufferedEnd > fallbackEnd ? bufferedEnd : fallbackEnd
    };
  }, [localItems, today]);

  const startDate = timelineRange.startDate;
  const endDate = timelineRange.endDate;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const todayIndex = differenceInDays(today, startDate);

  useEffect(() => {
    const nextItems = (storeItems || []).filter((item) => (item.type || 'task') === 'task');
    setLocalItems(nextItems);
    setSelectedItemIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)));
  }, [storeItems]);

  useEffect(() => {
    if (refreshNonce > 0) {
      refetchScheduleData();
    }
  }, [refreshNonce, refetchScheduleData]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!quickCreate.isOpen) return;
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target)) {
        setQuickCreate((prev) => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [quickCreate.isOpen]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localItems.filter((item) => {
      const normalizedStatus = normalizeStatus(item.status);
      const statusMatches = statusFilter === 'all' || normalizedStatus === statusFilter;
      if (!statusMatches) return false;

      if (!q) return true;

      const title = (item.title || '').toLowerCase();
      const key = (item.custom_id || '').toLowerCase();
      const assignee = (item.assignee?.full_name || '').toLowerCase();
      return title.includes(q) || key.includes(q) || assignee.includes(q);
    });
  }, [localItems, searchQuery, statusFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map();

    filteredItems.forEach((item) => {
      const group = formatGroupName(item, groupBy);
      if (!groups.has(group.key)) {
        groups.set(group.key, {
          key: group.key,
          label: group.label,
          order: group.order,
          items: []
        });
      }
      groups.get(group.key).items.push(item);
    });

    const groupList = Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items
          .slice()
          .sort((a, b) => toTimestamp(a) - toTimestamp(b) || (a.title || '').localeCompare(b.title || ''))
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(b.label);
      });

    if (groupBy === 'none') {
      return [
        {
          key: 'all:all',
          label: 'All Tasks',
          order: 0,
          items: filteredItems
            .slice()
            .sort((a, b) => toTimestamp(a) - toTimestamp(b) || (a.title || '').localeCompare(b.title || ''))
        }
      ];
    }

    return groupList;
  }, [filteredItems, groupBy]);

  const visibleRows = useMemo(() => {
    const rows = [];
    groupedItems.forEach((group) => {
      rows.push({ kind: 'group', groupKey: group.key, label: group.label, count: group.items.length });
      if (!collapsedGroups[group.key]) {
        group.items.forEach((item) => rows.push({ kind: 'item', groupKey: group.key, item }));
      }
    });
    return rows;
  }, [groupedItems, collapsedGroups]);

  const visibleItemIds = useMemo(
    () => visibleRows.filter((row) => row.kind === 'item').map((row) => row.item.id),
    [visibleRows]
  );

  const rowLayout = useMemo(() => {
    const rowCenterById = new Map();
    let cursor = 0;

    visibleRows.forEach((row) => {
      if (row.kind === 'group') {
        cursor += GROUP_ROW_HEIGHT;
        return;
      }

      rowCenterById.set(row.item.id, cursor + ROW_HEIGHT / 2);
      cursor += ROW_HEIGHT;
    });

    return {
      rowCenterById,
      totalHeight: cursor
    };
  }, [visibleRows]);

  const daySegments = useMemo(
    () => days.map((day, index) => ({
      key: day.toISOString(),
      label: format(day, 'd'),
      subLabel: format(day, 'EEE'),
      startIndex: index,
      span: 1,
      isWeekend: isWeekend(day)
    })),
    [days]
  );

  const weekSegments = useMemo(
    () =>
      buildSegments(
        days,
        (day) => `${format(day, 'yyyy')}-W${format(day, 'II')}`,
        (day) => `W${format(day, 'II')}`
      ),
    [days]
  );

  const monthSegments = useMemo(
    () => buildSegments(days, (day) => format(day, 'yyyy-MM'), (day) => format(day, 'MMM')),
    [days]
  );

  const quarterSegments = useMemo(
    () =>
      buildSegments(
        days,
        (day) => `${format(day, 'yyyy')}-Q${Math.floor(day.getMonth() / 3) + 1}`,
        (day) => {
          const year = day.getFullYear();
          const quarterStartMonth = Math.floor(day.getMonth() / 3) * 3;
          const quarterStart = new Date(year, quarterStartMonth, 1);
          const quarterEnd = new Date(year, quarterStartMonth + 2, 1);
          return `${format(quarterStart, 'MMM')} - ${format(quarterEnd, 'MMM')}`;
        }
      ),
    [days]
  );

  const yearSegments = useMemo(
    () => buildSegments(days, (day) => format(day, 'yyyy'), (day) => format(day, 'yyyy')),
    [days]
  );

  const { majorSegments, minorSegments, isMinorDayTrack } = useMemo(() => {
    if (timelineScale === 'days') {
      return { majorSegments: monthSegments, minorSegments: daySegments, isMinorDayTrack: true };
    }

    if (timelineScale === 'weeks') {
      return { majorSegments: monthSegments, minorSegments: weekSegments, isMinorDayTrack: false };
    }

    if (timelineScale === 'months') {
      return { majorSegments: quarterSegments, minorSegments: monthSegments, isMinorDayTrack: false };
    }

    return { majorSegments: yearSegments, minorSegments: quarterSegments, isMinorDayTrack: false };
  }, [timelineScale, daySegments, weekSegments, monthSegments, quarterSegments, yearSegments]);

  const weekendIndices = useMemo(
    () => days.reduce((acc, day, index) => (isWeekend(day) ? [...acc, index] : acc), []),
    [days]
  );

  const primarySelectedItemId = selectedItemIds.length ? selectedItemIds[selectedItemIds.length - 1] : null;

  useEffect(() => {
    const bodyEl = timelineBodyRef.current;
    if (!bodyEl) {
      previousScaleRef.current = timelineScale;
      previousDayWidthRef.current = dayWidth;
      return;
    }

    const scaleChanged = previousScaleRef.current !== timelineScale;
    if (!scaleChanged) {
      previousDayWidthRef.current = dayWidth;
      return;
    }

    const previousDayWidth = previousDayWidthRef.current || dayWidth;
    const currentVisibleDayIndex = bodyEl.scrollLeft / Math.max(previousDayWidth, 1);

    let targetDayIndex = currentVisibleDayIndex;

    if (primarySelectedItemId) {
      const selected = localItems.find((item) => item.id === primarySelectedItemId);
      const selectedStart = getItemStartDate(selected);
      if (selectedStart) {
        targetDayIndex = differenceInDays(selectedStart, startDate) - 2;
      }
    } else {
      const firstVisible = filteredItems.find((item) => getItemStartDate(item));
      const firstVisibleStart = getItemStartDate(firstVisible);
      if (firstVisibleStart) {
        targetDayIndex = differenceInDays(firstVisibleStart, startDate) - 2;
      } else if (todayIndex >= 0) {
        targetDayIndex = todayIndex - 2;
      }
    }

    const maxScroll = Math.max(0, days.length * dayWidth - bodyEl.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(maxScroll, targetDayIndex * dayWidth));

    bodyEl.scrollLeft = nextScrollLeft;

    if (timelineHeaderRef.current) {
      timelineHeaderRef.current.scrollLeft = nextScrollLeft;
    }

    if (svgRef.current) {
      svgRef.current.style.transform = `translateX(-${nextScrollLeft}px)`;
    }

    previousScaleRef.current = timelineScale;
    previousDayWidthRef.current = dayWidth;
  }, [timelineScale, dayWidth, days.length, primarySelectedItemId, localItems, filteredItems, startDate, todayIndex]);

  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    return storeItems.find((item) => item.id === activeCardId) || null;
  }, [storeItems, activeCardId]);

  const toggleGroupCollapse = useCallback((groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const isItemSelected = useCallback(
    (itemId) => selectedItemIds.includes(itemId),
    [selectedItemIds]
  );

  const selectItem = useCallback(
    (itemId, event) => {
      if (!itemId) return;
      const isToggle = Boolean(event?.ctrlKey || event?.metaKey);
      const isRange = Boolean(event?.shiftKey && selectionAnchorId && visibleItemIds.length);

      if (isRange) {
        const anchorIndex = visibleItemIds.indexOf(selectionAnchorId);
        const currentIndex = visibleItemIds.indexOf(itemId);

        if (anchorIndex >= 0 && currentIndex >= 0) {
          const [start, end] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
          setSelectedItemIds(visibleItemIds.slice(start, end + 1));
          return;
        }
      }

      if (isToggle) {
        setSelectedItemIds((prev) =>
          prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
        setSelectionAnchorId(itemId);
        return;
      }

      setSelectedItemIds([itemId]);
      setSelectionAnchorId(itemId);
    },
    [selectionAnchorId, visibleItemIds]
  );

  const handleBulkMoveDone = useCallback(async () => {
    if (!selectedItemIds.length) return;
    await bulkUpdateItems(selectedItemIds, { status: 'done' });
  }, [bulkUpdateItems, selectedItemIds]);

  const clampQuickCreatePosition = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 24, y: 88 };

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = 320;
    const panelHeight = 240;
    const x = Math.max(12, Math.min(clientX - rect.left, rect.width - panelWidth - 12));
    const y = Math.max(80, Math.min(clientY - rect.top, rect.height - panelHeight - 12));

    return { x, y };
  }, []);

  const openQuickCreate = useCallback((clientX, clientY, start, end, status = 'backlog') => {
    const pos = clampQuickCreatePosition(clientX, clientY);
    setQuickCreate({
      isOpen: true,
      x: pos.x,
      y: pos.y,
      title: '',
      startDate: format(start, 'yyyy-MM-dd'),
      dueDate: format(end, 'yyyy-MM-dd'),
      status,
      priority: 'medium'
    });
  }, [clampQuickCreatePosition]);

  const handleTimelineDoubleClick = (event, status = 'backlog') => {
    if (!timelineBodyRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scrollLeft = timelineBodyRef.current.scrollLeft;
    const offsetX = event.clientX - rect.left + scrollLeft;
    const deltaDays = Math.max(0, Math.floor(offsetX / dayWidth));
    const start = addDays(startDate, deltaDays);
    const end = addDays(start, 1);

    openQuickCreate(event.clientX, event.clientY, start, end, status);
  };

  const handleQuickCreateSubmit = async (event) => {
    event.preventDefault();
    const title = quickCreate.title.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }

    const parsedStart = quickCreate.startDate ? new Date(`${quickCreate.startDate}T09:00:00`) : new Date();
    const parsedDue = quickCreate.dueDate ? new Date(`${quickCreate.dueDate}T09:00:00`) : parsedStart;
    const startDateISO = Number.isNaN(parsedStart.getTime()) ? new Date().toISOString() : parsedStart.toISOString();
    const dueDateISO = Number.isNaN(parsedDue.getTime()) ? startDateISO : parsedDue.toISOString();

    try {
      const created = await createScheduleItem({
        title,
        status: quickCreate.status,
        priority: quickCreate.priority,
        start_date: startDateISO,
        due_date: dueDateISO,
        reporter_id: profile?.id || null,
        assignee_id: profile?.id || null
      });

      setQuickCreate((prev) => ({ ...prev, isOpen: false }));
      if (created?.id) {
        setSelectedItemIds([created.id]);
        setSelectionAnchorId(created.id);
      }
    } catch (err) {
      console.error('Failed to create task from Gantt:', err);
    }
  };

  const submitInlineRename = async () => {
    if (!editingItemId) return;
    const title = editingTitle.trim();
    if (!title) {
      setEditingItemId(null);
      return;
    }

    try {
      await updateScheduleItem(editingItemId, { title }, { silent: true });
      toast.success('Task renamed');
    } catch (err) {
      console.error('Failed to rename task:', err);
      toast.error('Failed to rename task');
    } finally {
      setEditingItemId(null);
    }
  };

  const handleSaveFromDetail = async (updates) => {
    if (!activeCardId) return;
    setIsSavingCard(true);

    try {
      await updateScheduleItem(activeCardId, updates, { silent: true });
      toast.success('Card updated');
    } catch (err) {
      console.error('Failed to save from Gantt detail:', err);
      toast.error('Failed to save card');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteFromDetail = (cardId) => {
    setActiveCardId((prev) => (prev === cardId ? null : prev));
    setSelectedItemIds((prev) => prev.filter((id) => id !== cardId));
    setLocalItems((prev) => prev.filter((item) => item.id !== cardId));
  };

  const nudgeSelectedItem = useCallback(async (deltaDays) => {
    if (!selectedItemIds.length) return;
    const targetIds = [...selectedItemIds];
    const selectedMap = new Map(
      targetIds
        .map((id) => localItems.find((item) => item.id === id))
        .filter(Boolean)
        .map((item) => [item.id, item])
    );

    if (!selectedMap.size) return;

    setLocalItems((prev) =>
      prev.map((item) => {
        if (!selectedMap.has(item.id)) return item;

        const start = getDateOrNull(item.start_date);
        const end = getDateOrNull(item.end_date || item.start_date);
        if (!start || !end) return item;

        const newStart = addDays(start, deltaDays);
        const newEnd = addDays(end, deltaDays);

        return {
          ...item,
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString()
        };
      })
    );

    try {
      await Promise.all(
        Array.from(selectedMap.values()).map((item) => {
          const start = getDateOrNull(item.start_date);
          const end = getDateOrNull(item.end_date || item.start_date);
          if (!start || !end) return Promise.resolve();

          const newStart = addDays(start, deltaDays);
          const newEnd = addDays(end, deltaDays);

          return updateScheduleItem(
            item.id,
            {
              start_date: newStart.toISOString(),
              due_date: newEnd.toISOString()
            },
            { silent: true }
          );
        })
      );
    } catch (err) {
      console.error('Failed to nudge selected tasks:', err);
      setLocalItems((storeItems || []).filter((item) => (item.type || 'task') === 'task'));
    }
  }, [selectedItemIds, localItems, updateScheduleItem, storeItems]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTyping = tagName === 'input' || tagName === 'textarea' || event.target?.isContentEditable;
      if (isTyping) return;

      if ((event.key === 'n' || event.key === 'N') && event.altKey) {
        event.preventDefault();
        openQuickCreate(window.innerWidth / 2, 220, today, addDays(today, 1), 'backlog');
      }

      if (event.key === 'Enter' && primarySelectedItemId) {
        event.preventDefault();
        setActiveCardId(primarySelectedItemId);
      }

      if ((event.key === 'e' || event.key === 'E') && primarySelectedItemId) {
        event.preventDefault();
        const selected = localItems.find((item) => item.id === primarySelectedItemId);
        if (selected) {
          setEditingItemId(selected.id);
          setEditingTitle(selected.title || '');
        }
      }

      if (event.key === 'ArrowLeft' && selectedItemIds.length) {
        event.preventDefault();
        nudgeSelectedItem(-1);
      }

      if (event.key === 'ArrowRight' && selectedItemIds.length) {
        event.preventDefault();
        nudgeSelectedItem(1);
      }

      if ((event.key === 'D' || event.key === 'd') && event.shiftKey && selectedItemIds.length === 2) {
        event.preventDefault();
        createDependency(selectedItemIds[0], selectedItemIds[1]).catch((err) => {
          console.error('Failed to create quick dependency:', err);
        });
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItemIds.length) {
        event.preventDefault();
        handleBulkMoveDone().catch((err) => {
          console.error('Failed to move selected tasks to done:', err);
        });
      }

      if (event.key === 'Escape') {
        setEditingItemId(null);
        setQuickCreate((prev) => ({ ...prev, isOpen: false }));
        setSelectedItemIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    primarySelectedItemId,
    selectedItemIds,
    localItems,
    openQuickCreate,
    today,
    nudgeSelectedItem,
    createDependency,
    handleBulkMoveDone
  ]);

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
    selectItem(item.id, e);
    setDragging({
      itemId: item.id,
      type,
      startX: e.clientX,
      initialStart: new Date(item.start_date || new Date().toISOString()),
      initialEnd: new Date(item.end_date || item.start_date || new Date().toISOString()),
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
      setLocalItems((storeItems || []).filter((item) => (item.type || 'task') === 'task'));
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
    const start = getItemStartDate(item);
    const end = getItemEndDate(item) || start;

    // Hide malformed items rather than rendering visual artifacts.
    if (!start || !end) {
      return { display: 'none' };
    }

    const leftOffset = differenceInDays(start, startDate) * dayWidth;
    const duration = Math.max(1, differenceInDays(end, start) + 1);
    const width = duration * dayWidth;
    const isMilestone = isMilestoneItem(item);
    const normalizedWidth = isMilestone ? Math.max(14, Math.min(dayWidth * 0.55, 18)) : Math.max(width, Math.max(24, dayWidth * 0.82));

    const bgColor = item.is_critical_path
      ? 'var(--status-blocked-text)'
      : item.priority === 'urgent'
      ? 'var(--priority-highest)'
      : item.priority === 'high'
      ? 'var(--priority-high)'
      : item.priority === 'low'
      ? 'var(--priority-low)'
      : 'var(--accent-primary)';

    return {
      left: `${leftOffset}px`,
      width: `${normalizedWidth}px`,
      backgroundColor: bgColor,
      borderRadius: isMilestone ? '2px' : '5px',
      opacity: item.progress_percent ? `${0.5 + item.progress_percent / 200}` : '1',
    };
  };

  // Render dependency lines with proper positioning
  const renderDependencyLines = useMemo(() => {
      if (!svgRef.current) return null;
      const itemById = new Map(filteredItems.map((item) => [item.id, item]));

      const lines = storeDeps
        .map((dep) => {
          const source = itemById.get(dep.predecessor_id);
          const target = itemById.get(dep.successor_id);

          if (!source || !target) return null;

          const sourceStart = getItemStartDate(source);
          const sourceEnd = getItemEndDate(source) || sourceStart;
          const targetStart = getItemStartDate(target);
          const y1 = rowLayout.rowCenterById.get(source.id);
          const y2 = rowLayout.rowCenterById.get(target.id);

          if (!sourceStart || !sourceEnd || !targetStart || y1 === undefined || y2 === undefined) return null;

          // Calculate endpoints based on dependency type
          let x1, x2;

          x1 = (differenceInDays(sourceEnd, startDate) + 1) * dayWidth; // Right edge of source

          x2 = differenceInDays(targetStart, startDate) * dayWidth; // Left edge of target

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

      const svgHeight = Math.max(rowLayout.totalHeight + 100, 180);
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
  }, [storeDeps, filteredItems, rowLayout, startDate, dayWidth, days.length, selectedDependencyId]);

  // Export to CSV
  const exportTimelineCSV = () => {
    if (!storeItems.length) {
      toast.error('No timeline data to export');
      return;
    }

    const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Start Date', 'End Date', 'Progress %', 'Assignee'];
    const rows = storeItems.map((item) => {
      const start = getItemStartDate(item);
      const end = getItemEndDate(item) || start;

      return [
      item.custom_id || item.id,
      (item.title || '').replaceAll('"', '""'),
      item.priority || '',
      item.status || '',
      start ? format(start, 'yyyy-MM-dd') : '',
      end ? format(end, 'yyyy-MM-dd') : '',
      item.progress_percent || 0,
      item.assignee?.full_name || '',
      ];
    });

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

  const timelineWidth = days.length * dayWidth;
  const timelineTrackStyle = { minWidth: `${timelineWidth}px`, width: `${timelineWidth}px` };

  return (
    <div
      className="gantt-container glass-panel"
      ref={containerRef}
      style={{ '--day-width': `${dayWidth}px`, '--row-height': `${ROW_HEIGHT}px` }}
    >
      <div className="gantt-toolbar">
        <div className="gantt-toolbar-left">
          <button
            className="gantt-action-btn"
            onClick={() => openQuickCreate(window.innerWidth / 2, 220, today, addDays(today, 1), 'backlog')}
            title="Create task from within timeline"
          >
            <Plus size={16} /> Add Row
          </button>

          <div className="gantt-search-wrap">
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search task, key, assignee"
              className="gantt-search-input"
            />
          </div>

          <div className="gantt-filter-pills">
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`gantt-filter-pill ${statusFilter === option.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="gantt-toolbar-actions">
          <div className="gantt-group-by">
            <Layers size={14} />
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {!!selectedItemIds.length && (
            <div className="gantt-selection-info">
              <span>{selectedItemIds.length} selected</span>
              <button
                type="button"
                className="gantt-selection-btn"
                onClick={handleBulkMoveDone}
              >
                Move To Done
              </button>
              <button
                type="button"
                className="gantt-selection-btn"
                disabled={selectedItemIds.length !== 2}
                onClick={() => {
                  if (selectedItemIds.length !== 2) return;
                  createDependency(selectedItemIds[0], selectedItemIds[1]);
                }}
              >
                <LinkIcon size={13} /> Link
              </button>
            </div>
          )}

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
        <div className="gantt-names-column">Work</div>
        <div className="gantt-timeline-header" ref={timelineHeaderRef}>
          <div className="gantt-month-track">
            {majorSegments.map((segment) => (
              <div
                key={segment.key}
                className="gantt-month-header"
                style={{ width: `${segment.span * dayWidth}px` }}
              >
                {segment.label}
              </div>
            ))}
          </div>
          <div className="gantt-day-track">
            {minorSegments.map((segment) => {
              const containsToday = todayIndex >= segment.startIndex && todayIndex < segment.startIndex + segment.span;
              const isWeekendSegment = isMinorDayTrack && segment.isWeekend;

              if (isMinorDayTrack) {
                return (
                  <div
                    key={segment.key}
                    className={`gantt-day-header ${containsToday ? 'today' : ''} ${isWeekendSegment ? 'weekend' : ''}`}
                    style={{ minWidth: `${segment.span * dayWidth}px`, width: `${segment.span * dayWidth}px` }}
                  >
                    <span className="day-num">{segment.label}</span>
                    <span className="day-name">{segment.subLabel}</span>
                  </div>
                );
              }

              return (
                <div
                  key={segment.key}
                  className={`gantt-minor-header ${containsToday ? 'today' : ''}`}
                  style={{ minWidth: `${segment.span * dayWidth}px`, width: `${segment.span * dayWidth}px` }}
                >
                  <span>{segment.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable body with SVG overlay */}
      <div className="gantt-body">
        {visibleRows.length === 0 ? (
          <div className="gantt-empty">No items with dates found. Set start/end dates to see them here.</div>
        ) : (
          <>
            <div
              className="gantt-rows-container"
              ref={timelineBodyRef}
              onScroll={handleBodyScroll}
              onDoubleClick={(event) => {
                if (event.target === event.currentTarget) {
                  handleTimelineDoubleClick(event, 'backlog');
                }
              }}
            >
              {/* SVG dependency lines */}
              {renderDependencyLines}

              {scalePreset.showWeekendShade && (
                <div
                  className="gantt-weekend-overlay"
                  style={{
                    left: 'var(--gantt-name-col-width)',
                    width: `${days.length * dayWidth}px`,
                    height: `${Math.max(rowLayout.totalHeight, 1)}px`
                  }}
                >
                  {weekendIndices.map((index) => (
                    <span
                      key={`weekend-${index}`}
                      className="gantt-weekend-cell"
                      style={{ left: `${index * dayWidth}px`, width: `${dayWidth}px` }}
                    />
                  ))}
                </div>
              )}

              {/* Today reference line */}
              <div
                className="gantt-today-line"
                style={{
                  left: `calc(var(--gantt-name-col-width) + ${differenceInDays(today, startDate) * dayWidth}px)`,
                  height: `${Math.max(rowLayout.totalHeight, 1)}px`
                }}
              />

              {/* Rows */}
              {visibleRows.map((row, rowIndex) => {
                if (row.kind === 'group') {
                  const collapsed = !!collapsedGroups[row.groupKey];
                  return (
                    <div key={row.groupKey} className="gantt-group-row" style={{ height: `${GROUP_ROW_HEIGHT}px` }}>
                      <div
                        className="gantt-group-name"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleGroupCollapse(row.groupKey)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleGroupCollapse(row.groupKey);
                          }
                        }}
                      >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        <span>{row.label}</span>
                        <span className="gantt-group-count">{row.count}</span>
                      </div>
                      <div className="gantt-group-timeline" style={timelineTrackStyle} />
                    </div>
                  );
                }

                const { item } = row;
                const itemStyle = getItemStyle(item);
                const isSelected = isItemSelected(item.id);
                const itemStart = getItemStartDate(item);
                const itemEnd = getItemEndDate(item) || itemStart;
                const durationDays = itemStart && itemEnd ? Math.max(1, differenceInDays(itemEnd, itemStart) + 1) : 1;
                const isMilestone = isMilestoneItem(item);
                const isShortTask = !isMilestone && durationDays <= 2;

                return (
                  <div
                    key={item.id}
                    className={`gantt-row ${isSelected ? 'selected' : ''} ${rowIndex % 2 === 0 ? 'even' : 'odd'}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <div
                      className={`gantt-card-name ${isSelected ? 'selected' : ''}`}
                      onClick={(event) => selectItem(item.id, event)}
                    >
                      <span className={`priority-dot ${item.priority}`} />
                      {editingItemId === item.id ? (
                        <input
                          className="gantt-inline-title-input"
                          autoFocus
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onBlur={submitInlineRename}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') submitInlineRename();
                            if (event.key === 'Escape') setEditingItemId(null);
                          }}
                        />
                      ) : (
                        <button
                          className="gantt-task-name-btn"
                          onDoubleClick={() => {
                            setEditingItemId(item.id);
                            setEditingTitle(item.title || '');
                            setSelectedItemIds([item.id]);
                            setSelectionAnchorId(item.id);
                          }}
                          title="Double click to rename"
                        >
                          <span className="truncate" title={item.title}>
                            {item.custom_id ? `${item.custom_id} - ` : ''}{item.title}
                          </span>
                        </button>
                      )}
                    </div>
                    <div
                      className="gantt-timeline-row"
                      style={timelineTrackStyle}
                      onDoubleClick={(event) => handleTimelineDoubleClick(event, normalizeStatus(item.status))}
                    >
                      {!isMilestone && item.progress_percent > 0 && (
                        <div
                          className="gantt-progress-bar"
                          style={{
                            left: `${Math.max(0, parseFloat(itemStyle.left || '0'))}px`,
                            width: `${(parseFloat(itemStyle.width || '0') * item.progress_percent) / 100}px`,
                          }}
                        />
                      )}
                      <div
                        className={`gantt-task-bar ${dragging?.itemId === item.id ? 'dragging' : ''} ${
                          item.is_critical_path ? 'critical' : ''
                        } ${isSelected ? 'selected' : ''} ${isMilestone ? 'milestone' : ''} ${isShortTask ? 'short' : ''}`}
                        style={itemStyle}
                        onMouseDown={(e) => handleMouseDown(e, item, 'move')}
                        onClick={(event) => selectItem(item.id, event)}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setActiveCardId(item.id);
                        }}
                      >
                        {!isMilestone && (
                          <>
                            <div
                              className="resize-handle left"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, item, 'resize-left');
                              }}
                            />
                            <span className="task-label">{isShortTask ? item.custom_id || '' : item.custom_id || item.title}</span>
                            <div
                              className="resize-handle right"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, item, 'resize-right');
                              }}
                            />
                          </>
                        )}
                        {isMilestone && <span className="gantt-milestone-label" title={item.title}>◆</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="gantt-footer-controls">
        <div className="gantt-scale-switch" role="tablist" aria-label="Timeline scale">
          {TIMELINE_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={timelineScale === option.value}
              className={`gantt-scale-btn ${timelineScale === option.value ? 'active' : ''}`}
              onClick={() => setTimelineScale(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {quickCreate.isOpen && (
        <div
          ref={quickCreateRef}
          className="gantt-quick-create"
          style={{ left: `${quickCreate.x}px`, top: `${quickCreate.y}px` }}
        >
          <h4>Quick Create Task</h4>
          <form onSubmit={handleQuickCreateSubmit}>
            <label>
              Title
              <input
                type="text"
                value={quickCreate.title}
                onChange={(event) => setQuickCreate((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="What needs to be done?"
                autoFocus
              />
            </label>

            <div className="gantt-quick-create-grid">
              <label>
                Start
                <input
                  type="date"
                  value={quickCreate.startDate}
                  onChange={(event) => setQuickCreate((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </label>

              <label>
                Due
                <input
                  type="date"
                  value={quickCreate.dueDate}
                  onChange={(event) => setQuickCreate((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
              </label>
            </div>

            <div className="gantt-quick-create-grid">
              <label>
                Status
                <select
                  value={quickCreate.status}
                  onChange={(event) => setQuickCreate((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  value={quickCreate.priority}
                  onChange={(event) => setQuickCreate((prev) => ({ ...prev, priority: event.target.value }))}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>

            <div className="gantt-quick-create-actions">
              <button
                type="button"
                className="gantt-quick-cancel"
                onClick={() => setQuickCreate((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button type="submit" className="gantt-quick-submit">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dependency Manager Modal */}
      <DependencyManager
        isOpen={showDependencyManager}
        onClose={() => {
          setShowDependencyManager(false);
          setSelectedDependencyId(null);
        }}
        scheduleItems={localItems}
        selectedDependency={
          selectedDependencyId ? storeDeps.find(d => d.id === selectedDependencyId) : null
        }
        onCreateDependency={refetchScheduleData}
        onUpdateDependency={refetchScheduleData}
        onDeleteDependency={refetchScheduleData}
        projectId={projectId}
      />

      {activeCard && (
        <CardDetail
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onSave={handleSaveFromDetail}
          onDelete={handleDeleteFromDetail}
          isSaving={isSavingCard}
        />
      )}
    </div>
  );
};

export default GanttChart;
