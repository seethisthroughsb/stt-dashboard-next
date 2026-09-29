// Batch-translates non-English comments to English, caching the result so
// Fan Voice never has to call an LLM at view time — same "generate once at
// sync, read back on every page view" pattern as app/api/sync/ai-summary,
// and the same Anthropic API key/model.
//
// Design (Nick's choice, 29 Sep 2026, over an on-demand per-click
// alternative): translate everything in advance, cached, so browsing is
// instant and CSV exports get translations for free. The original comment
// text is never touched or replaced — `body` stays exactly as synced;
// `translated_text` is purely additive, and the UI shows both.
//
// Cost/latency control: `lang` doubles as the "have we looked at this
// comment yet" marker — every comment gets a `lang` value once processed
// (even English ones, so they're never re-checked), and only non-English
// ones also get `translated_text`. Each run only picks up comments where
// `lang IS NULL`, batched 20 at a time to Claude (one call detects +
// translates the whole batch, not one call per comment) and capped at
// BATCH_LIMIT batches per run to stay well inside maxDuration. On the very
// first run (657 existing comments, all unprocessed) this means the
// backfill completes over a few Sync Now clicks rather than one — same
// "filling in over time" shape as sentiment tagging's Untagged count.
const { getPool } = require('../../../../lib/db');

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;
const BATCH_LIMIT = 10; // up to 200 comments processed per Sync Now click

const SYSTEM_PROMPT = `You are given a numbered list of social media comments on a band's videos and
posts. For each one, identify its language. If a comment is already in English, return null for its
translation. If it is not in English, translate it into natural, fluent English — preserve the tone
and meaning, don't add commentary or explanation, don't soften or censor anything.

Respond with ONLY a JSON array, one object per input comment, in the same order, shaped exactly like:
[{"lang": "Spanish", "translation": "..."}, {"lang": "English", "translation": null}, ...]
"lang" is the language's common English name (e.g. "Spanish", "Portuguese", "Tagalog"), never a code.
No prose before or after the array, no markdown code fences.`;

function buildPrompt(rows) {
  return rows.map((r, i) => `${i + 1}. ${r.body}`).join('\n');
}

function parseJsonArray(text) {
  // Strip a markdown fence if the model added one despite being told not to.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array');
  return parsed;
}

async function translateBatch(apiKey, model, rows) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(rows) }],
    }),
  });

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(payload?.error?.message || `Anthropic API returned HTTP ${resp.status}`);
  }
  const text = (payload?.content || []).map((b) => b.text || '').join('').trim();
  const results = parseJsonArray(text);
  if (results.length !== rows.length) {
    throw new Error(`Expected ${rows.length} results, got ${results.length}`);
  }
  return results;
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: 'ANTHROPIC_API_KEY isn’t set on the server.' },
      { status: 500 }
    );
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  const pool = getPool();
  const client = await pool.connect();
  let processed = 0;
  let translated = 0;
  const errors = [];

  try {
    for (let batchNum = 0; batchNum < BATCH_LIMIT; batchNum++) {
      const { rows } = await client.query(
        `SELECT id, body FROM comments
         WHERE excluded = FALSE AND lang IS NULL AND body IS NOT NULL AND body <> ''
         ORDER BY posted_at DESC
         LIMIT $1`,
        [BATCH_SIZE]
      );
      if (rows.length === 0) break; // caught up — nothing left to process

      let results;
      try {
        results = await translateBatch(apiKey, model, rows);
      } catch (err) {
        errors.push(err.message);
        break; // stop on API trouble rather than burning through remaining batches
      }

      for (let i = 0; i < rows.length; i++) {
        const r = results[i] || {};
        const lang = r.lang || 'Unknown';
        const isEnglish = /^english$/i.test(lang);
        await client.query(
          `UPDATE comments SET lang = $1, translated_text = $2 WHERE id = $3`,
          [lang, isEnglish ? null : (r.translation || null), rows[i].id]
        );
        processed++;
        if (!isEnglish && r.translation) translated++;
      }
    }
  } finally {
    client.release();
  }

  return Response.json({ ok: errors.length === 0, processed, translated, errors });
}
