import { expect, test } from 'bun:test';
import { withSecurityHeaders } from '../src/security-headers';
import worker from '../src/worker';

const EXPECTED = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

// A D1 stand-in that is enough for routes that do not read a session.
const db = { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }) }) };
const env = { DB: db, JOBS_URL: 'https://jobs.test' } as never;
const call = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://bot.flisk.si${path}`, init), env);

test('the home page, robots, sitemap and a 404 all carry the baseline headers', async () => {
  for (const path of ['/', '/robots.txt', '/sitemap.xml', '/nothing-here']) {
    const res = await call(path);
    for (const [k, v] of Object.entries(EXPECTED)) expect(res.headers.get(k)).toBe(v);
    expect(res.headers.get('content-security-policy')).toContain('frame-ancestors');
  }
});

test('an unknown path is a JSON 404 and still gets the headers', async () => {
  const res = await call('/nothing-here');
  expect(res.status).toBe(404);
  expect(res.headers.get('content-security-policy')).toBe("frame-ancestors 'self' https://analytics.flisk.si");
  expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
});

test('the board page carries the Flisk analytics beacon, and its CSP allows the tracker and the beacon', async () => {
  const res = await call('/');
  const html = await res.text();
  expect(html).toContain('<script defer data-domain="bot.flisk.si" src="https://flisk.sh/a.js">');
  const csp = res.headers.get('content-security-policy') ?? '';
  expect(csp).toContain('https://flisk.sh');
  expect(csp).toContain('https://analytics.flisk.si');
});

test('the home page keeps its own CSP (frame-ancestors none) and its nosniff, with no duplicate', async () => {
  const res = await call('/');
  const csp = res.headers.get('content-security-policy') ?? '';
  expect(csp).toContain('frame-ancestors https://analytics.flisk.si');
  expect(csp.match(/frame-ancestors/g)).toHaveLength(1);
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
});

test('a missing header is added, an existing one is kept and an existing CSP gains frame-ancestors', async () => {
  const res = withSecurityHeaders(new Response('x', { status: 201, headers: { 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'" } }));
  expect(res.status).toBe(201);
  expect(await res.text()).toBe('x');
  expect(res.headers.get('x-frame-options')).toBe('DENY');
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'self' https://analytics.flisk.si");
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
});
