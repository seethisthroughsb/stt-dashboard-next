// Ported from reference/ui_kits/dashboard/Campaigns.jsx — "where, when and
// how to spend." Five answers, each with its evidence, then the approved
// quote pool and what this view still can't answer. Pure presentational;
// all data from lib/data.js's loadCampaignsData(). Server Component.
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Alert } from '../Alert';
import { Section, Grid, Metric } from '../Primitives';
import { BarList } from '../Charts';
import { QuoteCard } from '../QuoteCard';

function Answer({ n, question, answer, evidence, children }) {
  return (
    <div style={{ border: '1px solid var(--border-hairline)', background: 'var(--surface-card)', padding: 'var(--space-5)', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-xs)', color: 'var(--stt-rust)', flex: 'none' }}>0{n}</span>
        <span style={{ font: 'var(--type-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{question}</span>
      </div>
      <div style={{ font: 'var(--type-h3)', letterSpacing: 'var(--tracking-display)', textTransform: 'uppercase', color: 'var(--text-heading)', margin: 'var(--space-3) 0 0' }}>
        {answer}
      </div>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', margin: 'var(--space-3) 0 0' }}>{evidence}</p>
      {children && <div style={{ marginTop: 'var(--space-4)' }}>{children}</div>}
    </div>
  );
}

function fmtHour(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period} UTC`;
}

const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

export function Campaigns({ d }) {
  const t = d.totals;
  const ytGeo = d.breakdowns.ytGeo;
  const ytSrc = d.breakdowns.ytSrc;
  const ytAge = d.breakdowns.ytAge;
  const ytTotal = ytGeo.reduce((a, [, v]) => a + v, 0);
  const srcTotal = ytSrc.reduce((a, [, v]) => a + v, 0);
  const mobile = (d.breakdowns.ytDev.find((x) => x[0] === 'MOBILE') || [, 0])[1];
  const devTotal = d.breakdowns.ytDev.reduce((a, [, v]) => a + v, 0);

  const topAge = ytAge[0];
  const igByAge = {};
  for (const [a, , v] of d.breakdowns.igDemoAG) igByAge[a] = (igByAge[a] || 0) + v;
  const igTop = Object.entries(igByAge).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)', maxWidth: '64ch', margin: 0 }}>
        Five answers, each with its evidence. Nothing here buys ads — it decides where the money goes.
      </p>

      <Grid gap="var(--space-4)">
        <Answer
          n={1}
          question="Which platform"
          answer="YouTube"
          evidence={
            `${t.ytViews30.toLocaleString()} views and ${Math.round(t.ytMinutes30 / 60)} hours watched in 30 days. ` +
            `Facebook has ${t.fbFans.toLocaleString()} followers and no chart there earns an axis at this scale — a big list, not an audience.`
          }
        />

        <Answer
          n={2}
          question="Which audience"
          answer={topAge ? `${topAge[2]}% ${topAge[1] === 'male' ? 'men' : topAge[1] === 'female' ? 'women' : topAge[1]} ${topAge[0]}` : '—'}
          evidence={
            topAge && igTop
              ? `On YouTube. Instagram's followers skew largest at ${igTop[0]}, so the two platforms want different creative rather than one asset resized.`
              : 'Age/gender breakdown not synced yet.'
          }
        >
          {ytAge.length > 0 && (
            <BarList data={ytAge.map(([a, g, v]) => [`${a} ${g}`, v])} max={5} fill="var(--viz-theme)" unit="%" />
          )}
        </Answer>

        <Answer
          n={3}
          question="Which geography"
          answer={ytGeo.length > 0 && ytTotal > 0 ? `${Math.round((ytGeo[0][1] / ytTotal) * 100)}% ${ytGeo[0][0]}` : '—'}
          evidence={
            ytGeo.length >= 3 && ytTotal > 0
              ? `${ytGeo[1][0]} and ${ytGeo[2][0]} are the next two, at ${ytGeo[1][1]} and ${ytGeo[2][1]} views — small but real.`
              : 'Not enough geography data synced yet to compare countries.'
          }
        >
          {ytGeo.length > 0 && <BarList data={ytGeo.map(([c, v]) => [c, v])} max={6} />}
        </Answer>

        <Answer
          n={4}
          question="Which placement"
          answer={
            ytSrc.length > 0 && devTotal > 0
              ? `${ytSrc[0][0].replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}, then ${mobile / devTotal > 0.5 ? 'mobile' : 'desktop'}`
              : '—'
          }
          evidence={
            srcTotal > 0 && devTotal > 0
              ? `${Math.round((ytSrc[0][1] / srcTotal) * 100)}% of views arrive through ${ytSrc[0][0].replace(/_/g, ' ').toLowerCase()} — the single biggest source, ahead of everything else individually. ${Math.round((mobile / devTotal) * 100)}% of viewing is on a phone.`
              : 'Not enough traffic-source data synced yet.'
          }
        >
          {ytSrc.length > 0 && (
            <BarList data={ytSrc.slice(0, 5).map(([k, v]) => [k.replace(/_/g, ' ').toLowerCase(), v])} max={5} fill="var(--viz-theme)" />
          )}
        </Answer>

        <Answer
          n={5}
          question="Which message"
          answer="Their words, not ours"
          evidence={
            t.writtenForMe > 0
              ? `${t.writtenForMe} fans have said a song was written for them. That is the campaign copy — it passes the "could another band say this" test because no one wrote it for marketing.`
              : 'No "Written for Me" comments tagged yet.'
          }
        />
      </Grid>

      <Section
        label="Approved quote pool"
        note={`${t.writtenForMe} candidates`}
        action={
          <Button variant="secondary" size="sm" disabled title="Export — coming in a later step">
            <Icon name="download" size={14} /> Export pool
          </Button>
        }
      >
        {d.writtenForMe.length > 0 ? (
          <Grid gap="var(--space-3)">
            {d.writtenForMe.slice(0, 4).map((c, i) => <QuoteCard key={i} c={c} hero />)}
          </Grid>
        ) : (
          <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
            No &ldquo;Written for Me&rdquo; comments tagged yet.
          </div>
        )}
      </Section>

      <Alert tone="danger" title="Review before publishing">
        These quotes are pulled directly from public comments, unedited. Screen each one before it
        ships — profanity, a misattribution, or a quoted lyric rather than a genuine reaction can slip
        through the same as any other comment. Use the manual tag override to clear a quote once reviewed.
      </Alert>

      <Section label="What this view cannot answer yet">
        <Grid>
          <Metric
            label="Best day / time to post"
            value={d.bestPostTime ? `${DAY_NAMES[d.bestPostTime.day] || d.bestPostTime.day} · ${fmtHour(d.bestPostTime.hour)}` : '—'}
            flag={d.bestPostTime ? 'Hour is UTC — neither API reports the commenter\'s own time zone' : 'Blocked'}
            note={d.bestPostTime ? `${d.bestPostTime.count} comments in that window, all time` : 'No comment timestamps synced yet.'}
          />
          <Metric label="Brand mentions" value="0" note="No automated feed yet. Out of scope for v1." />
          <Metric
            label="Untagged comments"
            value={d.untaggedCount}
            flag="Gemini's free tier caps the backfill rate"
            note="Sentiment mix shifts as these fill in."
          />
        </Grid>
      </Section>
    </>
  );
}
