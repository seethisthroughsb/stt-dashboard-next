// Builds the `STT` data shape the design bundle's views read (see
// design_handoff_vercel/reference/ui_kits/dashboard/data.js for the
// reference shape — this is the real, server-side equivalent of that
// `window.STT` object, sourced from our Postgres/Neon tables instead of
// the old Google Sheet).
//
// Built incrementally, one view at a time, per the agreed build order.
// Only the fields the views built so far actually need are populated;
// everything else has a `// TODO(<view>)` marking where it slots in later
// so the shape never has to be reworked, only filled in.
//
// Field-by-field mapping notes (from the design handoff's data contract):
//   - `sentiment_tag` stores MULTIPLE tags as one comma-joined string
//     (e.g. "Written for Me, Hope/Redemption"), not an array — split on
//     ", " wherever the design shape wants `tags: string[]`.
//   - `manual_tag` takes precedence over `sentiment_tag` when set (per the
//     schema comment in db/001_init_schema.sql).
//   - `excluded = true` rows are dropped from every view.
//   - Analytics tabs no longer need the "filter to one Date Pulled" caution
//     the design bundle repeats everywhere — our upsert-on-write schema
//     keeps exactly one current row per (source, report_type, metric,
//     dimensions), so a plain SELECT is already deduped.
const { getPool } = require('./db');

function toRows(queryResult) {
  return queryResult.rows;
}

