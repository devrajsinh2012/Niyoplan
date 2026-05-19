import { describe, expect, it } from 'vitest';
import {
  validateClientPayload,
  validateContactPayload,
  validateDeliverablePayload,
  validateInteractionPayload,
  validateReminderPayload,
} from '@/lib/clients/validation';

describe('client validation helpers', () => {
  it('requires a client name and organization when creating clients', () => {
    const result = validateClientPayload({});

    expect(result.errors).toContain('Client name is required');
    expect(result.errors).toContain('Organization is required');
  });

  it('normalizes valid client payloads', () => {
    const result = validateClientPayload({
      name: ' Acme ',
      organizationId: 'org-1',
      tier: 'vip',
      contract_value: '12000',
    });

    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({
      name: 'Acme',
      organization_id: 'org-1',
      tier: 'vip',
      contract_value: 12000,
    });
  });

  it('requires contact names', () => {
    const result = validateContactPayload({ email: 'client@example.com' });
    expect(result.errors).toContain('Contact name is required');
  });

  it('requires reminder title and due date', () => {
    const result = validateReminderPayload({ title: '' });
    expect(result.errors).toContain('Reminder title is required');
    expect(result.errors).toContain('Due date is required');
  });

  it('rejects invalid reminder dates', () => {
    const result = validateReminderPayload({ title: 'Follow up', due_at: 'not-a-date' });
    expect(result.errors).toContain('due at is invalid');
  });

  it('normalizes interaction duration', () => {
    const result = validateInteractionPayload({ title: 'Call', duration_minutes: '30' });
    expect(result.errors).toEqual([]);
    expect(result.data.duration_minutes).toBe(30);
  });

  it('requires deliverable title and due date', () => {
    const result = validateDeliverablePayload({});
    expect(result.errors).toContain('Deliverable title is required');
    expect(result.errors).toContain('Due date is required');
  });
});

