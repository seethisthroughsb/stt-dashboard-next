// Ported verbatim from reference/components/core/Badge.jsx. Plain server
// component — no interactive state.
const TONES = {
  neutral: { background: 'var(--surface-raised)', color: 'var(--text-heading)', borderColor: 'transparent' },
  rust: { background: 'var(--stt-rust)', color: 'var(--stt-white)', borderColor: 'transparent' },
  gold: { background: 'var(--stt-gold)', color: 'var(--text-on-gold)', borderColor: 'transparent' },
  outline: { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-strong)' },
};

export function Badge({ tone = 'neutral', children, style, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        height: 22,
        padding: '0 var(--space-2)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 'var(--radius-none)',
        font: 'var(--type-label-sm)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        ...(TONES[tone] || TONES.neutral),
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
