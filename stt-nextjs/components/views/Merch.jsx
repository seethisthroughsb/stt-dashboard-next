// Ported from reference/ui_kits/dashboard/Merch.jsx — but the reference
// assumes WooCommerce isn't connected yet, so it's mostly "Not connected"
// placeholders and a data contract for a future dev team. Ours already has
// a working WooCommerce sync (api/sync/merch.js, from the earlier Vercel
// migration), so this view shows real sales, top sellers and inventory
// instead of a spec. All data from lib/data.js's loadMerchData().
//
// Client Component as of 29 Sep 2026 (previously a Server Component) — the
// Sales section now has a date-range picker (Nick's request, after asking
// how far back WooCommerce purchase history goes: merch.js was hardcoded to
// only ever pull a rolling 30 days, so it now pulls the store's full order
// history instead, from its actual earliest order forward). `d.salesSeries`
// is that full all-time daily history, shipped once from the server and
// filtered/summed client-side per the selected preset — same "ship once,
// derive client-side" pattern Fan Voice already uses for its own scope
// toggle, rather than a server round-trip on every range change.
'use client';
import React from 'react';
import { Alert } from '../Alert';
import { Section, Grid, Metric } from '../Primitives';
import { BarList, Spark, TrendChart } from '../Charts';
import { Badge } from '../Badge';

const LABEL_HEADING = {
  font: 'var(--type-label-sm)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-3)',
};

