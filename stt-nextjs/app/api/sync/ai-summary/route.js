// The AI layer Nick asked for on top of Opportunities' rule engine (see
// lib/insights.js). Deliberately NOT a free-form LLM pass over raw data —
// that would lose the rule engine's core guarantee ("if a rule stops being
// true, its card disappears": every card is a verified, reproducible fact).
// Instead: the rule engine runs first as usual, and this just asks Claude to
// write one short narrative paragraph that synthesizes the same already-
// computed, already-true insights — it's told not to invent any new numbers.
//
// Runs once per Sync Now click (this is the final stage in Shell.jsx's
// SOURCES list), not on every page load — the result is cached in
// app_settings under 'ai_summary' and just read back by
// lib/data.js's getAiSummary() on each Opportunities page view. That keeps
// it cheap (one API call per sync, not per visitor) and fast to view.
//
// Distinct from app/api/sync/[source]/route.js: those proxy to the
// separately-deployed original backend; this one runs entirely in this app,
// since it only needs this app's own Postgres pool and the Anthropic API.
const { getPool } = require('../../../../lib/db');
const { loadOpportunitiesData } = require('../../../../lib/data');
const { deriveInsights } = require('../../../../lib/insights');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You write a short synthesis for a band's internal analytics dashboard.
You will be given a list of already-computed, already-verified data insights (each with a title,
a real stat, and evidence) plus a few headline totals, sorted highest-priority first. Write 3-5
plain sentences that connect the dots into one coherent read of what's really happening right
now — do not just restate every item, prioritize and synthesize the highest-weight ones. Do not
invent any number, date, platform name, or fact beyond what is given. No markdown, no headers, no
bullet points, no bold text — plain prose only, under 120 words. Second person is fine ("You're
seeing...").`;

function buildPrompt(totals, insights) {
  const lines = [
    `Totals: ${totals.ytViews30} YouTube views (30d), ${totals.webSessions30} site sessions (30d), ` +
      `${totals.allComments} comments tracked, ${totals.writtenForMe} "written for me" comments, ` +
      `${totals.fbFans} Facebook followers, ${totals.igFollowers} Instagram followers.`,
    '',
    'Insights, highest priority first:',
  ];
  insights.slice(0, 8).forEach((ins, i) => {
    lines.push(`${i + 1}. [${ins.kind}] ${ins.title} — ${ins.stat} ${ins.statLabel}. ${ins.evidence}`);
  });
  return lines.join('\n');
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: 'ANTHROPIC_API_KEY isn’t set on the server.' },
      { status: 500 }
    );
  }

  let data;
  try {
    data = await loadOpportunitiesData();
  } catch (err) {
    return Response.json({ ok: false, error: `Couldn't load data for the summary: ${err.message}` }, { status: 500 });
  }

  const insights = deriveInsights(data);
  if (insights.length === 0) {
    return Response.json({ ok: false, error: 'No insights cleared their threshold yet — nothing to summarize.' }, { status: 200 });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  let text;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(data.totals, insights) }],
      }),
    });

    const payload = await resp.json().catch(() => null);
    if (!resp.ok) {
      const message = payload?.error?.message || `Anthropic API returned HTTP ${resp.status}`;
      return Response.json({ ok: false, error: message }, { status: 502 });
    }
    text = (payload?.content || []).map((b) => b.text || '').join('').trim();
    if (!text) {
      return Response.json({ ok: false, error: 'Anthropic API returned an empty response.' }, { status: 502 });
    }
  } catch (err) {
    return Response.json({ ok: false, error: `Anthropic API call failed: ${err.message}` }, { status: 502 });
  }

  const value = { text, generatedAt: new Date().toISOString(), model };

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO app_settings (key, value) VALUES ('ai_summary', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    );
  } catch (err) {
    return Response.json({ ok: false, error: `Generated but couldn't save: ${err.message}` }, { status: 500 });
  } finally {
    client.release();
  }

  return Response.json({ ok: true, ...value });
}
