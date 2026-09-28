// Ported from reference/ui_kits/dashboard/Audience.jsx — who's actually
// watching/following: age/gender skew on YouTube vs Instagram, geography,
// and reach-vs-engagement among commenters. Pure presentational, all data
// from lib/data.js's loadAudienceData(). Server Component (SplitBar/BarList
// are the only client pieces, imported from Charts.jsx).
import { Section, Grid, Metric } from '../Primitives';
import { BarList, SplitBar } from '../Charts';
import { Alert } from '../Alert';

const LABEL_HEADING = {
  font: 'var(--type-label-sm)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-3)',
};

const COUNTRY = {
  US: 'United States', BR: 'Brazil', UA: 'Ukraine', SA: 'Saudi Arabia', PL: 'Poland', TH: 'Thailand',
  GB: 'United Kingdom', DE: 'Germany', RS: 'Serbia', RU: 'Russia', PT: 'Portugal', BD: 'Bangladesh',
  NZ: 'New Zealand', MX: 'Mexico', IN: 'India', CA: 'Canada', FR: 'France', IT: 'Italy', ES: 'Spain',
};
const cname = (c) => COUNTRY[c] || c;

export function Audience({ d }) {
  const t = d.totals;
  const ytGeo = d.breakdowns.ytGeo;
  const ytTotal = ytGeo.reduce((a, [, v]) => a + v, 0);
  const ytAge = d.breakdowns.ytAge.map(([a, g, v]) => [`${a} ${g}`, v]);
  const topYtAge = d.breakdowns.ytAge[0];

  /* Instagram skews a decade older than YouTube — the single most actionable
     finding on this screen, so it gets a side-by-side rather than two charts. */
  const igByAge = {};
  for (const [a, , v] of d.breakdowns.igDemoAG) igByAge[a] = (igByAge[a] || 0) + v;
  const igAge = Object.entries(igByAge).sort((a, b) => b[1] - a[1]);
  const igTotal = igAge.reduce((a, [, v]) => a + v, 0);

  const commentsPerAuthor = t.uniqueAuthors ? (t.allComments / t.uniqueAuthors).toFixed(1) : '—';
  const emojiOnlyPct = t.allComments ? Math.round((t.emojiOnly / t.allComments) * 100) : 0;

  return (
    <>
      <Section label="Who is watching" note="YouTube · viewer percentage · 30d">
        {ytAge.length > 0 ? (
          <div className="stt-auto-grid" style={{ alignItems: 'start' }}>
            <div>
              <SplitBar parts={ytAge} />
            </div>
            <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-5)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-4xl)', lineHeight: 1, color: 'var(--stt-gold)' }}>
                {topYtAge[2]}%
              </div>
              <div style={{ font: 'var(--type-h4)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-heading)', marginTop: 'var(--space-3)' }}>
                {topYtAge[0]} {topYtAge[1] === 'male' ? 'men' : topYtAge[1] === 'female' ? 'women' : topYtAge[1]}
              </div>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', margin: 'var(--space-3) 0 0' }}>
                The largest single segment of YouTube watch time. Not a demographic spread — one audience.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
            No age/gender data synced yet.
          </div>
        )}
      </Section>

      <Section label="Instagram followers" note="Age, both genders combined">
        {igAge.length > 0 && igTotal > 0 ? (
          <div className="stt-auto-grid" style={{ alignItems: 'start' }}>
            <SplitBar parts={igAge.map(([k, v]) => [k, Math.round((v / igTotal) * 100)])} />
            <Alert tone="success" title="Two different audiences">
              {ytAge.length > 0
                ? `YouTube is ${topYtAge[2]}% ${topYtAge[1] === 'male' ? 'men' : topYtAge[1] === 'female' ? 'women' : topYtAge[1]} ${topYtAge[0]}. `
                : ''}
              Instagram&rsquo;s largest band is {igAge[0][0]}. Targeting one set of creative at both
              will underperform on whichever you didn&rsquo;t write for.
            </Alert>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
            No Instagram follower demographics synced yet.
          </div>
        )}
      </Section>

      <Section label="Geography">
        <div className="stt-auto-grid">
          <div>
            <div style={LABEL_HEADING}>YouTube views by country</div>
            <BarList data={ytGeo.map(([c, v]) => [cname(c), v])} max={6} />
            {ytGeo.length >= 3 && ytTotal > 0 && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-4)' }}>
                {Math.round((ytGeo[0][1] / ytTotal) * 100)}% {cname(ytGeo[0][0])}, but {cname(ytGeo[1][0])} and{' '}
                {cname(ytGeo[2][0])} together are{' '}
                {Math.round(((ytGeo[1][1] + ytGeo[2][1]) / ytTotal) * 100)}% — the audience is not
                single-country.
              </p>
            )}
          </div>
          <div>
            <div style={LABEL_HEADING}>Instagram followers by country</div>
            <BarList data={d.breakdowns.igDemoC.map(([c, v]) => [cname(c), v])} max={6} fill="var(--viz-theme)" />
          </div>
        </div>
      </Section>

      <Section label="Reach vs engagement">
        <Grid>
          <Metric label="Unique commenters" value={t.uniqueAuthors} note={`Across ${t.allComments} comments`} />
          <Metric label="Comments per author" value={commentsPerAuthor} note="Higher means a loyal core, not just reach" />
          <Metric label="Emoji-only share" value={`${emojiOnlyPct}%`} note="Engaged, but no text to quote" />
          <Metric label="Written for me" value={t.writtenForMe} note="The quotes campaigns are built from" />
        </Grid>
      </Section>
    </>
  );
}