const EMPTY_NOTE = { border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' };

function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Presets over free-form dates (Nick's choice, 29 Sep 2026) — covers the
// ranges actually worth reaching for without the extra UI/edge-case surface
// of a real calendar picker (an empty range, a range before the store
// existed, etc).
const RANGE_PRESETS = [
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
  ['ytd', 'Year to date'],
  ['all', 'All time'],
];
const RANGE_LABEL = Object.fromEntries(RANGE_PRESETS);

function sinceDayFor(key) {
  const now = new Date();
  if (key === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  if (key === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  if (key === 'ytd') return `${now.getFullYear()}-01-01`;
  return null; // 'all'
}

// Mirrors lib/data.js's summarizeSalesSeries()/getMerchSalesSeries() — kept
// as its own small copy here rather than a shared import, since lib/data.js
// pulls in the `pg` package (server-only) and this file now runs in the
// browser.
function summarizeSeries(series, sinceDay) {
  const inRange = (day) => !sinceDay || day >= sinceDay;
  const sum = (arr) => arr.filter(([day]) => inRange(day)).reduce((t, [, v]) => t + v, 0);
  const totalSales = sum(series.sales);
  const totalOrders = sum(series.orders);
  const totalItems = sum(series.items || []);
  return { totalSales, totalOrders, totalItems, avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0 };
}

function filterSeries(series, sinceDay) {
  const inRange = (day) => !sinceDay || day >= sinceDay;
  return {
    sales: series.sales.filter(([day]) => inRange(day)),
    orders: series.orders.filter(([day]) => inRange(day)),
  };
}

export function Merch({ d }) {
  const [range, setRange] = React.useState('30d');
  const t = d.totals;
  // Fixed 30-day figure — the funnel section and cart-to-purchase ratio
  // compare against GA4's own fixed 30-day add-to-cart count, so this one
  // stays put regardless of what the range picker below is set to.
  const s30 = d.salesSummary30d;

  const sinceDay = sinceDayFor(range);
  const s = React.useMemo(() => summarizeSeries(d.salesSeries, sinceDay), [d.salesSeries, sinceDay]);
  const filteredSeries = React.useMemo(() => filterSeries(d.salesSeries, sinceDay), [d.salesSeries, sinceDay]);
  const hasSalesInRange = s.totalOrders > 0 || s.totalSales > 0;

  // Same regex-match approach as the other views (RightNow/Platforms/
  // Campaigns/insights.js) — GA4's own eventName values don't match the
  // design bundle's assumed "conversion_event_" naming exactly.
  const addToCart = (d.breakdowns.webConv.find((c) => /add_to_cart/i.test(c[0])) || [, 0])[1];
  const viewItemList = (d.breakdowns.webConv.find((c) => /view_item_list/i.test(c[0])) || [, 0])[1];

  // Same bot-likelihood check as lib/insights.js's cart-add rule, surfaced
  // right where the raw count lives — engagement rate (GA4's own "engaged
  // session" definition: 10s+, a conversion event, or 2+ pageviews) is the
  // closest proxy GA4 exposes to "was this a real visitor," short of a
  // dedicated bot flag.
  const addToCartEng = (d.breakdowns.webConvEngagement || []).find((e) => /add_to_cart/i.test(e.event));
  const addToCartEngRate = addToCartEng && addToCartEng.sessions > 0 ? addToCartEng.engagedSessions / addToCartEng.sessions : null;
  const cartBotFlag = addToCartEngRate !== null && addToCartEng.eventCount >= 20 && addToCartEngRate < 0.4
    ? `Only ${Math.round(addToCartEngRate * 100)}% of these sessions were "engaged" — a rate this low usually means automated traffic, not real shoppers.`
    : null;

  const cartToPurchase = addToCart > 0 ? Math.round((s30.totalOrders / addToCart) * 100) : null;
  const combinedFollowers = t.fbFans + t.igFollowers;
  const revenuePerFan = combinedFollowers > 0 ? s.totalSales / combinedFollowers : null;
  const salesPeak = filteredSeries.sales.length ? Math.max(...filteredSeries.sales.map((r) => r[1])) : 0;

  return (
    <>
      {!d.hasSales && (
        <Alert tone="info" title="No completed orders in the last 30 days">
          WooCommerce is connected and reporting — sessions, cart activity and inventory below are all
          real. This window just hasn&rsquo;t had a sale in it yet.
        </Alert>
      )}

      <Section label="The funnel we can see" note="GA4 + WooCommerce · 30 days · not a funnel">
        <Grid>
          <Metric label="Sessions" value={t.webSessions30.toLocaleString()} />
          <Metric
            label="Viewed merch"
            value={viewItemList.toLocaleString()}
            note={t.webSessions30 ? `${Math.round((viewItemList / t.webSessions30) * 100)}% of sessions` : null}
          />
          <Metric
            label="Added to cart"
            value={addToCart.toLocaleString()}
            note={`across ${t.webSessions30.toLocaleString()} sessions`}
            flag={cartBotFlag}
          />
          <Metric label="Completed orders" value={s30.totalOrders.toLocaleString()} note="WooCommerce, same 30-day window" />
        </Grid>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', maxWidth: '64ch', marginTop: 'var(--space-4)' }}>
          These four counts are not funnel stages — GA4 fires{' '}
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>view_item_list</code> and{' '}
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>add_to_cart</code> independently
          of each other and of a WooCommerce order, and one session can add several items. Read each
          against sessions, not against each other.
        </p>
      </Section>

      <Section label="Sales" note={`WooCommerce · ${RANGE_LABEL[range]}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {RANGE_PRESETS.map(([k, l]) => (
            <button
              key={k} type="button" onClick={() => setRange(k)}
              style={{
                minHeight: 'var(--touch-min)', padding: '0 var(--space-4)',
                background: range === k ? 'var(--surface-active)' : 'transparent',
                border: '1px solid ' + (range === k ? 'var(--border-focus)' : 'var(--border-hairline)'),
                color: range === k ? 'var(--text-heading)' : 'var(--text-muted)',
                font: 'var(--type-button)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
                cursor: 'pointer', marginRight: -1,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {hasSalesInRange ? (
          <Grid>
            <Metric
              label="Revenue"
              value={fmtMoney(s.totalSales)}
              flag="Gross sales, before refunds — WooCommerce doesn't break net sales out by day, only currency symbol assumed too"
            />
            <Metric label="Orders" value={s.totalOrders.toLocaleString()} />
            <Metric label="Average order value" value={fmtMoney(s.avgOrderValue)} />
            <Metric label="Units sold" value={s.totalItems.toLocaleString()} />
            <Metric
              label="Cart → purchase rate"
              value={range === '30d' && cartToPurchase != null ? `${cartToPurchase}%` : '—'}
              note={range === '30d'
                ? 'Orders ÷ GA4 add-to-cart events — a rough proxy, not a true session-level funnel'
                : "Only shown on Last 30 days — GA4's add-to-cart count is always a fixed 30-day figure"}
            />
            <Metric
              label="Revenue per fan"
              value={revenuePerFan != null ? fmtMoney(revenuePerFan) : '—'}
              note={`Revenue (${RANGE_LABEL[range].toLowerCase()}) ÷ combined Facebook + Instagram followers`}
            />
          </Grid>
        ) : (
          <div style={EMPTY_NOTE}>No completed orders in this window.</div>
        )}
      </Section>

      {filteredSeries.sales.length > 0 && (
        <Section label="Sales · daily" note={RANGE_LABEL[range]}>
          {salesPeak >= 20 ? <TrendChart data={filteredSeries.sales} height={190} /> : <Spark data={filteredSeries.sales} height={40} />}
        </Section>
      )}

      <Section label="Product performance" note="WooCommerce · units by product are all-time; inventory is current">
        <div className="stt-auto-grid">
          <div>
            <div style={LABEL_HEADING}>Units by product · all time</div>
            {d.topSellers.length > 0 ? (
              <BarList data={d.topSellers} max={8} fill="var(--viz-theme)" />
            ) : (
              <div style={EMPTY_NOTE}>No units sold yet.</div>
            )}
          </div>
          <div>
            <div style={LABEL_HEADING}>Low stock</div>
            {d.lowStock.length > 0 ? (
              <div style={{ display: 'grid', gap: 6 }}>
                {d.lowStock.slice(0, 8).map((p) => (
                  <div
                    key={p.product}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
                      padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-hairline)',
                    }}
                  >
                    <span
                      title={p.product}
                      style={{ font: 'var(--type-body-sm)', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                    >
                      {p.product}
                    </span>
                    <Badge tone={p.stockQuantity <= 2 ? 'rust' : 'gold'}>{p.stockQuantity} left</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={EMPTY_NOTE}>Nothing under 5 units in stock right now.</div>
            )}
          </div>
        </div>
      </Section>

      <Section label="The question worth wiring for">
        <div style={{ border: '1px solid var(--border-hairline)', borderLeft: '3px solid var(--stt-rust)', background: 'var(--surface-card)', padding: 'var(--space-5)' }}>
          <h3 style={{ font: 'var(--type-h4)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-heading)', margin: 0 }}>
            Does a show sell merch?
          </h3>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', margin: 'var(--space-3) 0 0', maxWidth: '64ch' }}>
            Every order already carries a date and a billing country. What&rsquo;s still missing is a
            show calendar to join it against — that one join would answer whether playing a city moves
            merch there, and for how long afterwards.
          </p>
        </div>
      </Section>
    </>
  );
}
