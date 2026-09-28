'use client';
import React from 'react';
import { Icon } from '../Icon';
import { Tag } from '../Tag';
import { Section, Grid, Metric } from '../Primitives';
import { deriveInsights } from '../../lib/insights';

// Ported from reference/ui_kits/dashboard/Opportunities.jsx — every card is
// derived from lib/insights.js's deriveInsights(), a pure function over the
// same data the other views read. Needs client state for the kind filter,
// so unlike Right Now/Platforms/Audience this is a Client Component; the
// insight derivation itself still runs once per render from server-loaded
// data (app/opportunities/page.js), not fetched separately.
const KIND = {
  blindspot: { label: 'Blindspot', icon: 'eye-off' },
  opportunity: { label: 'Opportunity', icon: 'trending-up' },
  risk: { label: 'Risk', icon: 'alert-triangle' },
};

function InsightCard({ ins }) {
  const k = KIND[ins.kind];
  const hot = ins.weight >= 85;
  return (
    <article
      style={{
        border: '1px solid var(--border-hairline)',
        borderLeft: '3px solid ' + (hot ? 'var(--stt-rust)' : 'var(--viz-theme)'),
        background: 'var(--surface-card)',
        padding: 'var(--space-5)', minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ display: 'inline-flex', color: hot ? 'var(--stt-rust)' : 'var(--viz-theme)' }}>
          <Icon name={k.icon} size={14} />
        </span>
        <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {k.label}
        </span>
      </div>

      <h3 style={{ font: 'var(--type-h4)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-heading)', margin: 0 }}>
        {ins.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-2xl)', lineHeight: 1, color: hot ? 'var(--stt-rust)' : 'var(--stt-gold)' }}>
          {ins.stat}
        </span>
        <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {ins.statLabel}
        </span>
      </div>

      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', margin: 0 }}>{ins.evidence}</p>

      {/* The action is the product. Everything above it is justification. */}
      <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: 'var(--space-3)', marginTop: 'auto' }}>
        <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
          Do this
        </div>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-heading)', margin: 0 }}>{ins.action}</p>
      </div>
    </article>
  );
}

export function Opportunities({ d }) {
  const all = React.useMemo(() => deriveInsights(d), [d]);
  const [kind, setKind] = React.useState('all');
  const list = kind === 'all' ? all : all.filter((i) => i.kind === kind);
  const count = (k) => all.filter((i) => i.kind === k).length;

  return (
    <>
      <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)', maxWidth: '66ch', margin: 0 }}>
        Every card below is derived from the data on the other views, and states the number it came
        from. Nothing here is a hunch — if a rule stops being true, its card disappears.
      </p>

      <Grid min={150}>
        <Metric label="Blindspots" value={count('blindspot')} note="Being missed or wasted" />
        <Metric label="Opportunities" value={count('opportunity')} note="Working, not being pushed" />
        <Metric label="Risks" value={count('risk')} note="Will bite if ignored" />
      </Grid>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {[['all', 'Everything'], ['blindspot', 'Blindspots'], ['opportunity', 'Opportunities'], ['risk', 'Risks']].map(([k, l]) => (
          <Tag key={k} active={kind === k} onClick={() => setKind(k)}>{l}</Tag>
        ))}
      </div>

      {list.length > 0 ? (
        // Genuinely variable length — rules come and go — so auto-fit is
        // correct here. Floor kept at 300 so it still yields 2 columns in a
        // 645px column.
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)', alignItems: 'stretch' }}>
          {list.map((ins, i) => <InsightCard key={i} ins={ins} />)}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
          No {kind === 'all' ? 'insights' : KIND[kind]?.label.toLowerCase() + ' cards'} right now — the underlying data doesn&rsquo;t clear any rule&rsquo;s threshold yet.
        </div>
      )}

      <Section label="How these are built" />
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: '66ch', margin: 0 }}>
        Rules live in <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>lib/insights.js</code> —
        each is a function over the same data the charts read, with a threshold and a weight. They are
        deliberately not AI-generated: a rule can be argued with, audited, and corrected. An LLM pass
        could sit on top later to draft the copy, but the reasoning should stay explainable.
      </p>
    </>
  );
}
