import { computeAuthToken, AUTH_COOKIE } from '../../../lib/auth';
import { getPool } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// Constant-time-ish compare: not critical for a single shared password on
// an internal tool, but cheap to do right.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 28 Oct 2026 (Nick: "as secure as possible, especially with other
// features we want to build into this"): the one real gap in the auth
// gate was that nothing stopped repeated password guesses — a safe
// compare and an HMAC'd cookie don't help if an attacker can just try
// forever. This is a straightforward fixed-window limiter, keyed on
// client IP, backed by Postgres (the same Neon database everything else
// here already uses — see db/004_add_login_attempts.sql in
// stt-social-listening, run that migration before this ships). It runs on
// the Node runtime (this route, unlike middleware.js, isn't Edge), so a
// real `pg` connection is fine here.
const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_WINDOW = 8;

// Vercel sets x-forwarded-for on every request; the first entry is the
// actual client. Shared offices/NAT mean a lockout can occasionally catch
// an innocent coworker behind the same IP as whoever tripped it — an
// acceptable tradeoff for a small-team internal tool, not for a public
// product with thousands of users behind the same corporate proxy.
function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

async function recentFailureCount(pool, ip) {
  // Opportunistic cleanup rather than a separate cron job — this table is
  // low-volume (login attempts only), so paying a small delete cost on
  // every login request keeps it from growing unbounded with no extra
  // infrastructure.
  await pool.query(`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`);
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM login_attempts
     WHERE ip = $1 AND succeeded = false
       AND attempted_at > now() - ($2 || ' minutes')::interval`,
    [ip, String(WINDOW_MINUTES)]
  );
  return rows[0]?.n || 0;
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

  const ip = getClientIp(req);
  const pool = getPool();

  // Checked before the password is even compared, so a locked-out client
  // learns nothing more than "try later" either way.
  try {
    const failures = await recentFailureCount(pool, ip);
    if (failures >= MAX_ATTEMPTS_PER_WINDOW) {
      return Response.json(
        { ok: false, error: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }
  } catch {
    // If the rate-limit table isn't there yet (migration not run) or the
    // query fails for any other reason, fail OPEN on the limiter itself —
    // a DB hiccup shouldn't lock everyone out of a working password gate.
    // The password check below still applies as normal either way.
  }

  const { password } = body || {};
  const correct = safeEqual(String(password || ''), expectedPassword);

  try {
    await pool.query(`INSERT INTO login_attempts (ip, succeeded) VALUES ($1, $2)`, [ip, correct]);
  } catch {
    // Same reasoning — don't fail a real login over a logging error.
  }

  if (!correct) {
    return Response.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await computeAuthToken(expectedPassword, secret);
  const res = Response.json({ ok: true });
  // Shortened from 30 to 7 days (Nick: "as secure as possible") — a
  // stolen/left-open device stays usable for a week instead of a month.
  // Logging back in is one password entry, so the convenience cost is low.
  res.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  return res;
}
