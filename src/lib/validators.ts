/**
 * Shared input-validation patterns used across all API route handlers.
 *
 * Import from here rather than redefining per-route. The test suite at
 * src/app/api/__tests__/validation.test.ts validates these patterns directly.
 */

export const VALID_SEASON = /^(\d{4}|current)$/;
export const VALID_ROUND = /^([1-9]|[1-2][0-9]|30)$/;
export const VALID_TYPE: Set<string> = new Set(["race", "qualifying", "sprint"]);

export const VALID_YEAR = /^\d{4}$/;
export const VALID_MEETING_KEY = /^(\d{1,8}|latest)$/;
export const VALID_SESSION_KEY = /^(\d{1,8}|latest)$/;

/** Safe identifier: lowercase letters, digits, hyphens, underscores (Ergast/OpenF1 format). */
export const VALID_ID = /^[a-z0-9_-]{1,40}$/;

/** Allowed values for the schedule route 'view' parameter. */
export const VALID_VIEW: Set<string> = new Set(["next", "last"]);;
