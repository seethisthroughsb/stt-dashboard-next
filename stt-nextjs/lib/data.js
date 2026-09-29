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

// Same as splitTags, but a comment with no tag at all yet (still queued, or
// its Gemini call failed and is waiting on a retry — our schema can't tell
// those apart, and doesn't need to) gets the synthetic 'Unreviewed' tag, so
// it renders as the design's dashed processing-state chip instead of no
// chip at all. Fan Voice and any tag-count view should use this variant;
// getWrittenForMe() above never needs it since that query only ever
// matches already-tagged rows.
function tagsForComment(manualTag, sentimentTag) {
  const tags = splitTags(manualTag, sentimentTag);
  return tags.length ? tags : ['Unreviewed'];
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
         COUNT(DISTINCT author) AS unique_authors,
         COUNT(*) FILTER (WHERE emoji_only = TRUE) AS emoji_only,
         COUNT(*) FILTER (WHERE COALESCE(manual_tag, sentiment_tag) ILIKE '%Written for Me%') AS written_for_me
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
    emojiOnly: Number(c.emoji_only) || 0,
    writtenForMe: Number(c.written_for_me) || 0,
  };
}

// views + estimatedMinutesWatched share the same source/report_type, so one
// query gets both series (same pattern as getIgSeries below). ytViews feeds
// Right Now's chart; ytMins joins it for Platforms' watch-time spark.
async function getYtDailySeries(client) {
  const { rows } = await client.query(
    `SELECT metric, dimensions->>'day' AS day, value
     FROM analytics_metrics
     WHERE source = 'youtube' AND report_type = 'Daily Trend (30d)'
       AND metric IN ('views', 'estimatedMinutesWatched')
     ORDER BY dimensions->>'day'`
  );
  const ytViews = [];
  const ytMins = [];
  for (const r of rows) {
    const point = [r.day, Number(r.value)];
    if (r.metric === 'views') ytViews.push(point);
    else if (r.metric === 'estimatedMinutesWatched') ytMins.push(point);
  }
  return { ytViews, ytMins };
}

// Facebook's one daily-trend metric (see meta-insights.js — Page-level
// engagement is the only FB metric with a day-by-day series; everything
// else FB is a lifetime total). Peaks in the single digits per data-viz.css's
// SCALE RULE, so Platforms only ever sparks this, never charts it.
async function getFbEngSeries(client) {
  const { rows } = await client.query(
    `SELECT dimensions->>'day' AS day, value
     FROM analytics_metrics
     WHERE source = 'meta' AND report_type = 'Facebook Daily Trend (30d)' AND metric = 'page_post_engagements'
     ORDER BY dimensions->>'day'`
  );
  return rows.map((r) => [r.day, Number(r.value)]);
}

