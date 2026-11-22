import { getCsrfTokenFromCookie } from '../utils/security';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly fieldErrors?: Record<string, string>;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    fieldErrors?: Record<string, string>,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ApiRuntimeConfig {
  baseUrl: string;
  enableCsrfHeader: boolean;
  csrfCookieName: string;
}

function readEnv(key: string): string | undefined {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (metaEnv && typeof metaEnv[key] === 'string') {
      return metaEnv[key];
    }
  } catch {
    // Non-Vite test runner
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key];
  }
  return undefined;
}

function isProdRuntime(): boolean {
  try {
    const metaEnv = (import.meta as unknown as { env?: { PROD?: boolean } }).env;
    if (typeof metaEnv?.PROD === 'boolean') return metaEnv.PROD;
  } catch {
    // ignore
  }
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

export function resolveApiBaseUrl(rawOverride?: string): string {
  const configured = (rawOverride ?? readEnv('VITE_API_BASE_URL') ?? '/api/v1').trim();
  const normalized = configured.replace(/\/+$/, '') || '/api/v1';

  // Relative same-origin path (uses HTTPS in production automatically)
  if (normalized.startsWith('/')) {
    return normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Invalid VITE_API_BASE_URL configuration.');
  }

  const isLocalHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  if (parsed.protocol !== 'https:' && !(isLocalHost && parsed.protocol === 'http:')) {
    throw new Error(
      'Insecure API configuration: VITE_API_BASE_URL must use HTTPS for non-local origins.'
    );
  }

  if (isProdRuntime() && parsed.protocol !== 'https:' && !isLocalHost) {
    throw new Error('Production builds require HTTPS for remote API endpoints.');
  }

  return normalized;
}

export function getApiConfig(): ApiRuntimeConfig {
  return {
    baseUrl: resolveApiBaseUrl(),
    enableCsrfHeader: (readEnv('VITE_ENABLE_CSRF_HEADER') ?? 'true') !== 'false',
    csrfCookieName: readEnv('VITE_CSRF_COOKIE_NAME') || 'rq_csrf_token',
  };
}

export const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  CHANGE_PASSWORD: '/auth/change-password',
  REAUTHENTICATE: '/auth/reauthenticate',
  DELETE_ACCOUNT: '/auth/account',
} as const;

export const API_ENDPOINTS = {
  CHILD_PROFILES: '/learners',
  CHILD_PROFILE_BY_ID: (id: string) => `/learners/${encodeURIComponent(id)}`,
  ACTIVE_CHILD: '/learners/active',
  CURRICULUM_LEVELS: '/curriculum/levels',
  CURRICULUM_SKILLS: '/curriculum/skills',
  CURRICULUM_CATEGORIES: '/curriculum/categories',
  CURRICULUM_LESSONS: '/curriculum/lessons',
  CURRICULUM_LESSON: (id: string) => `/curriculum/lessons/${encodeURIComponent(id)}`,
  SESSIONS: '/sessions',
  SESSION_ACTIVE: '/sessions/active',
  SESSION_BY_ID: (id: string) => `/sessions/${encodeURIComponent(id)}`,
  SESSION_SUBMIT: (id: string) => `/sessions/${encodeURIComponent(id)}/attempts`,
  SESSION_ADVANCE: (id: string) => `/sessions/${encodeURIComponent(id)}/advance`,
  SESSION_COMPLETE: (id: string) => `/sessions/${encodeURIComponent(id)}/complete`,
  MASTERY: (learnerId: string) => `/learners/${encodeURIComponent(learnerId)}/mastery`,
  PROGRESS: (learnerId: string) => `/learners/${encodeURIComponent(learnerId)}/progress`,
  RECENT_ATTEMPTS: (learnerId: string) => `/learners/${encodeURIComponent(learnerId)}/attempts`,
  WEEKLY_PRACTICE: (learnerId: string) => `/learners/${encodeURIComponent(learnerId)}/weekly`,
  RECOMMENDATIONS: (learnerId: string) =>
    `/learners/${encodeURIComponent(learnerId)}/recommendations`,
  ADAPTIVE_RECOMMENDATION: (learnerId: string) =>
    `/learners/${encodeURIComponent(learnerId)}/adaptive-recommendation`,
  PARENT_PROFILE: '/parent/profile',
  PARENT_LEARNERS: '/parent/learners',
  PARENT_EXPORT_CSV: (learnerId: string) =>
    `/parent/learners/${encodeURIComponent(learnerId)}/export.csv`,
  TEACHER_PROFILE: '/teacher/profile',
  TEACHER_CLASSES: '/teacher/classes',
  CLASS_LEARNERS: (classId: string) => `/teacher/classes/${encodeURIComponent(classId)}/learners`,
  CLASS_MATRIX: (classId: string) =>
    `/teacher/classes/${encodeURIComponent(classId)}/mastery-matrix`,
  CLASS_EXPORT_CSV: (classId: string) =>
    `/teacher/classes/${encodeURIComponent(classId)}/export.csv`,
  ASSIGNMENTS: '/assignments',
  ASSIGNMENT_COMPLETE: (id: string) => `/assignments/${encodeURIComponent(id)}/complete`,
  BOOKS: '/books',
  BOOK_BY_ID: (id: string) => `/books/${encodeURIComponent(id)}`,
  BOOK_PROGRESS: (childId: string, bookId: string) =>
    `/children/${encodeURIComponent(childId)}/books/${encodeURIComponent(bookId)}/progress`,
  VOICE_CONSENT: (childId: string) =>
    `/children/${encodeURIComponent(childId)}/voice-consent`,
  READ_ALOUD_ACTIVITY: (activityId: string) =>
    `/read-aloud-activities/${encodeURIComponent(activityId)}`,
  READ_ALOUD: (childId: string) =>
    `/children/${encodeURIComponent(childId)}/read-aloud`,
  READ_ALOUD_ATTEMPT: (childId: string, attemptId: string) =>
    `/children/${encodeURIComponent(childId)}/read-aloud/${encodeURIComponent(attemptId)}`,
  VOICE_PROGRESS: (childId: string) =>
    `/children/${encodeURIComponent(childId)}/voice-progress`,
  READ_ALOUD_RECOMMENDATION: (childId: string) =>
    `/children/${encodeURIComponent(childId)}/read-aloud-recommendation`,
} as const;

