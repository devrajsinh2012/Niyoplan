/**
 * lib/validate.js
 * Lightweight API input validation utilities.
 * Each validator returns { valid: boolean, errors: string[] }.
 */

/**
 * Validate a string field.
 * @param {string} value
 * @param {string} fieldName
 * @param {{ required?: boolean, minLength?: number, maxLength?: number }} opts
 */
export function validateString(value, fieldName, { required = false, minLength = 0, maxLength = 10000 } = {}) {
  const errors = [];
  const str = typeof value === 'string' ? value.trim() : '';

  if (required && !str) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }

  if (str && str.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (str.length > maxLength) {
    errors.push(`${fieldName} must be at most ${maxLength} characters`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an enum value.
 * @param {*} value
 * @param {string} fieldName
 * @param {string[]} allowed
 */
export function validateEnum(value, fieldName, allowed) {
  const errors = [];
  if (value !== undefined && value !== null && !allowed.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a date string (ISO format).
 * @param {string} value
 * @param {string} fieldName
 * @param {{ required?: boolean }} opts
 */
export function validateDate(value, fieldName, { required = false } = {}) {
  const errors = [];
  if (required && !value) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  if (value && isNaN(Date.parse(value))) {
    errors.push(`${fieldName} must be a valid date`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a number field.
 * @param {*} value
 * @param {string} fieldName
 * @param {{ required?: boolean, min?: number, max?: number }} opts
 */
export function validateNumber(value, fieldName, { required = false, min = -Infinity, max = Infinity } = {}) {
  const errors = [];
  if (required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  if (value !== undefined && value !== null && value !== '') {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push(`${fieldName} must be a number`);
    } else {
      if (num < min) errors.push(`${fieldName} must be at least ${min}`);
      if (num > max) errors.push(`${fieldName} must be at most ${max}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Collect all validation results and return combined result.
 * @param {...{ valid: boolean, errors: string[] }} results
 */
export function combineValidations(...results) {
  const errors = results.flatMap((r) => r.errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Build a 400 Bad Request NextResponse from validation errors.
 * Usage: if (!valid) return validationError(errors);
 */
import { NextResponse } from 'next/server';
export function validationError(errors) {
  return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
}
