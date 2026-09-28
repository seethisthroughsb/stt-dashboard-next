// Ported from reference/ui_kits/dashboard/RightNow.jsx — the opening view,
// "how are we doing" at a glance. Pure presentational; all data is computed
// server-side by lib/data.js's loadRightNowData() and passed in as `d`.
// No client state needed here, so this stays a Server Component (the chart
// components it renders are the only client-side pieces, for their
// ResizeObserver-driven width measurement).
import { Section, Grid, Metric, SplitRow } from '../Primitives';
import { TrendChart, Spark, BarList, MonthBars } from '../Charts';
import { QuoteCard } from '../QuoteCard';
import { Alert } from '../Alert';

function sum(pairs) {
  return pairs.reduce((a, [, v]) => a + v, 0);
}

export function RightNow({ d }) {
  const t = d.totals;
  const views = d.series.ytViews;
  const half = Math.floor(views.length / 2);
  const recent = views.slice(half).reduce((a, [, v]) => a + v, 0);
  const prior = views.slice(0, half).reduce((a, [, v]) => a + v, 0);
  const delta = views.length > 1 ? recent - prior : null;

  const days = d.lastCommentDate
    ? Math.round((Date.now() - new Date(d.lastCommentDate)) / 86400000)
    : null;

  const addToCart = d.breakdowns.webConv.find((c) => /add_to_cart/i.test(c[0]));
  const igReachPeak = d.series.igReach.length ? Math.max(...d.series.igReach.map((r) => r[1])) : null;

  const ytSrcTotal = sum(d.breakdowns.ytSrc);
  const playlistShare = d.breakdowns.ytSrc.length && ytSrcTotal > 0
    ? Math.round((d.breakdowns.ytSrc[0][1] / ytSrcTotal) * 100)
    : null;

  return (
    <>
      <Section label="Last 30 days" note={'Pull ' + d.pull}>
        <Grid>
          <Metric
            label="YouTube views"
            value={t.ytViews30.toLocaleString()}
            delta={delta}
            spark={views.length ? <Spark data={views} /> : null}
          />
          <Metric
            label="Watch time"
            value={Math.round(t.ytMinutes30 / 60).toLocaleString()}
            unit="hrs"
            note={t.ytViews30 ? `${Math.round((t.ytMinutes30 / t.ytViews30) * 60)}s average view` : null}
          />
          <Metric
            label="Subscribers"
            value={(t.ytSubsGained - t.ytSubsLost >= 0 ? '+' : '') + (t.ytSubsGained - t.ytSubsLost)}
            note={`${t.ytSubsGained} gained · ${t.ytSubsLost} lost`}
          />
          <Metric
            label="Site sessions"
            value={t.webSessions30.toLocaleString()}
            flag="Bot-like countries are filtered from Geography at the source."
            note={addToCart ? `${addToCart[1]} add-to-cart events` : null}
          />
        </Grid>
      </Section>

      {views.length > 0 && (
        <Section label="YouTube views · daily">
          <TrendChart data={views} height={190} />
        </Section>
      )}

      <Section label="Audience size" note="Followers by platform">
        <Grid>
          <Metric label="Facebook followers" value={t.fbFans.toLocaleString()} note="A big list, and a quiet one — see Platforms for the engagement rate." />
          <Metric
            label="Instagram followers"
            value={t.igFollowers.toLocaleString()}
            spark={d.series.igFoll.length ? <Spark data={d.series.igFoll} /> : null}
            note={igReachPeak != null ? `Reach peaks at ${igReachPeak}/day` : null}
          />
          <Metric
            label="Comments tracked"
            value={t.allComments.toLocaleString()}
            note={`${t.uniqueAuthors} unique authors · ${t.ytComments} YT / ${t.metaComments} Meta`}
          />
        </Grid>
      </Section>

      <Section
        label="Fan voice"
        note={days == null ? 'No comments yet' : `${days} days since last comment`}
        action={
          <span
            title="Fan Voice — coming in a later step"
            style={{
              font: 'var(--type-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
              color: 'var(--text-disabled)', flex: 'none',
            }}
          >
            All comments →
          </span>
        }
      >
        <SplitRow>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {d.writtenForMe.length > 0 ? (
              d.writtenForMe.slice(0, 2).map((c, i) => <QuoteCard key={i} c={c} hero />)
            ) : (
              <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
                No &ldquo;Written for Me&rdquo; comments tagged yet.
              </div>
            )}
          </div>
          <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)' }}>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Comment volume · 36 months
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <MonthBars months={d.months} highlightMonth={d.releaseMonth} highlightLabel={d.releaseLabel} />
            </div>
          </div>
        </SplitRow>
      </Section>

      <Section label="Where the views come from">
        <div className="stt-auto-grid">
          <div>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Discovery source
            </div>
            <BarList data={d.breakdowns.ytSrc} max={5} fill="var(--viz-theme)" />
          </div>
          <div>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Country
            </div>
            <BarList data={d.breakdowns.ytGeo} max={5} />
          </div>
          <div>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Device
            </div>
            <BarList data={d.breakdowns.ytDev} max={4} />
          </div>
        </div>
      </Section>

      {playlistShare != null && (
        <Alert tone="info" title="Playlists are doing the work">
          {playlistShare}% of views arrive from playlists — more than search, suggested video and the subscriber feed combined.
        </Alert>
      )}
    </>
  );
}
