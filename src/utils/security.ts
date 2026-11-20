import { PasswordStrengthResult } from '../types';

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

/**
 * Prevents open redirects by validating that `returnTo` is a safe same-origin relative path.
 * Rejects protocol-relative URLs (`//...`), backslashes, schemes (`http:`, `javascript:`, `data:`),
 * and control characters.
 */
export function sanitizeReturnTo(
  raw: string | null | undefined,
  fallback: string = '/dashboard'
): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;
  if (trimmed.includes('\\') || CONTROL_CHAR_REGEX.test(trimmed)) return fallback;
  // Reject scheme-like patterns before first slash or query
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) return fallback;
  // Avoid auth loop redirects
  if (
    trimmed === '/login' ||
    trimmed.startsWith('/login?') ||
    trimmed === '/signup' ||
    trimmed.startsWith('/signup?')
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Validates parent/educator email format safely (no catastrophic backtracking).
 */
export function validateEmail(email: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { valid: false, normalized, error: 'Please enter your email address.' };
  }
  if (normalized.length > 254) {
    return { valid: false, normalized, error: 'Email address must be 254 characters or fewer.' };
  }
  const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
  if (!emailPattern.test(normalized)) {
    return { valid: false, normalized, error: 'Please enter a valid email address.' };
  }
  return { valid: true, normalized };
}

/**
 * Evaluates password strength against production security policy:
 * - Minimum 10 characters (max 128)
 * - At least one uppercase letter, lowercase letter, number, and symbol
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const unmetRequirements: string[] = [];

  if (password.length < 10) {
    unmetRequirements.push('At least 10 characters');
  }
  if (password.length > 128) {
    unmetRequirements.push('No more than 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    unmetRequirements.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    unmetRequirements.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    unmetRequirements.push('One number');
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    unmetRequirements.push('One special character (e.g. !@#$%)');
  }

  let metChecks = 0;
  if (password.length >= 10) metChecks++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) metChecks++;
  if (/[0-9]/.test(password)) metChecks++;
  if (/[^A-Za-z0-9\s]/.test(password)) metChecks++;
  if (password.length >= 14 && metChecks === 4) metChecks = 5;

  const isValid = unmetRequirements.length === 0;
  const clampedScore = Math.min(4, password.length === 0 ? 0 : Math.max(1, metChecks)) as
    | 0
    | 1
    | 2
    | 3
    | 4;

  const labels: Record<0 | 1 | 2 | 3 | 4, PasswordStrengthResult['label']> = {
    0: 'Too weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very strong',
  };

  return {
    score: clampedScore,
    label: isValid ? (password.length >= 14 ? 'Very strong' : 'Strong') : labels[clampedScore],
    isValid,
    unmetRequirements,
  };
}

/**
 * Validates display names / child learner nicknames safely (no HTML/script angle brackets).
 */
export function validateDisplayName(
  raw: string,
  minLen: number = 2,
  maxLen: number = 60,
  fieldLabel: string = 'Name'
): { valid: boolean; normalized: string; error?: string } {
  const normalized = raw.replace(CONTROL_CHAR_REGEX, '').trim();
  if (normalized.length < minLen) {
    return {
      valid: false,
      normalized,
      error: `${fieldLabel} must be at least ${minLen} characters.`,
    };
  }
  if (normalized.length > maxLen) {
    return {
      valid: false,
      normalized,
      error: `${fieldLabel} must be ${maxLen} characters or fewer.`,
    };
  }
  if (/[<>]/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: `${fieldLabel} cannot contain angle brackets (< or >).`,
    };
  }
  return { valid: true, normalized };
}

/**
 * Reads a non-HttpOnly double-submit CSRF cookie by exact name when running in a browser.
 */
export function getCsrfTokenFromCookie(cookieName: string = 'rq_csrf_token'): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const idx = cookie.indexOf('=');
    if (idx === -1) continue;
    const key = cookie.slice(0, idx).trim();
    if (key === cookieName) {
      return decodeURIComponent(cookie.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Neutralizes CSV formula injection (Excel / Google Sheets / LibreOffice)
 * by prefixing cells beginning with '=', '+', '-', '@', '\t', or '\r' with a single quote,
 * then wrapping safely in RFC-4180 double quotes.
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const raw = String(value);
  const formulaPrefix = /^[=+\-@\t\r]/;
  const neutralized = formulaPrefix.test(raw) ? `'${raw}` : raw;
  const escaped = neutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Strips potentially sensitive internals from errors before displaying to users.
 */
export function sanitizeErrorMessage(
  err: unknown,
  fallback: string = 'Something went wrong. Please try again.'
): string {
  if (!err) return fallback;
  const rawMessage =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? err.message
      : typeof (err as { message?: unknown }).message === 'string'
      ? String((err as { message?: unknown }).message)
      : '';

  if (!rawMessage) return fallback;

  // Never expose stack traces, SQL errors, or internal localhost paths
  const sensitiveIndicators = [
    /select\s+.+\s+from/i,
    /syntax\s+error/i,
    /econnrefused/i,
    /stack/i,
    /traceback/i,
    /exception\s+in/i,
    /unexpected\s+token\s+'</i,
  ];
  if (sensitiveIndicators.some((rx) => rx.test(rawMessage))) {
    return fallback;
  }

  return rawMessage.slice(0, 240);
}