async function getWebSessSeries(client) {
  const { rows } = await client.query(
    `SELECT dimensions->>'day' AS day, value
     FROM analytics_metrics
     WHERE source = 'website' AND report_type = 'Daily Trend (30d)' AND metric = 'sessions'
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

// YouTube Analytics' own ageGroup dimension values come back prefixed —
// confirmed live as "age25-34" (not the design bundle's clean "25-34"), but
// strip a leading "ageGroup" too in case the API ever reports it that way.
function stripAgePrefix(raw) {
  return String(raw || '').replace(/^ageGroup/i, '').replace(/^age(?=\d)/i, '');
}

async function getBreakdowns(client) {
  const [ytSrc, ytGeo, ytDev, webConv, webDev, webSrc, ytAge, igDemoAG, igDemoC, webConvEngagement] = await Promise.all([
    // ORDER BY value DESC on every one of these — several views read index
    // [0] as "the top entry" (RightNow's playlist callout, Audience's/
    // Campaigns' top-country and top-source sentences), so the sort has to
    // happen here, not be assumed from insertion order.
    client.query(
      `SELECT dimensions->>'insightTrafficSourceType' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Traffic Source (30d)' AND metric = 'views'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'country' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Geography (30d)' AND metric = 'views'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'deviceType' AS key, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Device Type (30d)' AND metric = 'views'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'eventName' AS key, value
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Conversions (30d)' AND metric = 'eventCount'
       ORDER BY value DESC`
    ),
    // deviceCategory, not deviceType — that's YouTube's dimension name above;
    // GA4's own is spelled differently (see website-analytics.js REPORTS).
    client.query(
      `SELECT dimensions->>'deviceCategory' AS key, value
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Device (30d)' AND metric = 'sessions'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'sessionDefaultChannelGroup' AS key, value
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Traffic Source (30d)' AND metric = 'sessions'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'ageGroup' AS age_group, dimensions->>'gender' AS gender, value
       FROM analytics_metrics
       WHERE source = 'youtube' AND report_type = 'Age/Gender (30d)' AND metric = 'viewerPercentage'
       ORDER BY value DESC`
    ),
    client.query(
      `SELECT dimensions->>'age' AS age, dimensions->>'gender' AS gender, value
       FROM analytics_metrics
       WHERE source = 'meta' AND report_type = 'Instagram Follower Demographics (Age/Gender)' AND metric = 'follower_demographics'`
    ),
    client.query(
      `SELECT dimensions->>'country' AS key, value
       FROM analytics_metrics
       WHERE source = 'meta' AND report_type = 'Instagram Follower Demographics (Country)' AND metric = 'follower_demographics'
       ORDER BY value DESC`
    ),
    // sessions + engagedSessions per event, alongside eventCount (webConv
    // above) — added so a bot-likelihood signal can be computed for
    // add_to_cart specifically (see lib/insights.js). GA4 doesn't expose a
    // direct "is this session a bot" field beyond its own automatic
    // known-bot filtering; engagement rate (an engaged session lasted 10s+,
    // had a conversion event, or had 2+ pageviews) is the closest proxy it
    // does expose. Requires website-analytics.js's Conversions (30d) report
    // to request these metrics — rows are absent for any sync run before
    // that change shipped.
    client.query(
      `SELECT dimensions->>'eventName' AS key, metric, value
       FROM analytics_metrics
       WHERE source = 'website' AND report_type = 'Conversions (30d)'
         AND metric IN ('eventCount', 'sessions', 'engagedSessions')`
    ),
  ]);
  const toPairs = (res) => toRows(res).filter((r) => r.key).map((r) => [r.key, Number(r.value)]);

  const engByEvent = {};
  for (const r of toRows(webConvEngagement)) {
    if (!r.key) continue;
    if (!engByEvent[r.key]) engByEvent[r.key] = { event: r.key, eventCount: 0, sessions: 0, engagedSessions: 0 };
    if (r.metric === 'eventCount') engByEvent[r.key].eventCount = Number(r.value);
    else if (r.metric === 'sessions') engByEvent[r.key].sessions = Number(r.value);
    else if (r.metric === 'engagedSessions') engByEvent[r.key].engagedSessions = Number(r.value);
  }

  return {
    ytSrc: toPairs(ytSrc),
    ytGeo: toPairs(ytGeo),
    ytDev: toPairs(ytDev),
    webConv: toPairs(webConv),
    webDev: toPairs(webDev),
    webSrc: toPairs(webSrc),
    ytAge: toRows(ytAge)
      .filter((r) => r.age_group && r.gender)
      .map((r) => [stripAgePrefix(r.age_group), r.gender, Number(r.value)]),
    igDemoAG: toRows(igDemoAG)
      .filter((r) => r.age && r.gender)
      .map((r) => [r.age, r.gender, Number(r.value)]),
    igDemoC: toPairs(igDemoC),
    webConvEngagement: Object.values(engByEvent),
  };
}

async function getMonths(client) {
  // Anchored to the most recent comment, not the database server's real
  // clock. The two can disagree — this app was built in a sandbox pinned to
  // a fictional "story" date, while comment data and Postgres's own now()
  // reflect real-world time, so anchoring on now() could window out every
  // real comment entirely. Anchoring on the data itself is also just more
  // correct: "last 36 months of activity" should track the data's own
  // timeline, not an arbitrary server clock.
  const { rows } = await client.query(
    `SELECT to_char(gs, 'YYYY-MM') AS month, COALESCE(c.cnt, 0) AS count
     FROM (
       SELECT COALESCE(MAX(posted_at), now()) AS latest FROM comments WHERE excluded = FALSE
     ) AS anchor
     CROSS JOIN LATERAL generate_series(
       date_trunc('month', anchor.latest) - interval '35 months',
       date_trunc('month', anchor.latest),
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

// All (non-excluded) comments, most recent first. The design bundle's own
// guidance is to ship the whole comment set once and filter/scope it
// client-side rather than fetch per view — with 656 comments today that's a
// trivial payload. LIMIT is a safety net, not an expected ceiling; revisit
// with real pagination if the tracked comment volume grows enough to make
// this payload heavy (already flagged as an open item in the project doc).
async function getAllComments(client, limit = 5000) {
  const { rows } = await client.query(
    `SELECT platform, body, posted_at, likes, title, manual_tag, sentiment_tag, emoji_only
     FROM comments
     WHERE excluded = FALSE
     ORDER BY posted_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    p: r.platform,
    text: r.body,
    date: r.posted_at.toISOString().slice(0, 10),
    likes: r.likes || 0,
    tags: tagsForComment(r.manual_tag, r.sentiment_tag),
    title: r.title || '',
    emojiOnly: !!r.emoji_only,
  }));
}

// Tallies every individual tag across a comment list (a comment with
// multiple tags counts once per tag, matching the design's `tagCount`
// shape — an object, not an array, keyed by tag name).
function tagCountFrom(comments) {
  const counts = {};
  for (const c of comments) {
    for (const t of c.tags) {
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
}

async function getUntaggedCount(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt FROM comments
     WHERE excluded = FALSE AND COALESCE(manual_tag, sentiment_tag) IS NULL`
  );
  return Number(rows[0]?.cnt) || 0;
}

// The design bundle's own Campaigns view flags "best day/time to post" as
// blocked because its source data was date-only. Ours isn't — both
// youtube-comments.js and meta-comments.js store the API's full
// publishedAt/created_time timestamp, not just a date — so this is a real
// query, not a stub. The one honest caveat: posted_at is UTC and neither API
// tells us the commenter's own time zone, so the hour is UTC, not local.
async function getBestPostTime(client) {
  const { rows } = await client.query(
    `SELECT to_char(posted_at, 'Dy') AS day, EXTRACT(HOUR FROM posted_at)::int AS hour, COUNT(*) AS cnt
     FROM comments
     WHERE excluded = FALSE
     GROUP BY day, hour
     ORDER BY cnt DESC
     LIMIT 1`
  );
  const r = rows[0];
  if (!r) return null;
  return { day: r.day, hour: Number(r.hour), count: Number(r.cnt) };
}

// Merch queries. Unlike the design bundle's Merch.jsx — which assumes
// WooCommerce isn't connected yet and renders mostly "Not connected"
// placeholders — ours already is (see api/sync/merch.js from the earlier
// migration work), so this view gets real sales/inventory data, not a spec
// for a future integration.
async function getMerchSalesSummary(client) {
  const { rows } = await client.query(
    `SELECT metric, value FROM analytics_metrics
     WHERE source = 'merch' AND report_type = 'Merch Sales Summary (30d)'`
  );
  const m = Object.fromEntries(rows.map((r) => [r.metric, Number(r.value)]));
  return {
    totalSales: m.total_sales || 0,
    netSales: m.net_sales || 0,
    totalOrders: m.total_orders || 0,
    totalItems: m.total_items || 0,
    avgOrderValue: m.average_order_value || 0,
  };
}

async function getMerchSalesSeries(client) {
  const { rows } = await client.query(
    `SELECT metric, dimensions->>'day' AS day, value FROM analytics_metrics
     WHERE source = 'merch' AND report_type = 'Merch Sales Daily Trend (30d)'
     ORDER BY dimensions->>'day'`
  );
  const sales = [];
  const orders = [];
  for (const r of rows) {
    const point = [r.day, Number(r.value)];
    if (r.metric === 'sales') sales.push(point);
    else if (r.metric === 'orders') orders.push(point);
  }
  return { sales, orders };
}

async function getTopSellers(client, limit = 10) {
  const { rows } = await client.query(
    `SELECT dimensions->>'product' AS product, value FROM analytics_metrics
     WHERE source = 'merch' AND report_type = 'Top Sellers (30d)' AND metric = 'quantity_sold'
     ORDER BY value DESC
     LIMIT $1`,
    [limit]
  );
  return rows.filter((r) => r.product).map((r) => [r.product, Number(r.value)]);
}

// One row per (product, metric) — stock_quantity and price are separate
// metric rows sharing the same dims (see merch.js), so group them back into
// one object per product here rather than in the view.
async function getInventory(client) {
  const { rows } = await client.query(
    `SELECT dimensions->>'product' AS product, dimensions->>'stock_status' AS stock_status, metric, value
     FROM analytics_metrics
     WHERE source = 'merch' AND report_type = 'Merch Inventory Snapshot'`
  );
  const byProduct = {};
  for (const r of rows) {
    if (!r.product) continue;
    if (!byProduct[r.product]) byProduct[r.product] = { product: r.product, stockStatus: r.stock_status || '' };
    if (r.metric === 'stock_quantity') byProduct[r.product].stockQuantity = r.value === null ? null : Number(r.value);
    else if (r.metric === 'price') byProduct[r.product].price = r.value === null ? null : Number(r.value);
  }
  return Object.values(byProduct);
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

// The AI-generated Opportunities synthesis (see app/api/sync/ai-summary/
// route.js). Generated once per Sync Now run, not per page load — this just
// reads back whatever was cached there last. Absent until the first sync
// that includes the new "AI summary" stage runs.
async function getAiSummary(client) {
  const { rows } = await client.query(
    `SELECT value FROM app_settings WHERE key = 'ai_summary'`
  );
  const v = rows[0]?.value;
  if (!v?.text) return null;
  return { text: v.text, generatedAt: v.generatedAt || null, model: v.model || null };
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
    const [pull, totals, ytDaily, igSeries, breakdowns, months, writtenForMe, release, lastCommentDate] =
      await Promise.all([
        getPull(client),
        getTotals(client),
        getYtDailySeries(client),
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
        ytViews: ytDaily.ytViews,
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

// Loads what the "Fan Voice" view needs: totals for "The signal" section,
// the tag-count breakdown for the sentiment-mix panel, the full comment
// list (scope/filter/platform/hide-emoji all applied client-side — see
// components/views/FanVoice.jsx), and the same months/release-highlight
// fields Right Now uses for its own empty-state MonthBars.
async function loadFanVoiceData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, comments, months, release, lastCommentDate] = await Promise.all([
      getTotals(client),
      getAllComments(client),
      getMonths(client),
      getReleaseHighlight(client),
      getLastCommentDate(client),
    ]);

    return {
      lastCommentDate,
      totals,
      tagCount: tagCountFrom(comments),
      comments,
      months,
      releaseMonth: release.releaseMonth,
      releaseLabel: release.releaseLabel,
    };
  } finally {
    client.release();
  }
}

// Loads what the "Platforms" view needs: per-platform totals plus every
// daily series and breakdown across YouTube/Meta/Website. No comment or
// month data — this view is purely the analytics side, so `pull`/
// `lastCommentDate` for the sidebar come from getSidebarMeta() instead (see
// app/platforms/page.js), same as Fan Voice's page does.
async function loadPlatformsData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, ytDaily, igSeries, fbEng, webSess, breakdowns] = await Promise.all([
      getTotals(client),
      getYtDailySeries(client),
      getIgSeries(client),
      getFbEngSeries(client),
      getWebSessSeries(client),
      getBreakdowns(client),
    ]);

    return {
      totals,
      series: {
        ytViews: ytDaily.ytViews,
        ytMins: ytDaily.ytMins,
        fbEng,
        igFoll: igSeries.igFoll,
        igReach: igSeries.igReach,
        webSess,
      },
      breakdowns,
    };
  } finally {
    client.release();
  }
}

// Loads what the "Audience" view needs: comment totals (for the "Reach vs
// engagement" section) plus the geography/age-gender breakdowns for both
// YouTube and Instagram. No series or comment list, so — like Platforms —
// `pull`/`lastCommentDate` for the sidebar come from getSidebarMeta()
// instead (see app/audience/page.js).
async function loadAudienceData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, breakdowns] = await Promise.all([
      getTotals(client),
      getBreakdowns(client),
    ]);

    return { totals, breakdowns };
  } finally {
    client.release();
  }
}

