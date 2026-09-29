import { computeAuthToken, AUTH_COOKIE } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// Constant-time-ish compare: not critical for a single shared password on
// an internal tool, but cheap to do right.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req) {
  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!expectedPassword || !secret) {
    return Response.json(
      { ok: false, error: 'Auth isn’t configured yet — DASHBOARD_PASSWORD/AUTH_SECRET missing on the server.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const { password } = body || {};
  if (!safeEqual(String(password || ''), expectedPassword)) {
    return Response.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await computeAuthToken(expectedPassword, secret);
  const res = Response.json({ ok: true });
  res.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
  return res;
}
