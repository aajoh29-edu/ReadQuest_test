import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  getCsrfTokenFromCookie,
  sanitizeCsvCell,
  sanitizeErrorMessage,
  sanitizeReturnTo,
  validateDisplayName,
  validateEmail,
} from '../utils/security';
import { ApiClientError, apiFetch, resolveApiBaseUrl } from './apiConfig';
import { AuthService } from './authService';
import {
  ApiReadingQuestRepository,
  buildParentProgressCSV,
  buildTeacherClassCSV,
} from './repository';
import { runAdaptiveEngineTests } from './adaptiveEngine.test';

test('validateEmail normalizes valid addresses and rejects malformed inputs', () => {
  const valid = validateEmail('  Parent.Reader@Example.ORG  ');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'parent.reader@example.org');

  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('not-an-email').valid, false);
  assert.equal(validateEmail('parent@localhost').valid, false);
  assert.equal(validateEmail(`${'a'.repeat(250)}@example.com`).valid, false);
});

test('evaluatePasswordStrength enforces >=10 chars, upper, lower, digit, and symbol', () => {
  const weakShort = evaluatePasswordStrength('Ab1!short');
  assert.equal(weakShort.isValid, false);
  assert.ok(weakShort.unmetRequirements.includes('At least 10 characters'));

  const missingSymbol = evaluatePasswordStrength('StrongPass123');
  assert.equal(missingSymbol.isValid, false);
  assert.ok(missingSymbol.unmetRequirements.some((r) => r.includes('special character')));

  const missingUpper = evaluatePasswordStrength('lowercase123!@');
  assert.equal(missingUpper.isValid, false);
  assert.ok(missingUpper.unmetRequirements.includes('One uppercase letter'));

  const valid = evaluatePasswordStrength('ReadQuest!2026');
  assert.equal(valid.isValid, true);
  assert.equal(valid.unmetRequirements.length, 0);
  assert.ok(valid.score >= 3);
});

