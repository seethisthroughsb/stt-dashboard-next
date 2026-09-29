// Proxies Sync Now's per-source calls to the existing, already-live sync
// endpoints on the original backend (stt-social-listening.vercel.app —
// same Neon database, different Vercel project). Kept as a thin server-side
// proxy rather than fetching that domain directly from the browser so the
// Sync Now button never has to depend on the old app's CORS config: a
// same-origin route on this app, calling the other app server-to-server
// (not subject to CORS), is what components/Shell.jsx's client code calls.
//
// Only the 7 real source keys are allowed through — this route can't be
// used to hit an arbitrary path on the backend.
const BACKEND = 'https://stt-social-listening.vercel.app';

const ALLOWED_SOURCES = new Set([
  'youtube-comments',
  'meta-comments',
  'website-analytics',
  'merch',
  'meta-insights',
  'youtube-analytics',
  'sentiment-tagging',
]);

// sentiment-tagging can process up to 1200 comments per run against Gemini
// and is itself configured for up to 120s on the backend (see
// api/sync/sentiment-tagging.js's module.exports.config there) — this route
// has to be allowed to wait at least that long, or Vercel kills it first
// and the client sees a false failure even though the backend is still working.
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { source } = params;

  if (!ALLOWED_SOURCES.has(source)) {
    return Response.json({ ok: false, error: `Unknown sync source: ${source}` }, { status: 400 });
  }

  try {
    const resp = await fetch(`${BACKEND}/api/sync/${source}`, { cache: 'no-store' });
    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }

    if (!resp.ok || !data || data.ok === false) {
      const message = (data && (data.error || (data.errors && data.errors.join('; ')))) || `${source} sync failed (HTTP ${resp.status})`;
      return Response.json({ ok: false, error: message }, { status: 502 });
    }

    return Response.json(data, { status: 200 });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 502 });
  }
}
