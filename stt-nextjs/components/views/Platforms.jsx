// Ported from reference/ui_kits/dashboard/Platforms.jsx — per-platform
// analytics: YouTube (the platform with real volume), Meta (a big list and
// a quiet room), Website (kept, de-emphasised, flagged). Pure
// presentational like Right Now; all data comes from lib/data.js's
// loadPlatformsData(). No client state needed, so this stays a Server
// Component (the chart components it renders are the only client pieces).
import { Section, Grid, Metric } from '../Primitives';
import { TrendChart, Spark, BarList } from '../Charts';
import { Alert } from '../Alert';

const LABEL_HEADING = {
  font: 'var(--type-label-sm)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-3)',
};

const label = (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export function Platforms({ d }) {
  const t = d.totals;
  const fbPeak = d.series.fbEng.length ? Math.max(...d.series.fbEng.map((r) => r[1])) : null;
  const igPeak = d.series.igReach.length ? Math.max(...d.series.igReach.map((r) => r[1])) : null;

  // Same regex-match approach RightNow.jsx uses — the design bundle's own
  // exact-string match assumed a raw-Sheet naming convention that doesn't
  // match our real GA4 eventName values.
  const addToCart = d.breakdowns.webConv.find((c) => /add_to_cart/i.test(c[0]));
  const desktop = d.breakdowns.webDev.find((x) => x[0] === 'desktop');
  const desktopShare = desktop && t.webSessions30
    ? Math.round((desktop[1] / t.webSessions30) * 100)
    : null;

  return (
    <>
      {/* YouTube earns the full treatment — it is the only platform with real volume. */}
      <Section label="YouTube" note="The platform that performs">
        <Grid>
          <Metric
            label="Views · 30d"
            value={t.ytViews30.toLocaleString()}
            spark={d.series.ytViews.length ? <Spark data={d.series.ytViews} /> : null}
          />
          <Metric
            label="Watch time"
            value={Math.round(t.ytMinutes30 / 60).toLocaleString()}
            unit="hrs"
            spark={d.series.ytMins.length ? <Spark data={d.series.ytMins} /> : null}
          />
          <Metric
            label="Net subscribers"
            value={(t.ytSubsGained - t.ytSubsLost >= 0 ? '+' : '') + (t.ytSubsGained - t.ytSubsLost)}
            note={`${t.ytSubsGained} gained · ${t.ytSubsLost} lost`}
          />
          <Metric label="Comments" value={t.ytComments} note="All time" />
        </Grid>
        {d.series.ytViews.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <TrendChart data={d.series.ytViews} height={200} />
          </div>
        )}
      </Section>

      <Section label="Discovery" note="Where the 30-day views came from">
        <div className="stt-auto-grid">
          <div>
            <div style={LABEL_HEADING}>Source</div>
            <BarList data={d.breakdowns.ytSrc.map(([k, v]) => [label(k), v])} max={6} fill="var(--viz-theme)" />
          </div>
          <div>
            <div style={LABEL_HEADING}>Device</div>
            <BarList data={d.breakdowns.ytDev.map(([k, v]) => [label(k), v])} max={4} />
          </div>
        </div>
      </Section>

      {/* Meta: a big list and a quiet room. The scale rule forbids matching cards. */}
      <Section label="Meta" note="Facebook + Instagram">
        <Grid>
          <Metric
            label="Facebook followers"
            value={t.fbFans.toLocaleString()}
            note={fbPeak != null ? `Peaks at ${fbPeak} engagements/day — no chart earns an axis at this scale` : 'No engagement data yet'}
          />
          <Metric
            label="Instagram followers"
            value={t.igFollowers.toLocaleString()}
            spark={d.series.igFoll.length ? <Spark data={d.series.igFoll} /> : null}
          />
          <Metric
            label="Instagram reach"
            value={igPeak != null ? igPeak.toLocaleString() : '—'}
            unit={igPeak != null ? 'peak/day' : undefined}
            spark={d.series.igReach.length ? <Spark data={d.series.igReach} /> : null}
          />
          <Metric
            label="Meta comments"
            value={t.metaComments}
            flag="Author names unavailable — Meta API privacy limitation"
            note="All time"
          />
        </Grid>
      </Section>

      {/* Website: kept, de-emphasised, flagged. The add-to-cart number is real. */}
      <Section label="Website" note="GA4 · treat with care">
        <Grid>
          <Metric
            label="Sessions · 30d"
            value={t.webSessions30.toLocaleString()}
            spark={d.series.webSess.length ? <Spark data={d.series.webSess} /> : null}
          />
          <Metric
            label="Add to cart"
            value={addToCart ? addToCart[1] : 0}
            note="Merch intent — the most useful number here"
          />
          <Metric
            label="Desktop share"
            value={desktopShare != null ? `${desktopShare}%` : '—'}
            flag="Inverted vs YouTube, where mobile leads — a bot signature"
            note="Real fans are on phones"
          />
        </Grid>
        <div className="stt-auto-grid" style={{ marginTop: 'var(--space-5)' }}>
          <div>
            <div style={LABEL_HEADING}>Events</div>
            <BarList data={d.breakdowns.webConv.map(([k, v]) => [label(k.replace('conversion_event_', '')), v])} max={6} />
          </div>
          <div>
            <div style={LABEL_HEADING}>Channel</div>
            <BarList data={d.breakdowns.webSrc} max={5} />
          </div>
        </div>
      </Section>

      <Alert tone="info" title="Three platforms, three different scales">
        YouTube moves in hundreds a day, Instagram in tens, Facebook in single digits. They are never
        put on a shared axis — a normalised chart would invent a relationship the data doesn&rsquo;t have.
      </Alert>
    </>
  );
}