// Loads what the "Campaigns" view needs: totals + breakdowns (already
// fetched for Platforms/Audience) plus the quote pool, the untagged count,
// and the real best-day/time query described above.
async function loadCampaignsData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, breakdowns, writtenForMe, untaggedCount, bestPostTime] = await Promise.all([
      getTotals(client),
      getBreakdowns(client),
      getWrittenForMe(client),
      getUntaggedCount(client),
      getBestPostTime(client),
    ]);

    return { totals, breakdowns, writtenForMe, untaggedCount, bestPostTime };
  } finally {
    client.release();
  }
}

// Loads what the "Opportunities" view needs: totals + breakdowns + series +
// months + release month + a tagCount shape carrying just the one field
// insights.js's data-quality rule reads (`tagCount['Unreviewed']`) — no need
// to fetch every comment to tally every tag when only that one count feeds
// a rule. `merch` is just the sales summary (not the full loadMerchData()
// payload) — the merch-funnel-gap rule needs real order/revenue numbers now
// that WooCommerce is connected, so it stops claiming they don't exist. The
// raw shape is handed to lib/insights.js's deriveInsights() in the view
// itself (a pure function over this same data, ported from the design
// bundle's insights.js).
async function loadOpportunitiesData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, breakdowns, ytDaily, fbEng, months, release, untaggedCount, aiSummary, merch] = await Promise.all([
      getTotals(client),
      getBreakdowns(client),
      getYtDailySeries(client),
      getFbEngSeries(client),
      getMonths(client),
      getReleaseHighlight(client),
      getUntaggedCount(client),
      getAiSummary(client),
      getMerchSalesSummary(client),
    ]);

    return {
      totals,
      breakdowns,
      series: { ytViews: ytDaily.ytViews, fbEng },
      months,
      releaseMonth: release.releaseMonth,
      tagCount: { Unreviewed: untaggedCount },
      aiSummary,
      merch,
    };
  } finally {
    client.release();
  }
}

