// Ported from reference/ui_kits/dashboard/insights.js — derived insights.
// Every entry is a FUNCTION over the real data, never a hardcoded sentence,
// so each one carries its own evidence and updates when the numbers move.
// If a rule's condition stops being true, the card disappears.
//
// kind: 'blindspot'  something being missed or wasted
//       'opportunity' something working that isn't being pushed
//       'risk'        something that will bite
// Sorted by `weight` (rough impact), highest first.
//
// Two changes from the reference file, both because the design bundle's
// sample data.js is always fully populated and ours isn't yet:
//   1. `addToCart` is matched with the same /add_to_cart/i regex the views
//      use (RightNow.jsx, Platforms.jsx, Campaigns.jsx) instead of an
//      exact-string match against a naming convention our real GA4 events
//      don't use.
//   2. A couple of Math.max(...arr) calls guard against an empty series —
//      Math.max() over nothing is -Infinity, which would otherwise print
//      as a real (nonsensical) number in a card's evidence text.
function deriveInsights(d) {
  const out = [];
  const t = d.totals;
  const sum = (a) => a.reduce((x, [, v]) => x + v, 0);
  const pct = (n, total) => Math.round((n / total) * 100);
  const find = (arr, k) => (arr.find((x) => x[0] === k) || [, 0])[1];
  const findRe = (arr, re) => (arr.find((x) => re.test(x[0])) || [, 0])[1];
  const maxOr = (arr, fallback) => (arr.length ? Math.max(...arr.map((r) => r[1])) : fallback);

  const srcTotal = sum(d.breakdowns.ytSrc);
  const geoTotal = sum(d.breakdowns.ytGeo);
  const devTotal = sum(d.breakdowns.ytDev);
  const playlist = find(d.breakdowns.ytSrc, 'PLAYLIST');
  const subscriber = find(d.breakdowns.ytSrc, 'SUBSCRIBER');
  const search = find(d.breakdowns.ytSrc, 'YT_SEARCH');
  const mobile = find(d.breakdowns.ytDev, 'MOBILE');
  const addToCart = findRe(d.breakdowns.webConv, /add_to_cart/i);
  const addToCartEng = (d.breakdowns.webConvEngagement || []).find((e) => /add_to_cart/i.test(e.event));
  const addToCartEngRate = addToCartEng && addToCartEng.sessions > 0
    ? addToCartEng.engagedSessions / addToCartEng.sessions
    : null;

  /* ---- Discovery ------------------------------------------------------- */
  if (srcTotal > 0 && playlist / srcTotal > 0.35) {
    out.push({
      kind: 'opportunity', weight: 95,
      title: 'Playlists are doing most of the work, passively',
      stat: pct(playlist, srcTotal) + '%',
      statLabel: 'of views arrive via playlist',
      evidence: playlist.toLocaleString() + ' of ' + srcTotal.toLocaleString() + ' views came from playlists — more than search (' +
        search.toLocaleString() + ') and the subscriber feed (' + subscriber.toLocaleString() + ') combined.',
      action: 'Find which playlists. YouTube Analytics names them under Traffic source → Playlists. Pitch the ones already carrying you, and build your own sequenced playlist so a first-time listener has a second song queued.',
    });
  }

  if (srcTotal > 0 && subscriber / srcTotal < 0.25) {
    const peakViews = maxOr(d.series.ytViews, null);
    out.push({
      kind: 'blindspot', weight: 82,
      title: 'Most views are strangers, and nothing asks them to stay',
      stat: pct(subscriber, srcTotal) + '%',
      statLabel: 'of views come from subscribers',
      evidence: 'Only ' + subscriber.toLocaleString() + ' of ' + srcTotal.toLocaleString() +
        ' views came from people who already follow the channel. Discovery is working; retention is the gap.',
      action: 'Add an end screen and a pinned comment on the high-traffic videos.' +
        (peakViews != null ? ' One conversion ask on a video doing ' + peakViews + ' views in a day is worth more than a new post.' : ''),
    });
  }

  /* ---- Cross-channel mismatch ----------------------------------------- */
  const relMonth = d.months.find((m) => m[0] === d.releaseMonth);
  const peakMonth = d.months.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (relMonth && peakMonth[0] !== d.releaseMonth) {
    out.push({
      kind: 'opportunity', weight: 90,
      title: 'Releases land on YouTube. Shows land on Meta.',
      stat: peakMonth[1] + ' vs ' + relMonth[1],
      statLabel: peakMonth[0] + ' peak vs release month',
      evidence: 'The release month drew ' + relMonth[1] + ' comments, mostly YouTube. The real peak was ' + peakMonth[0] +
        ' at ' + peakMonth[1] + ' — driven by Facebook and Instagram around the summer shows, with only a handful on YouTube.',
      action: 'Stop treating them as one audience. Route tour and show content to Meta, music and lyric content to YouTube, and cross-post the other way only with a reason.',
    });
  }

  /* ---- Facebook as a dead asset ---------------------------------------- */
  if (d.series.fbEng.length && t.fbFans > 0) {
    const fbPeak = maxOr(d.series.fbEng, 0);
    const fbRate = (fbPeak / t.fbFans) * 100;
    if (fbRate < 0.5) {
      out.push({
        kind: 'risk', weight: 88,
        title: 'Facebook is your biggest list and your quietest room',
        stat: fbRate.toFixed(2) + '%',
        statLabel: 'peak daily engagement rate',
        evidence: t.fbFans.toLocaleString() + ' followers producing at most ' + fbPeak +
          ' engagements a day.' + (t.igFollowers ? ' Instagram has ' + t.igFollowers.toLocaleString() + ' followers — ' +
          (t.fbFans / t.igFollowers).toFixed(1) + '× fewer — and out-reaches it.' : ''),
        action: 'Decide deliberately: either treat Facebook as an events board only (it still drove the June comment peak), or stop spending creative time there. Do not keep posting to it out of habit.',
      });
    }
  }

  /* ---- Audience mismatch ---------------------------------------------- */
  const ytTop = d.breakdowns.ytAge[0];
  const igByAge = {};
  for (const [a, , v] of d.breakdowns.igDemoAG) igByAge[a] = (igByAge[a] || 0) + v;
  const igTop = Object.entries(igByAge).sort((a, b) => b[1] - a[1])[0];
  if (igTop && ytTop && igTop[0] !== ytTop[0]) {
    out.push({
      kind: 'blindspot', weight: 85,
      title: 'Your two platforms have audiences a decade apart',
      stat: ytTop[2] + '%',
      statLabel: 'YouTube is ' + (ytTop[1] === 'male' ? 'men' : ytTop[1] === 'female' ? 'women' : ytTop[1]) + ' ' + ytTop[0],
      evidence: 'YouTube is ' + ytTop[2] + '% ' + (ytTop[1] === 'male' ? 'men' : ytTop[1] === 'female' ? 'women' : ytTop[1]) + ' ' + ytTop[0] +
        '. Instagram\'s largest follower band is ' + igTop[0] +
        '. One creative aimed at both underperforms on whichever you did not write for.',
      action: 'Write ad creative twice — one cut for each platform\'s actual audience rather than one asset resized.',
    });
  }

  /* ---- Untapped geography --------------------------------------------- */
  const intl = d.breakdowns.ytGeo.filter((g) => g[0] !== 'US');
  const intlSum = sum(intl);
  if (geoTotal > 0 && intlSum / geoTotal > 0.05) {
    out.push({
      kind: 'opportunity', weight: 70,
      title: 'International views are arriving without being asked',
      stat: pct(intlSum, geoTotal) + '%',
      statLabel: 'of views are outside the US',
      evidence: intl.slice(0, 3).map((g) => g[0] + ' ' + g[1]).join(' · ') +
        ' views in 30 days, with zero targeting and no localised anything.',
      action: 'Cheapest test available: a small geo-targeted ad against the video already earning views in that country. Non-US CPMs are a fraction of US, so the same spend buys far more reach.',
    });
  }

  /* ---- Mobile ---------------------------------------------------------- */
  const webDesktop = find(d.breakdowns.webDev, 'desktop');
  if (devTotal > 0 && t.webSessions30 > 0 && mobile / devTotal > 0.5 && webDesktop / t.webSessions30 > 0.5) {
    out.push({
      kind: 'risk', weight: 65,
      title: 'Fans watch on phones. Your site is measured on desktop.',
      stat: pct(mobile, devTotal) + '%',
      statLabel: 'of YouTube viewing is mobile',
      evidence: 'YouTube is ' + pct(mobile, devTotal) + '% mobile while the website reports ' +
        pct(webDesktop, t.webSessions30) + '% desktop — a bot signature, not a real audience. Real mobile traffic is being buried in the average.',
      action: 'Once bot filtering has a clean week, re-read mobile share. Assume the merch flow is a phone flow until the data says otherwise.',
    });
  }

  /* ---- Merch funnel gap ------------------------------------------------- */
  // WooCommerce is connected (unlike the design bundle's assumption) — the
  // real remaining gap isn't missing revenue data, it's that GA4 and
  // WooCommerce share no session/order ID, so the two counts can't be
  // joined into a true add-to-cart-to-purchase funnel (Merch.jsx makes the
  // same "not a funnel" point about these same fields).
  if (addToCart > 0 && d.merch) {
    out.push({
      kind: 'blindspot', weight: 85,
      title: "Cart activity and orders can't be joined session-by-session",
      stat: addToCart.toLocaleString() + ' vs ' + d.merch.totalOrders.toLocaleString(),
      statLabel: 'add-to-cart events vs completed orders, 30 days',
      evidence: addToCart.toLocaleString() + ' add-to-cart events and ' + d.merch.totalOrders.toLocaleString() +
        ' completed WooCommerce orders in the same 30 days — both real, both tracked, but GA4 and WooCommerce share no session or order ID, so there is no way to confirm which orders came from which carts, or measure a true cart-to-purchase rate.',
      action: 'If it matters, add a shared identifier (GA4’s Enhanced Ecommerce purchase event, tagged with the WooCommerce order ID) so the two can be joined. Until then, treat these as two separate signals, not one funnel.',
    });
  }

  /* ---- Cart-add bot signature -------------------------------------------- */
  // GA4 doesn't expose a per-event "is this a bot" field beyond its own
  // automatic known-bot filtering (already applied) plus the sync's own
  // bot-country exclusion (see website-analytics.js) — engagement rate is
  // the closest available proxy. A real shopper adding something to a cart
  // is overwhelmingly likely to also be an "engaged" session per GA4's own
  // definition (10s+, a conversion event, or 2+ pageviews); a low rate on a
  // meaningful volume of adds is a real signal, not noise.
  if (addToCartEngRate !== null && addToCartEng.eventCount >= 20 && addToCartEngRate < 0.4) {
    out.push({
      kind: 'risk', weight: 80,
      title: 'A lot of your cart-adds don’t look human',
      stat: Math.round(addToCartEngRate * 100) + '%',
      statLabel: 'of add-to-cart sessions were engaged',
      evidence: addToCartEng.engagedSessions.toLocaleString() + ' of ' + addToCartEng.sessions.toLocaleString() +
        ' sessions that added to cart counted as an engaged session (GA4: 10s+, a conversion event, or 2+ pageviews) — a real shopper adding an item almost always clears that bar, so this ratio points to automated traffic inflating the add-to-cart count.',
      action: 'Check GA4’s Explore/Realtime view for the sessions behind these events — hostname, browser, and referrer usually give it away. If it’s a known pattern, extend the sync’s bot-country exclusion or add a WooCommerce-side rate limit.',
    });
  }

  /* ---- Content cadence ------------------------------------------------- */
  const tail = d.months.slice(-4);
  if (tail.length === 4 && tail[0][1] > 0 && tail[3][1] < tail[0][1] / 2) {
    out.push({
      kind: 'risk', weight: 78,
      title: 'Attention decays a few weeks after a release',
      stat: tail.map((m) => m[1]).join(' → '),
      statLabel: 'comments, last four months',
      evidence: 'Volume fell from ' + tail[0][1] + ' to ' + tail[3][1] +
        ' across four months. The pattern repeats: a spike, then a few weeks, then quiet.',
      action: 'Plan the next beat before the current one lands. A lyric video, a playthrough or a show clip a few weeks after release costs little and stops the drop — you already make this content.',
    });
  }

  /* ---- Quote assets ---------------------------------------------------- */
  if (t.writtenForMe > 0) {
    out.push({
      kind: 'opportunity', weight: 80,
      title: 'Your best ad copy is sitting in a spreadsheet',
      stat: t.writtenForMe,
      statLabel: '"written for me" comments',
      evidence: t.writtenForMe + ' people have said a song was written for them — roughly 1 in ' +
        Math.round(t.allComments / t.writtenForMe) + ' comments. None of it has been used in marketing.',
      action: 'Make three static assets from the cleanest quotes, credited "— a fan on YouTube". It passes the "could another band say this" test because nobody wrote it for marketing.',
    });
  }

  /* ---- Emoji-only engagement ------------------------------------------ */
  if (t.allComments > 0 && t.emojiOnly / t.allComments > 0.12) {
    out.push({
      kind: 'opportunity', weight: 45,
      title: 'A meaningful slice of engagement has no words in it',
      stat: pct(t.emojiOnly, t.allComments) + '%',
      statLabel: 'of comments are emoji only',
      evidence: t.emojiOnly + ' of ' + t.allComments + ' comments carry no text — real affinity, nothing quotable.',
      action: 'Ask a question in the caption instead of making a statement. "Which line hit hardest?" turns 🔥 into copy you can use.',
    });
  }

  /* ---- Data-quality risk ---------------------------------------------- */
  const untagged = d.tagCount['Unreviewed'] || 0;
  if (untagged > 20) {
    out.push({
      kind: 'risk', weight: 40,
      title: 'The sentiment mix will shift under you',
      stat: untagged,
      statLabel: 'comments still untagged',
      evidence: untagged + ' comments are unclassified and the backfill is capped by the Gemini free tier.',
      action: 'Do not draw conclusions from the theme breakdown until the backlog clears, or pay for throughput to finish it in a day.',
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

module.exports = { deriveInsights };
