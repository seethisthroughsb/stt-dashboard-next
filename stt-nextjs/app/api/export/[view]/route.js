// Server-side CSV export, per the design bundle's own spec ("Export: ...
// Live, it should export the *current filtered view* as CSV. ... build the
// CSV server-side, return it as a data URI" — README.md's Interactions
// section). Implemented here as a real GET route returning `text/csv` with
// `Content-Disposition: attachment` rather than a data URI, so the browser
// just downloads it directly when the header Export button (an <a>, see
// components/Shell.jsx) is clicked — no client-side JS needed.
//
// Each view gets its own CSV shape built from the same loadXData() the
// page itself renders from (so the numbers always match what's on screen),
// reduced to the breakdowns/fields that view actually displays rather than
// dumping the full shared query pool.
const {
  loadRightNowData,
  loadFanVoiceData,
  loadPlatformsData,
  loadAudienceData,
  loadCampaignsData,
  loadOpportunitiesData,
  loadMerchData,
} = require('../../../../lib/data');
const { deriveInsights } = require('../../../../lib/insights');
const { csvResponse } = require('../../../../lib/csv');

export const dynamic = 'force-dynamic';

const TOTAL_LABELS = {
  ytComments: 'YouTube Comments',
  metaComments: 'Meta Comments',
  allComments: 'Comments Tracked',
  uniqueAuthors: 'Unique Commenters',
  fbFans: 'Facebook Followers',
  igFollowers: 'Instagram Followers',
  ytSubsGained: 'YouTube Subscribers Gained',
  ytSubsLost: 'YouTube Subscribers Lost',
  ytViews30: 'YouTube Views (30d)',
  ytMinutes30: 'YouTube Watch Minutes (30d)',
  webSessions30: 'Website Sessions (30d)',
  emojiOnly: 'Emoji-Only Comments',
  writtenForMe: '"Written For Me" Comments',
};

function totalsRows(totals, keys) {
  return keys
    .filter((k) => totals[k] !== undefined)
    .map((k) => [TOTAL_LABELS[k] || k, totals[k]]);
}

// A 2-tuple breakdown ([key, value]) becomes one row with an empty
// secondary column; a 3-tuple ([a, b, value], e.g. age+gender) fills it.
function breakdownRows(breakdowns, key, label) {
  return (breakdowns[key] || []).map((tuple) => {
    if (tuple.length >= 3) return [label, tuple[0], tuple[1], tuple[2]];
    return [label, tuple[0], '', tuple[1]];
  });
}

async function buildNow() {
  const d = await loadRightNowData();
  const rows = [
    ['Metric', 'Value'],
    ...totalsRows(d.totals, [
      'ytViews30', 'ytMinutes30', 'ytSubsGained', 'ytSubsLost',
      'webSessions30', 'fbFans', 'igFollowers', 'allComments', 'writtenForMe',
    ]),
    ['Data Pulled', d.pull],
    ['Last Comment', d.lastCommentDate || ''],
  ];
  return rows;
}

async function buildVoice() {
  const d = await loadFanVoiceData();
  const rows = [['Date', 'Platform', 'Text', 'Tags', 'Likes', 'Title', 'Emoji Only']];
  for (const c of d.comments) {
    rows.push([c.date, c.p, c.text, c.tags.join('; '), c.likes, c.title, c.emojiOnly ? 'Yes' : 'No']);
  }
  return rows;
}

async function buildPlatforms() {
  const d = await loadPlatformsData();
  const rows = [
    ['Category', 'Key', 'Secondary', 'Value'],
    ...totalsRows(d.totals, [
      'ytViews30', 'ytMinutes30', 'ytSubsGained', 'ytSubsLost', 'ytComments',
      'fbFans', 'igFollowers', 'metaComments', 'webSessions30',
    ]).map(([k, v]) => ['Totals', k, '', v]),
    ...breakdownRows(d.breakdowns, 'ytSrc', 'YouTube Traffic Source'),
    ...breakdownRows(d.breakdowns, 'ytDev', 'YouTube Device'),
    ...breakdownRows(d.breakdowns, 'webConv', 'Website Conversion Event'),
    ...breakdownRows(d.breakdowns, 'webDev', 'Website Device'),
    ...breakdownRows(d.breakdowns, 'webSrc', 'Website Traffic Source'),
  ];
  return rows;
}

