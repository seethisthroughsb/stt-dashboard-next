import React from 'react';
import { Icon } from './Icon';

// Shared layout + display primitives used across dashboard views. Ported
// from reference/ui_kits/dashboard/Shell.jsx's bottom half, with one change:
// the original Grid/SplitRow used a JS `useNarrow()` width hook for every
// responsive rule (no stylesheet to lean on). Per START-HERE.md's Vercel
// port guidance, these use real CSS media queries instead (see the
// .stt-grid-*/.stt-split-row rules appended to app/globals.css) — no client
// JS, no hydration mismatch, and these can stay server components.

// No vertical margins — `main` (Shell.jsx) is a gap stack and owns the
// block rhythm between sections.
export function Section({ label, note, action, children }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <span style={{ font: 'var(--type-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', flex: 'none' }}>
          {label}
        </span>
        <span style={{ flex: 1, borderTop: '1px solid var(--border-hairline)' }} />
        {note && (
          <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', flex: 'none' }}>
            {note}
          </span>
        )}
        {action}
      </div>
      {children}
    </section>
  );
}

// Explicit column counts for the small fixed rows so a 4-up never orphans
// its last card (README's documented `auto-fit` trap): 4 across on a wide
// screen, a deliberate 2x2 mid, 1 on a phone. `min` opts into auto-fit for
// genuinely variable-length rows.
export function Grid({ children, gap = 'var(--space-4)', min }) {
  const n = React.Children.count(children);
  let className = 'stt-grid ';
  const style = { gap };

  if (min) {
    className += 'stt-grid-auto';
    style['--stt-grid-min'] = `${min}px`;
  } else if (n === 4) {
    className += 'stt-grid-4';
  } else if (n >= 5) {
    className += 'stt-grid-many';
  } else {
    className += 'stt-grid-fixed';
    style['--stt-grid-n'] = n || 1;
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// Content-major two-column row. The side track is a flexible ratio (1fr
// against the content's 2fr by default) so content stays the wider column
// at every width, and the row stacks below 760px. `reorder` matches Fan
// Voice's stated mobile rule — the side panel drops below the list.
export function SplitRow({ children, gap, ratio = '2fr 1fr', reorder = false }) {
  const [a, b] = ratio.split(' ');
  return (
    <div
      className="stt-split-row"
      data-reorder={reorder ? 'true' : undefined}
      style={{ '--split-a': a, '--split-b': b, ...(gap ? { gap } : null) }}
    >
      {children}
    </div>
  );
}

// A metric card. `flag` enforces the scale rule from tokens/data-viz.css by
// convention (callers should never pass `spark`/chart for a series that
// peaks under ~5 — see data-viz.css's SCALE RULE comment).
export function Metric({ label, value, unit, delta, spark, note, flag }) {
  return (
    <div style={{ border: '1px solid var(--border-hairline)', padding: 'var(--space-4)', minWidth: 0, background: 'var(--surface-card)' }}>
      <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', minHeight: '2.4em' }}>
        {label}
        {flag && (
          <span title={flag} style={{ color: 'var(--stt-gold)', display: 'inline-flex' }}>
            <Icon name="alert-triangle" size={12} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-2xl)', lineHeight: 1, color: 'var(--text-heading)' }}>
          {value}
        </span>
        {unit && (
          <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      {delta != null && (
        <div
          style={{
            font: 'var(--type-label-sm)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            marginTop: 'var(--space-2)',
            color: delta > 0 ? 'var(--viz-delta-up)' : delta < 0 ? 'var(--viz-delta-down)' : 'var(--viz-delta-flat)',
          }}
        >
          {delta > 0 ? '+' : ''}
          {delta} vs prev
        </div>
      )}
      {spark && <div style={{ marginTop: 'var(--space-3)' }}>{spark}</div>}
      {note && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>{note}</div>}
    </div>
  );
}