// Loads what the "Merch" view needs: the GA4-visible half of the funnel
// (totals + breakdowns, already fetched elsewhere) plus the WooCommerce
// side — sales summary, daily trend, top sellers, and inventory (from
// which the view derives its own "low stock" cut, sorted lowest-first).
async function loadMerchData() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [totals, breakdowns, salesSummary, salesSeries, topSellers, inventory] = await Promise.all([
      getTotals(client),
      getBreakdowns(client),
      getMerchSalesSummary(client),
      getMerchSalesSeries(client),
      getTopSellers(client),
      getInventory(client),
    ]);

    const lowStock = inventory
      .filter((p) => p.stockQuantity != null && p.stockQuantity <= 5)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    return {
      totals,
      breakdowns,
      salesSummary,
      salesSeries,
      topSellers,
      lowStock,
      hasSales: salesSummary.totalOrders > 0 || salesSummary.totalSales > 0,
    };
  } finally {
    client.release();
  }
}

// The sidebar (Shell.jsx) shows "Data pulled <date>" + "Last comment <n>d
// ago" on every view, not just Right Now — every page loader calls this
// alongside its own view-specific data so the sidebar stays consistent
// regardless of which view is open.
async function getSidebarMeta() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const [pull, lastCommentDate] = await Promise.all([
      getPull(client),
      getLastCommentDate(client),
    ]);
    return { pull, lastCommentDate };
  } finally {
    client.release();
  }
}

module.exports = {
  loadRightNowData,
  loadFanVoiceData,
  loadPlatformsData,
  loadAudienceData,
  loadCampaignsData,
  loadOpportunitiesData,
  loadMerchData,
  getSidebarMeta,
};