test('validateDisplayName trims control chars and blocks XSS angle brackets', () => {
  const ok = validateDisplayName('  Maya R.  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'Maya R.');

  const shortName = validateDisplayName('A', 2, 24, 'Child nickname');
  assert.equal(shortName.valid, false);

  const xssAttempt = validateDisplayName('<script>alert(1)</script>');
  assert.equal(xssAttempt.valid, false);
  assert.match(xssAttempt.error || '', /angle brackets/i);
});

test('sanitizeReturnTo blocks open redirects and auth loops while keeping safe paths', () => {
  assert.equal(sanitizeReturnTo('/dashboard'), '/dashboard');
  assert.equal(sanitizeReturnTo('/library?level=level-1&category=phonics-blending'), '/library?level=level-1&category=phonics-blending');

  assert.equal(sanitizeReturnTo('https://evil.example/phish'), '/dashboard');
  assert.equal(sanitizeReturnTo('//evil.example/phish'), '/dashboard');
  assert.equal(sanitizeReturnTo('/\\evil.example'), '/dashboard');
  assert.equal(sanitizeReturnTo('javascript:alert(1)'), '/dashboard');
  assert.equal(sanitizeReturnTo('/login?returnTo=/dashboard'), '/dashboard');
  assert.equal(sanitizeReturnTo('/signup'), '/dashboard');
  assert.equal(sanitizeReturnTo(undefined, '/library'), '/library');
});

test('sanitizeCsvCell and CSV builders neutralize spreadsheet formula injection', () => {
  assert.equal(sanitizeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
  assert.equal(sanitizeCsvCell('+2+3'), `"'+2+3"`);
  assert.equal(sanitizeCsvCell('-SUM(A1:A2)'), `"'-SUM(A1:A2)"`);
  assert.equal(sanitizeCsvCell('@HYPERLINK("http://x")'), `"'@HYPERLINK(""http://x"")"`);
  assert.equal(sanitizeCsvCell('\t1+1'), `"'\t1+1"`);
  assert.equal(sanitizeCsvCell('Normal Reader'), '"Normal Reader"');

  const parentCsv = buildParentProgressCSV({
    learnerName: '=MaliciousName',
    readingLevelId: 'level-1',
    dateFilter: '7d',
    masteryList: [
      {
        skillId: 's1',
        code: 'LS-1',
        skillName: '+FormulaSkill',
        categoryId: 'letter-sounds',
        readingLevelId: 'level-1',
        score: 88.4,
        components: { accuracy: 0.9, recency: 0.85, consistency: 0.85 },
        evidenceStatus: 'confirmed',
        band: 'proficient',
        windowAttemptCount: 6,
        totalAttemptCount: 6,
        sessionCount: 2,
        isConfirmedMastered: false,
        lastAttemptAt: '2026-10-20T00:00:00.000Z',
        nextReviewDueDate: '2026-10-27T00:00:00.000Z',
        reviewIntervalDays: 7,
        isReviewDue: false,
        lastPracticedAt: '2026-10-20T00:00:00.000Z',
        calculatedAt: '2026-10-20T00:00:00.000Z',
        configVersion: '1.0.0',
        status: 'in-progress',
        accuracy: 90,
        activitiesAttempted: 6,
        activitiesCorrect: 5,
      },
    ],
    attempts: [],
  });
  assert.ok(parentCsv.includes(`"'=MaliciousName"`));
  assert.ok(parentCsv.includes(`"'+FormulaSkill"`));

  const classCsv = buildTeacherClassCSV({
    className: '@BadClass',
    grade: '1st Grade',
    skills: [],
    matrix: [],
  });
  assert.ok(classCsv.includes(`"'@BadClass"`));
});

test('sanitizeErrorMessage redacts SQL/stack/HTML parser leakage', () => {
  assert.equal(
    sanitizeErrorMessage(new Error('SELECT * FROM users WHERE id=1 syntax error'), 'Fallback'),
    'Fallback'
  );
  assert.equal(
    sanitizeErrorMessage(new Error('connect ECONNREFUSED 127.0.0.1:5432'), 'Fallback'),
    'Fallback'
  );
  assert.equal(
    sanitizeErrorMessage(new Error('Unexpected token \'<\' at JSON position 0'), 'Fallback'),
    'Fallback'
  );
  assert.equal(
    sanitizeErrorMessage(new Error('Invalid email or password.'), 'Fallback'),
    'Invalid email or password.'
  );
});

test('resolveApiBaseUrl enforces HTTPS on non-local origins and accepts relative paths', () => {
  assert.equal(resolveApiBaseUrl('/api/v1/'), '/api/v1');
  assert.equal(resolveApiBaseUrl('https://api.readquest.org/v1'), 'https://api.readquest.org/v1');
  assert.equal(resolveApiBaseUrl('http://localhost:8080/api/v1'), 'http://localhost:8080/api/v1');
  assert.throws(() => resolveApiBaseUrl('http://api.readquest.org/v1'), /HTTPS/);
});

test('apiFetch attaches credentials, CSRF cookie header, and classifies HTTP/HTML errors accurately', async () => {
  const originalDocument = (globalThis as { document?: { cookie: string } }).document;
  (globalThis as { document?: { cookie: string } }).document = {
    cookie: 'other=1; rq_csrf_token=csrf-secret-xyz',
  };

  try {
    assert.equal(getCsrfTokenFromCookie('rq_csrf_token'), 'csrf-secret-xyz');

    let capturedInit: RequestInit | undefined;
    let capturedUrl = '';
    const okFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await apiFetch<{ ok: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com' }),
      fetchImpl: okFetch,
      baseUrlOverride: '/api/v1',
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(capturedUrl, '/api/v1/auth/login');
    assert.equal(capturedInit?.credentials, 'include');
    const hdrs = new Headers(capturedInit?.headers);
    assert.equal(hdrs.get('X-CSRF-Token'), 'csrf-secret-xyz');
    assert.equal(hdrs.get('X-Requested-With'), 'XMLHttpRequest');
    assert.equal(hdrs.get('Content-Type'), 'application/json');

    // Static SPA HTML response should fail closed as SERVICE_UNAVAILABLE
    const htmlFetch: typeof fetch = async () =>
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    await assert.rejects(
      () => apiFetch('/auth/me', { fetchImpl: htmlFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'SERVICE_UNAVAILABLE'
    );

    // Vite dev server unmounted /api/* returns empty 404 without application/json -> SERVICE_UNAVAILABLE
    const devNotFoundFetch: typeof fetch = async () =>
      new Response('', {
        status: 404,
      });
    await assert.rejects(
      () => apiFetch('/curriculum/levels', { fetchImpl: devNotFoundFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'SERVICE_UNAVAILABLE'
    );

    // Reverse proxy 502 HTML gateway response -> SERVICE_UNAVAILABLE
    const badGatewayHtmlFetch: typeof fetch = async () =>
      new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      });
    await assert.rejects(
      () => apiFetch('/auth/me', { fetchImpl: badGatewayHtmlFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'SERVICE_UNAVAILABLE'
    );

    // Live backend JSON 404 must remain NOT_FOUND (not misclassified as unmounted)
    const jsonNotFoundFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Lesson missing' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    await assert.rejects(
      () => apiFetch('/curriculum/lessons/missing', { fetchImpl: jsonNotFoundFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'NOT_FOUND'
    );

    // 401 -> UNAUTHORIZED
    const unauthFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ message: 'Session expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    await assert.rejects(
      () => apiFetch('/auth/me', { fetchImpl: unauthFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'UNAUTHORIZED'
    );

    // 429 -> RATE_LIMITED + retryAfterSeconds
    const rateFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ message: 'Too many attempts' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'Retry-After': '45' },
      });
    await assert.rejects(
      () => apiFetch('/auth/login', { method: 'POST', fetchImpl: rateFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) =>
        err instanceof ApiClientError &&
        err.code === 'RATE_LIMITED' &&
        err.retryAfterSeconds === 45
    );

    // Network failure -> NETWORK_ERROR
    const brokenFetch: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(
      () => apiFetch('/auth/me', { fetchImpl: brokenFetch, baseUrlOverride: '/api/v1' }),
      (err: unknown) => err instanceof ApiClientError && err.code === 'NETWORK_ERROR'
    );
  } finally {
    if (originalDocument === undefined) {
      delete (globalThis as { document?: { cookie: string } }).document;
    } else {
      (globalThis as { document?: { cookie: string } }).document = originalDocument;
    }
  }
});

test('AuthService validates inputs client-side before sending requests and sends normalized payloads', async () => {
  let networkCalls = 0;
  let lastBody = '';

  const service = new AuthService({
    baseUrlOverride: '/api/v1',
    fetchImpl: async (_url, init) => {
      networkCalls++;
      lastBody = typeof init?.body === 'string' ? init.body : '';
      return new Response(
        JSON.stringify({
          user: {
            id: 'usr-1',
            email: 'parent@example.org',
            fullName: 'Jordan Parent',
            role: 'parent',
            emailVerified: true,
            createdAt: '2026-11-19T00:00:00.000Z',
          },
          childProfiles: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    },
  });

  // Invalid registration attempts must reject without calling network
  await assert.rejects(
    () =>
      service.register({
        fullName: 'Jordan Parent',
        email: 'parent@example.org',
        password: 'weak',
        confirmPassword: 'weak',
        acceptedPolicies: true,
      }),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
  await assert.rejects(
    () =>
      service.register({
        fullName: 'Jordan Parent',
        email: 'parent@example.org',
        password: 'StrongPassword!1',
        confirmPassword: 'DifferentPassword!1',
        acceptedPolicies: true,
      }),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
  await assert.rejects(
    () =>
      service.register({
        fullName: 'Jordan Parent',
        email: 'parent@example.org',
        password: 'StrongPassword!1',
        confirmPassword: 'StrongPassword!1',
        acceptedPolicies: false,
      }),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
  assert.equal(networkCalls, 0);

  // Valid registration normalizes email and posts JSON
  const regRes = await service.register({
    fullName: '  Jordan Parent ',
    email: '  PARENT@Example.ORG ',
    password: 'StrongPassword!1',
    confirmPassword: 'StrongPassword!1',
    acceptedPolicies: true,
  });
  assert.equal(networkCalls, 1);
  assert.equal(regRes.user.role, 'parent');
  assert.equal(JSON.parse(lastBody).email, 'parent@example.org');
  assert.equal(JSON.parse(lastBody).fullName, 'Jordan Parent');

  // Sensitive deletions must require parent password
  await assert.rejects(
    () => service.deleteChildProfile('child-1', ''),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
  await assert.rejects(
    () => service.requestAccountDeletion(''),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
});

test('ApiReadingQuestRepository strips answer keys from public catalog fallback and fails closed on private data', async () => {
  const repo = new ApiReadingQuestRepository();
  // Without a running API server in test runner, global fetch throws or is unavailable -> sanitized fallback for public lessons
  const lessons = await repo.getAllLessons();
  assert.ok(lessons.length >= 12);
  for (const lesson of lessons) {
    const activities = lesson.activities || lesson.questions || [];
    for (const activity of activities) {
      for (const option of activity.options) {
        assert.equal(
          option.isCorrect,
          undefined,
          `Answer key leaked in public lesson ${lesson.id} option ${option.id}`
        );
      }
    }
  }

  // Private child-dependent call without active child rejects immediately
  await assert.rejects(
    () => repo.getProgressSummary(),
    (err: unknown) => err instanceof ApiClientError && err.code === 'VALIDATION_ERROR'
  );
});

test('Deterministic adaptiveEngine suite passes all 22 mastery/decay/evidence tests', () => {
  const suite = runAdaptiveEngineTests();
  assert.equal(suite.total, 22);
  assert.equal(
    suite.failed,
    0,
    `Adaptive engine failures: ${suite.tests
      .filter((t) => !t.passed)
      .map((t) => `${t.id}: expected ${t.expected}, got ${t.actual}`)
      .join('; ')}`
  );
});