export type FetchLike = typeof fetch;

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function mapStatusToCode(status: number, serverCode?: string): ApiErrorCode {
  if (serverCode) {
    const normalized = serverCode.toUpperCase();
    if (
      normalized === 'UNAUTHORIZED' ||
      normalized === 'FORBIDDEN' ||
      normalized === 'RATE_LIMITED' ||
      normalized === 'VALIDATION_ERROR' ||
      normalized === 'NOT_FOUND' ||
      normalized === 'CONFLICT'
    ) {
      return normalized;
    }
  }
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 502 || status === 503 || status === 504) return 'SERVICE_UNAVAILABLE';
  return 'SERVER_ERROR';
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { baseUrlOverride?: string; fetchImpl?: FetchLike } = {}
): Promise<T> {
  const { baseUrlOverride, fetchImpl, headers: customHeaders, ...restOptions } = options;
  const config = getApiConfig();
  const baseUrl = resolveApiBaseUrl(baseUrlOverride ?? config.baseUrl);
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const method = (restOptions.method || 'GET').toUpperCase();
  const runner: FetchLike | undefined =
    fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);

  if (!runner) {
    throw new ApiClientError(
      'Network client is unavailable in this environment.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (restOptions.body && typeof restOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (STATE_CHANGING_METHODS.has(method) && config.enableCsrfHeader) {
    const csrfToken = getCsrfTokenFromCookie(config.csrfCookieName);
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  let response: Response;
  try {
    response = await runner(url, {
      ...restOptions,
      method,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiClientError(
      'Unable to reach the ReadQuest authentication service. Check your connection or backend availability.',
      0,
      'NETWORK_ERROR'
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (response.status === 204) {
    return undefined as T;
  }

  // Dev servers and static SPA hosts return index.html (text/html) or empty 404/502 responses
  // when no backend API is mounted on /api/*. Only JSON error bodies represent a live API error.
  if (!contentType.includes('application/json')) {
    if (
      response.ok ||
      response.status === 404 ||
      response.status === 405 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    ) {
      throw new ApiClientError(
        'Backend API service is not connected on this host yet.',
        response.ok ? 503 : response.status,
        'SERVICE_UNAVAILABLE'
      );
    }
  }

  let payload: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errObj = (payload && typeof payload === 'object' ? payload : {}) as {
      code?: string;
      message?: string;
      detail?: string;
      fieldErrors?: Record<string, string>;
      retryAfterSeconds?: number;
    };

    const code = mapStatusToCode(response.status, errObj.code);
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds =
      errObj.retryAfterSeconds ??
      (retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) : undefined);

    const defaultMessage =
      code === 'UNAUTHORIZED'
        ? 'Your session has expired or you are not signed in.'
        : code === 'FORBIDDEN'
        ? 'You do not have permission to perform this action.'
        : code === 'RATE_LIMITED'
        ? 'Too many requests. Please wait a moment and try again.'
        : code === 'SERVICE_UNAVAILABLE'
        ? 'The ReadQuest backend service is temporarily unavailable.'
        : 'Request could not be completed.';

    throw new ApiClientError(
      errObj.message || errObj.detail || defaultMessage,
      response.status,
      code,
      errObj.fieldErrors,
      retryAfterSeconds
    );
  }

  return payload as T;
}
