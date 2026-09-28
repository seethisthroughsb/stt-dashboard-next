// Ported from reference/ui_kits/dashboard/FanVoice.jsx (it exports QuoteCard
// for cross-view reuse there too — Right Now and Campaigns both use it).
// No client state, safe as a server component.
const THEMES = ['Isolation/Loneliness', 'Internal Conflict/Struggle', 'Catharsis/Release', 'Hope/Redemption', 'Life-Moment Tie-in'];

const fmt = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${m}.${d}.${y.slice(2)}`;
};

function TagChip({ t }) {
  const hero = t === 'Written for Me';
  const theme = THEMES.includes(t);
  const crit = t === 'Criticism/Negative';
  const state = t === 'Unreviewed' || t === 'No Category Match';
  return (
    <span
      className={crit ? 'viz-hatch-criticism' : undefined}
      style={{
        font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
        padding: '2px 6px', whiteSpace: 'nowrap',
        color: hero ? 'var(--stt-white)' : theme ? 'var(--text-on-gold)' : 'var(--text-muted)',
        background: hero ? 'var(--stt-rust)' : theme ? 'var(--viz-theme)' : 'transparent',
        border: crit || state ? '1px ' + (t === 'No Category Match' ? 'dashed' : 'solid') + ' var(--viz-state-border)' : '1px solid transparent',
      }}
    >
      {t}
    </span>
  );
}

export function QuoteCard({ c, hero }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-hairline)',
        borderLeft: '3px solid ' + (hero ? 'var(--stt-rust)' : 'var(--border-hairline)'),
        background: 'var(--surface-card)', padding: 'var(--space-4)', minWidth: 0,
      }}
    >
      <p style={{ font: hero ? 'var(--type-body)' : 'var(--type-body-sm)', color: hero ? 'var(--text-heading)' : 'var(--text-body)', margin: 0, maxWidth: '62ch' }}>
        &ldquo;{c.text}&rdquo;
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-3)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {c.p} · {fmt(c.date)}{c.likes ? ' · ' + c.likes + ' likes' : ''}
        </span>
        {c.tags.map((t) => (
          <TagChip key={t} t={t} />
        ))}
      </div>
      {c.title && (
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          on &ldquo;{c.title}&rdquo;
        </div>
      )}
    </div>
  );
}
