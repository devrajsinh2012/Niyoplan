import { describe, it, expect } from 'vitest';
import { validateId, validateNonEmpty, validateEnum } from '../lib/validate';

describe('Validation Utilities', () => {
  it('should validate UUIDs correctly', () => {
    expect(validateId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateId('invalid-uuid')).toBe(false);
  });

  it('should validate non-empty strings', () => {
    expect(validateNonEmpty('hello')).toBe(true);
    expect(validateNonEmpty('   ')).toBe(false);
    expect(validateNonEmpty('')).toBe(false);
  });

  it('should validate enums correctly', () => {
    const statusEnum = ['todo', 'done'];
    expect(validateEnum('todo', statusEnum)).toBe(true);
    expect(validateEnum('invalid', statusEnum)).toBe(false);
  });
});