async function buildAudience() {
  const d = await loadAudienceData();
  const rows = [
    ['Category', 'Key', 'Secondary', 'Value'],
    ...totalsRows(d.totals, ['uniqueAuthors', 'allComments', 'emojiOnly', 'writtenForMe'])
      .map(([k, v]) => ['Totals', k, '', v]),
    ...breakdownRows(d.breakdowns, 'ytGeo', 'YouTube Geography'),
    ...breakdownRows(d.breakdowns, 'ytAge', 'YouTube Age/Gender'),
    ...breakdownRows(d.breakdowns, 'igDemoAG', 'Instagram Age/Gender'),
    ...breakdownRows(d.breakdowns, 'igDemoC', 'Instagram Geography'),
  ];
  return rows;
}

async function buildCampaigns() {
  const d = await loadCampaignsData();
  const rows = [
    ['Category', 'Key', 'Secondary', 'Value'],
    ...totalsRows(d.totals, ['ytMinutes30', 'fbFans', 'writtenForMe'])
      .map(([k, v]) => ['Totals', k, '', v]),
    ...breakdownRows(d.breakdowns, 'ytGeo', 'YouTube Geography'),
    ...breakdownRows(d.breakdowns, 'ytSrc', 'YouTube Traffic Source'),
    ...breakdownRows(d.breakdowns, 'ytAge', 'YouTube Age/Gender'),
    ...breakdownRows(d.breakdowns, 'ytDev', 'YouTube Device'),
    ...breakdownRows(d.breakdowns, 'igDemoAG', 'Instagram Age/Gender'),
  ];
  if (d.bestPostTime) {
    rows.push(['Best Post Time', d.bestPostTime.day, d.bestPostTime.hour + ':00 UTC', d.bestPostTime.count]);
  }
  rows.push(['Untagged Comments', '', '', d.untaggedCount]);
  return rows;
}

async function buildOpportunities() {
  const d = await loadOpportunitiesData();
  const insights = deriveInsights(d);
  const rows = [['Kind', 'Weight', 'Title', 'Stat', 'Stat Label', 'Evidence', 'Do This']];
  for (const i of insights) {
    rows.push([i.kind, i.weight, i.title, i.stat, i.statLabel, i.evidence, i.action]);
  }
  return rows;
}

async function buildMerch() {
  const d = await loadMerchData();
  const rows = [['Section', 'Label', 'Value 1', 'Value 2', 'Value 3']];
  const s = d.salesSummary;
  rows.push(
    ['Sales Summary', 'Revenue (30d)', s.netSales, '', ''],
    ['Sales Summary', 'Orders', s.totalOrders, '', ''],
    ['Sales Summary', 'Units Sold', s.totalItems, '', ''],
    ['Sales Summary', 'Average Order Value', s.avgOrderValue, '', '']
  );
  for (const [product, units] of d.topSellers) {
    rows.push(['Top Sellers', product, units, '', '']);
  }
  for (const p of d.lowStock) {
    rows.push(['Low Stock', p.product, p.stockStatus, p.stockQuantity, p.price]);
  }
  return rows;
}

const BUILDERS = {
  now: { build: buildNow, name: 'right-now' },
  voice: { build: buildVoice, name: 'fan-voice' },
  platforms: { build: buildPlatforms, name: 'platforms' },
  audience: { build: buildAudience, name: 'audience' },
  campaigns: { build: buildCampaigns, name: 'campaigns' },
  opportunities: { build: buildOpportunities, name: 'opportunities' },
  merch: { build: buildMerch, name: 'merch' },
};

export async function GET(req, { params }) {
  const { view } = params;
  const entry = BUILDERS[view];
  if (!entry) {
    return Response.json({ ok: false, error: `Unknown export view: ${view}` }, { status: 400 });
  }

  try {
    const rows = await entry.build();
    const date = new Date().toISOString().slice(0, 10);
    return csvResponse(`stt-${entry.name}-${date}.csv`, rows);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
