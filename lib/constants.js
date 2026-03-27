// lib/constants.js
// Centralized constants to avoid magic values scattered through the codebase

/** Card / issue statuses */
export const CARD_STATUS = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

/** Card / issue priorities */
export const CARD_PRIORITY = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/** Issue types */
export const ISSUE_TYPE = {
  TASK: 'task',
  BUG: 'bug',
  STORY: 'story',
  EPIC: 'epic',
  SUBTASK: 'subtask',
};

/** Sprint statuses */
export const SPRINT_STATUS = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

/** Organization member roles */
export const ORG_ROLE = {
  ADMIN: 'admin',
  PM: 'pm',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

/** Project types */
export const PROJECT_TYPE = {
  SOFTWARE: 'software',
  BUSINESS: 'business',
  PERSONAL: 'personal',
};

/** Project statuses */
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
};

/** Meeting RAG statuses */
export const RAG_STATUS = {
  RED: 'red',
  AMBER: 'amber',
  GREEN: 'green',
};

/** DSM mood options */
export const DSM_MOOD = ['great', 'good', 'okay', 'stressed'];

/** Storage key prefix for user-specific localStorage */
export const STORAGE_PREFIX = 'niyoplan';

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
};

/** File upload limits */
export const UPLOAD = {
  MAX_AVATAR_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
  ALLOWED_AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

/** AI request limits */
export const AI = {
  MAX_CONTEXT_ENTRIES: 20,
  MAX_DESCRIPTION_CHARS: 2000,
};

/** Calendar view types */
export const CALENDAR_VIEW = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  AGENDA: 'agenda',
};
