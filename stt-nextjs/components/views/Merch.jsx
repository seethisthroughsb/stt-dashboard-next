// Ported from reference/ui_kits/dashboard/Merch.jsx — but the reference
// assumes WooCommerce isn't connected yet, so it's mostly "Not connected"
// placeholders and a data contract for a future dev team. Ours already has
// a working WooCommerce sync (api/sync/merch.js, from the earlier Vercel
// migration), so this view shows real sales, top sellers and inventory
// instead of a spec. Pure presentational; all data from lib/data.js's
// loadMerchData(). Server Component.
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

export function Merch({ d }) {
  const t = d.totals;
  const s = d.salesSummary;

  // Same regex-match approach as the other views (RightNow/Platforms/
  // Campaigns/insights.js) — GA4's own eventName values don't match the
  // design bundle's assumed "conversion_event_" naming exactly.
  const addToCart = (d.breakdowns.webConv.find((c) => /add_to_cart/i.test(c[0])) || [, 0])[1];
  const viewItemList = (d.breakdowns.webConv.find((c) => /view_item_list/i.test(c[0])) || [, 0])[1];

  const cartToPurchase = addToCart > 0 ? Math.round((s.totalOrders / addToCart) * 100) : null;
  const combinedFollowers = t.fbFans + t.igFollowers;
  const revenuePerFan = combinedFollowers > 0 ? s.netSales / combinedFollowers : null;
  const salesPeak = d.salesSeries.sales.length ? Math.max(...d.salesSeries.sales.map((r) => r[1])) : 0;

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
          />
          <Metric label="Completed orders" value={s.totalOrders.toLocaleString()} note="WooCommerce, same 30-day window" />
        </Grid>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', maxWidth: '64ch', marginTop: 'var(--space-4)' }}>
          These four counts are not funnel stages — GA4 fires{' '}
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>view_item_list</code> and{' '}
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>add_to_cart</code> independently
          of each other and of a WooCommerce order, and one session can add several items. Read each
          against sessions, not against each other.
        </p>
      </Section>

      <Section label="Sales" note="WooCommerce · 30 days">
        <Grid>
          <Metric
            label="Revenue · 30d"
            value={fmtMoney(s.netSales)}
            flag="Currency symbol assumed — WooCommerce's store currency isn't synced separately"
          />
          <Metric label="Orders" value={s.totalOrders.toLocaleString()} />
          <Metric label="Average order value" value={fmtMoney(s.avgOrderValue)} />
          <Metric label="Units sold" value={s.totalItems.toLocaleString()} />
          <Metric
            label="Cart → purchase rate"
            value={cartToPurchase != null ? `${cartToPurchase}%` : '—'}
            note="Orders ÷ GA4 add-to-cart events — a rough proxy, not a true session-level funnel"
          />
          <Metric
            label="Revenue per fan"
            value={revenuePerFan != null ? fmtMoney(revenuePerFan) : '—'}
            note="Net sales ÷ combined Facebook + Instagram followers"
          />
        </Grid>
      </Section>

      {d.salesSeries.sales.length > 0 && (
        <Section label="Sales · daily" note="Last 30 days">
          {salesPeak >= 20 ? <TrendChart data={d.salesSeries.sales} height={190} /> : <Spark data={d.salesSeries.sales} height={40} />}
        </Section>
      )}

      <Section label="Product performance" note="WooCommerce · 30 days">
        <div className="stt-auto-grid">
          <div>
            <div style={LABEL_HEADING}>Units by product</div>
            {d.topSellers.length > 0 ? (
              <BarList data={d.topSellers} max={8} fill="var(--viz-theme)" />
            ) : (
              <div style={EMPTY_NOTE}>No units sold in this window.</div>
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