function splitTags(manualTag, sentimentTag) {
  const raw = manualTag || sentimentTag;
  if (!raw) return [];
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

function fmtPullDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

async function getPull(client) {
  const { rows } = await client.query(
    `SELECT MAX(date_pulled) AS latest FROM analytics_metrics`
  );
  return fmtPullDate(rows[0]?.latest);
}

async function getTotals(client) {
  const [
    ytDaily,
    webDaily,
    fbTotals,
    igTotals,
    commentCounts,
  ] = await Promise.all([
    client.query(
      `SELECT metric, SUM(value) AS total
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Daily Trend (30d)'
       GROUP BY metric`
    ),
    client.query(
      `SELECT metric, SUM(value) AS total
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Daily Trend (30d)'
       GROUP BY metric`
    ),
    client.query(
      `SELECT metric, value
       FROM analytics_metrics
       WHERE source = 'meta' AND report_type = 'Facebook Follower Totals'`
    ),
    client.query(
      `SELECT metric, value
       FROM analytics_metrics
       WHERE source = 'meta' AND report_type = 'Instagram Follower Totals'`
    ),
    client.query(
      `SELECT
         COUNT(*) FILTER (WHERE platform = 'YouTube') AS yt_comments,
         COUNT(*) FILTER (WHERE platform IN ('Facebook', 'Instagram')) AS meta_comments,
         COUNT(*) AS all_comments,
         COUNT(DISTINCT author) AS unique_authors
       FROM comments
       WHERE excluded = FALSE`
    ),
  ]);

  const yt = Object.fromEntries(toRows(ytDaily).map((r) => [r.metric, Number(r.total)]));
  const web = Object.fromEntries(toRows(webDaily).map((r) => [r.metric, Number(r.total)]));
  const fb = Object.fromEntries(toRows(fbTotals).map((r) => [r.metric, Number(r.value)]));
  const ig = Object.fromEntries(toRows(igTotals).map((r) => [r.metric, Number(r.value)]));
  const c = toRows(commentCounts)[0] || {};

  return {
    ytComments: Number(c.yt_comments) || 0,
    metaComments: Number(c.meta_comments) || 0,
    allComments: Number(c.all_comments) || 0,
    uniqueAuthors: Number(c.unique_authors) || 0,
    fbFans: fb.followers_count ?? fb.fan_count ?? 0,
    igFollowers: ig.followers_count ?? 0,
    ytSubsGained: yt.subscribersGained || 0,
    ytSubsLost: yt.subscribersLost || 0,
    ytViews30: yt.views || 0,
    ytMinutes30: yt.estimatedMinutesWatched || 0,
    webSessions30: web.sessions || 0,
    // TODO(Fan Voice / Audience): emojiOnly, writtenForMe counts
  };
}

async function getYtViewsSeries(client) {
  const { rows } = await client.query(
    `SELECT dimensions->>'day' AS day, value
     FROM analytics_metrics
     WHERE source = 'youtube' AND report_type = 'Daily Trend (30d)' AND metric = 'views'
     ORDER BY dimensions->>'day'`
  );
  return rows.map((r) => [r.day, Number(r.value)]);
}

async function getIgSeries(client) {
  const { rows } = await client.query(
    `SELECT metric, dimensions->>'day' AS day, value
     FROM analytics_metrics
     WHERE source = 'meta' AND report_type = 'Instagram Daily Trend (30d)'
       AND metric IN ('follower_count', 'reach')
       AND dimensions ? 'day'
     ORDER BY dimensions->>'day'`
  );
  const igFoll = [];
  const igReach = [];
  for (const r of rows) {
    const point = [r.day, Number(r.value)];
    if (r.metric === 'follower_count') igFoll.push(point);
    else if (r.metric === 'reach') igReach.push(point);
  }
  return { igFoll, igReach };
}

async function getBreakdowns(client) {
  const [ytSrc, ytGeo, ytDev, webConv] = await Promise.all([
    client.query(
      `SELECT dimensions->>'insightTrafficSourceType' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Traffic Source (30d)' AND metric = 'views'`
    ),
    client.query(
      `SELECT dimensions->>'country' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Geography (30d)' AND metric = 'views'`
    ),
    client.query(
      `SELECT dimensions->>'deviceType' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Device Type (30d)' AND metric = 'views'`
    ),
    client.query(
      `SELECT dimensions->>'eventName' AS key, value
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Conversions (30d)' AND metric = 'eventCount'`
    ),
  ]);
  const toPairs = (res) => toRows(res).filter((r) => r.key).map((r) => [r.key, Number(r.value)]);
  return {
    ytSrc: toPairs(ytSrc),
    ytGeo: toPairs(ytGeo),
    ytDev: toPairs(ytDev),
    webConv: toPairs(webConv),
    // TODO(Audience): ytAge, igDemoAG, igDemoC
    // TODO(Platforms): webDev, webSrc
  };
}

async function getMonths(client) {
  const { rows } = await client.query(
    `SELECT to_char(gs, 'YYYY-MM') AS month, COALESCE(c.cnt, 0) AS count
     FROM generate_series(
       date_trunc('month', now()) - interval '35 months',
       date_trunc('month', now()),
       interval '1 month'
     ) AS gs
     LEFT JOIN (
       SELECT date_trunc('month', posted_at) AS month, COUNT(*) AS cnt
       FROM comments
       WHERE excluded = FALSE
       GROUP BY 1
     ) c ON c.month = gs
     ORDER BY gs`
  );
  return rows.map((r) => [r.month, Number(r.count)]);
}

async function getWrittenForMe(client, limit = 10) {
  const { rows } = await client.query(
    `SELECT platform, body, posted_at, likes, title, manual_tag, sentiment_tag
     FROM comments
     WHERE excluded = FALSE
       AND (COALESCE(manual_tag, sentiment_tag) ILIKE '%Written for Me%')
     ORDER BY posted_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    p: r.platform,
    text: r.body,
    date: r.posted_at.toISOString().slice(0, 10),
    likes: r.likes || 0,
    tags: splitTags(r.manual_tag, r.sentiment_tag),
    title: r.title || '',
  }));
}

async function getReleaseHighlight(client) {
  const { rows } = await client.query(
    `SELECT value FROM app_settings WHERE key = 'release_highlight'`
  );
  const v = rows[0]?.value;
  return {
    releaseMonth: v?.month ?? null,
    releaseLabel: v?.label ?? null,
  };
}

async function getLastCommentDate(client) {
  const { rows } = await client.query(
    `SELECT MAX(posted_at) AS latest FROM comments WHERE excluded = FALSE`
  );
  const latest = rows[0]?.latest;
  return latest ? new Date(latest).toISOString().slice(0, 10) : null;
}

// Loads exactly what the "Right Now" view needs. Other views will extend
// this (or add sibling loaders) as they're built — see the TODO markers
// above for what's already scoped out but not yet wired up.
async function loadRightNowData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [pull, totals, ytViews, igSeries, breakdowns, months, writtenForMe, release, lastCommentDate] =
      await Promise.all([
        getPull(client),
        getTotals(client),
        getYtViewsSeries(client),
        getIgSeries(client),
        getBreakdowns(client),
        getMonths(client),
        getWrittenForMe(client),
        getReleaseHighlight(client),
        getLastCommentDate(client),
      ]);

    return {
      pull,
      lastCommentDate,
      totals,
      series: {
        ytViews,
        igFoll: igSeries.igFoll,
        igReach: igSeries.igReach,
      },
      breakdowns,
      months,
      writtenForMe,
      releaseMonth: release.releaseMonth,
      releaseLabel: release.releaseLabel,
    };
  } finally {
    client.release();
  }
}

module.exports = { loadRightNowData };
