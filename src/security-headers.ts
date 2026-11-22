// Baseline security response headers for every response this Worker sends.
// A header the route already set is kept as it is (never duplicated or weakened); only the missing ones are added.
// The response is copied because the headers of a response from fetch() or a cache are immutable.
const BASELINE: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(BASELINE)) if (!headers.has(name)) headers.set(name, value);
  // Content-Security-Policy: add only frame-ancestors, and only when the policy has none. An existing policy is otherwise untouched
  // (the bot's pages already send one with frame-ancestors 'none', which is stricter than 'self' and stays).
  const csp = headers.get('content-security-policy');
  if (!csp) headers.set('content-security-policy', "frame-ancestors 'self' https://analytics.flisk.si");
  else if (!/(^|;)\s*frame-ancestors\s/i.test(csp)) headers.set('content-security-policy', `${csp.replace(/;\s*$/, '')}; frame-ancestors 'self' https://analytics.flisk.si`);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
