const CLIENT_STATUSES = ['active', 'inactive', 'archived'];
const CLIENT_TIERS = ['vip', 'standard', 'trial'];
const COMMUNICATION_TYPES = ['email', 'call', 'meeting', 'message'];
const REMINDER_TYPES = ['follow_up', 'meeting', 'delivery', 'check_in', 'other'];
const REMINDER_STATUSES = ['pending', 'completed', 'dismissed'];
const INTERACTION_TYPES = ['email', 'call', 'meeting', 'message', 'other'];
const DELIVERABLE_STATUSES = ['pending', 'delivered', 'approved', 'rejected'];

const trimOrNull = (value) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
};

const pickEnum = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export function validateClientPayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    data.name = trimOrNull(payload.name);
    if (!data.name) errors.push('Client name is required');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'organizationId')) {
    data.organization_id = trimOrNull(payload.organizationId || payload.organization_id);
    if (!partial && !data.organization_id) errors.push('Organization is required');
  }

  ['email', 'phone', 'company'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = trimOrNull(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'status')) {
    data.status = pickEnum(payload.status, CLIENT_STATUSES, 'active');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'tier')) {
    data.tier = pickEnum(payload.tier, CLIENT_TIERS, 'standard');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'contract_value')) {
    const value = payload.contract_value ?? payload.contractValue;
    data.contract_value = value === '' || value == null ? null : Number(value);
    if (data.contract_value != null && Number.isNaN(data.contract_value)) errors.push('Contract value must be a number');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'contract_end_date')) {
    const date = normalizeDateOnly(payload.contract_end_date ?? payload.contractEndDate);
    if (date === undefined) errors.push('Contract end date is invalid');
    else data.contract_end_date = date;
  }

  return { data, errors };
}

export function validateContactPayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'contact_name')) {
    data.contact_name = trimOrNull(payload.contact_name ?? payload.contactName);
    if (!data.contact_name) errors.push('Contact name is required');
  }

  ['title', 'email', 'phone'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = trimOrNull(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'is_primary')) {
    data.is_primary = Boolean(payload.is_primary ?? payload.isPrimary);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'preferred_communication')) {
    data.preferred_communication = pickEnum(payload.preferred_communication ?? payload.preferredCommunication, COMMUNICATION_TYPES, 'email');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'last_contacted_at')) {
    const date = normalizeDate(payload.last_contacted_at ?? payload.lastContactedAt);
    if (date === undefined) errors.push('Last contacted date is invalid');
    else data.last_contacted_at = date;
  }

  return { data, errors };
}

export function validateReminderPayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    data.title = trimOrNull(payload.title);
    if (!data.title) errors.push('Reminder title is required');
  }

  ['description', 'project_id', 'assigned_to'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = trimOrNull(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'reminder_type')) {
    data.reminder_type = pickEnum(payload.reminder_type ?? payload.type, REMINDER_TYPES, 'follow_up');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'status')) {
    data.status = pickEnum(payload.status, REMINDER_STATUSES, 'pending');
  }

  ['due_at', 'remind_at'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      const date = normalizeDate(payload[field]);
      if (date === undefined) errors.push(`${field.replace('_', ' ')} is invalid`);
      else data[field] = date;
    }
  });

  if (!partial && !data.due_at) errors.push('Due date is required');

  return { data, errors };
}

export function validateInteractionPayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    data.title = trimOrNull(payload.title);
    if (!data.title) errors.push('Interaction title is required');
  }

  ['notes', 'outcome', 'action_items', 'project_id'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = trimOrNull(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'interaction_type')) {
    data.interaction_type = pickEnum(payload.interaction_type ?? payload.type, INTERACTION_TYPES, 'call');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'duration_minutes')) {
    const value = payload.duration_minutes ?? payload.durationMinutes;
    data.duration_minutes = value === '' || value == null ? null : Number(value);
    if (data.duration_minutes != null && Number.isNaN(data.duration_minutes)) errors.push('Duration must be a number');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'next_action_at')) {
    const date = normalizeDate(payload.next_action_at ?? payload.nextActionAt);
    if (date === undefined) errors.push('Next action date is invalid');
    else data.next_action_at = date;
  }

  return { data, errors };
}

export function validateDeliverablePayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    data.title = trimOrNull(payload.title);
    if (!data.title) errors.push('Deliverable title is required');
  }

  ['description', 'project_id', 'acceptance_notes'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = trimOrNull(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'status')) {
    data.status = pickEnum(payload.status, DELIVERABLE_STATUSES, 'pending');
  }

  ['due_date', 'delivered_date'].forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, field)) {
      const date = normalizeDateOnly(payload[field]);
      if (date === undefined) errors.push(`${field.replace('_', ' ')} is invalid`);
      else data[field] = date;
    }
  });

  if (!partial && !data.due_date) errors.push('Due date is required');

  return { data, errors };
}

