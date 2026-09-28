'use client';
import React from 'react';
import { Tag } from '../Tag';
import { Checkbox } from '../Checkbox';
import { Select } from '../Select';
import { Button } from '../Button';
import { Section, Grid, Metric, SplitRow } from '../Primitives';
import { BarList, MonthBars } from '../Charts';
import { QuoteCard } from '../QuoteCard';

// Ported from reference/ui_kits/dashboard/FanVoice.jsx — browse/filter all
// comments. Needs client state (scope/filter/platform/hide-emoji), so unlike
// Right Now this is a Client Component; the server (app/voice/page.js) does
// one query for the whole comment set and passes it in as `d`, per the
// design bundle's "ship once, filter client-side" guidance.
//
// One simplification from the original: the design's `window.STT` shipped
// three overlapping arrays (writtenForMe/themed/recent) because that's how
// the old Sheet tabs were laid out, and "all time" scope concatenated +
// de-duped them. Our loader (lib/data.js) already queries one canonical
// comment list, so there's nothing to de-dupe — scope just changes which
// date window of that one list is in play.
const THEMES = ['Isolation/Loneliness', 'Internal Conflict/Struggle', 'Catharsis/Release', 'Hope/Redemption', 'Life-Moment Tie-in'];

export function FanVoice({ d }) {
  const [scope, setScope] = React.useState('recent'); // recent | all
  const [filter, setFilter] = React.useState('all');
  const [hideEmoji, setHideEmoji] = React.useState(true);
  const [platform, setPlatform] = React.useState('all');

  // Days-ago, not just "within 30 days" — a plain `<= 30` also passes a
  // *future*-dated comment (diff goes negative), which silently defeats the
  // 30-day scope. Guard against clock skew between wherever a sync job ran
  // and wherever this page renders, not just against the ordinary case.
  const pool = scope === 'recent'
    ? d.comments.filter((c) => {
        const daysAgo = (Date.now() - new Date(c.date)) / 86400000;
        return daysAgo >= 0 && daysAgo <= 30;
      })
    : d.comments;

  let list = pool;
  if (hideEmoji) list = list.filter((c) => !c.emojiOnly);
  if (platform !== 'all') list = list.filter((c) => c.p === platform);
  if (filter === 'wfm') list = list.filter((c) => c.tags.includes('Written for Me'));
  else if (filter === 'themes') list = list.filter((c) => c.tags.some((t) => THEMES.includes(t)));
  else if (filter === 'critical') list = list.filter((c) => c.tags.includes('Criticism/Negative'));

  const days = d.lastCommentDate ? Math.max(0, Math.round((Date.now() - new Date(d.lastCommentDate)) / 86400000)) : null;
  const empty = list.length === 0;
  const emojiOnlyPct = d.totals.allComments ? Math.round((d.totals.emojiOnly / d.totals.allComments) * 100) : 0;

  const tagEntries = Object.entries(d.tagCount);
  const criticalIndex = [...tagEntries].sort((a, b) => b[1] - a[1]).findIndex((t) => t[0] === 'Criticism/Negative');

  return (
    <>
      <Section label="The signal" note={`${d.totals.writtenForMe} all time`}>
        <Grid>
          <Metric label="Written for me" value={d.totals.writtenForMe} note="The quotes campaigns are built from" />
          <Metric label="Comments tracked" value={d.totals.allComments} note={`${d.totals.uniqueAuthors} unique authors`} />
          <Metric label="Emoji only" value={`${emojiOnlyPct}%`} note={`${d.totals.emojiOnly} comments — real engagement, no text`} />
          <Metric label="Untagged" value={d.tagCount['Unreviewed'] || 0} flag="Gemini's free tier caps the backfill rate" note="Filling in over time" />
        </Grid>
      </Section>

      {/* Recent-first by default; all-time always one tap away. */}
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center',
          padding: 'var(--space-3)', border: '1px solid var(--border-hairline)',
          background: 'var(--surface-card)',
        }}
      >
        <div style={{ display: 'flex', flex: 'none' }}>
          {[['recent', 'Last 30 days'], ['all', 'All time']].map(([k, l]) => (
            <button
              key={k} type="button" onClick={() => setScope(k)}
              style={{
                minHeight: 'var(--touch-min)', padding: '0 var(--space-4)',
                background: scope === k ? 'var(--surface-active)' : 'transparent',
                border: '1px solid ' + (scope === k ? 'var(--border-focus)' : 'var(--border-hairline)'),
                color: scope === k ? 'var(--text-heading)' : 'var(--text-muted)',
                font: 'var(--type-button)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
                cursor: 'pointer', marginRight: -1,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 260px', minWidth: 0 }}>
          {[['all', 'Everything'], ['wfm', 'Written for me'], ['themes', 'Emotional themes'], ['critical', 'Criticism']].map(([k, l]) => (
            <Tag key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Tag>
          ))}
        </div>
        <div style={{ width: 150, flex: 'none' }}>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">All platforms</option>
            <option value="YouTube">YouTube</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
          </Select>
        </div>
        <Checkbox id="noemoji" checked={hideEmoji} onChange={(e) => setHideEmoji(e.target.checked)} label="Hide emoji-only" />
      </div>

      {empty ? (
        // The normal state between releases — designed, not an error.
        <div style={{ border: '1px solid var(--border-hairline)', background: 'var(--surface-card)', padding: 'var(--space-7)', textAlign: 'center' }}>
          <div className="viz-empty-hatch" style={{ border: '1px dashed var(--border-strong)', padding: 'var(--space-6)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-4xl)', lineHeight: 1, color: 'var(--text-heading)' }}>
              {days ?? '—'}
            </div>
            <div style={{ font: 'var(--type-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              Days since last comment
            </div>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-body)', margin: 'var(--space-5) auto 0', maxWidth: '52ch' }}>
            Nothing new in this window, and that&rsquo;s expected — comment volume tracks releases and shows, not a steady drip.
            {d.releaseLabel ? ` The most recent highlight: ${d.releaseLabel}.` : ''}
          </p>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button variant="secondary" onClick={() => setScope('all')}>Show all time</Button>
          </div>
          <div style={{ marginTop: 'var(--space-7)', textAlign: 'left' }}>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Last active period · 36 months
            </div>
            <MonthBars months={d.months} highlightMonth={d.releaseMonth} highlightLabel={d.releaseLabel} />
          </div>
        </div>
      ) : (
        <SplitRow gap="var(--space-6)" reorder>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {list.slice(0, 30).map((c, i) => (
              <QuoteCard key={c.date + i} c={c} hero={c.tags.includes('Written for Me')} />
            ))}
            {list.length > 30 && (
              <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: 'var(--space-3) 0' }}>
                Showing 30 of {list.length}
              </div>
            )}
          </div>
          <div className="stt-fanvoice-side" style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)' }}>
            <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Sentiment mix · all time
            </div>
            <BarList data={tagEntries} max={7} hatchIndex={criticalIndex} />
          </div>
        </SplitRow>
      )}
    </>
  );
}
