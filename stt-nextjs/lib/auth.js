// Shared by middleware.js (edge runtime) and app/api/login/route.js (node
// runtime) — both environments expose the Web Crypto `crypto.subtle` global,
// so this one implementation works in both without extra runtime config.
//
// The auth cookie never holds the plaintext password: it holds an HMAC of
// the password keyed by a separate secret, both supplied as env vars
// (DASHBOARD_PASSWORD, AUTH_SECRET) that are never committed to the repo.
export async function computeAuthToken(password, secret) {
  if (!password || !secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password));
  return Buffer.from(sig).toString('hex');
}

export const AUTH_COOKIE = 'stt_auth';
