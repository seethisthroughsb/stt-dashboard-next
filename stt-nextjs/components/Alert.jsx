import { Icon } from './Icon';

// Ported verbatim from reference/components/feedback/Alert.jsx.
const TONES = {
  info: { accent: 'var(--stt-ice)', icon: 'info' },
  success: { accent: 'var(--stt-gold)', icon: 'check' },
  danger: { accent: 'var(--stt-rust)', icon: 'triangle-alert' },
};

export function Alert({ tone = 'info', title, children, style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        background: 'var(--surface-card)',
        borderTop: '3px solid ' + t.accent,
        padding: 'var(--space-4)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ color: t.accent, marginTop: 2 }}>
        <Icon name={t.icon} size={18} />
      </span>
      <div>
        {title && (
          <div style={{ font: 'var(--type-h4)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-heading)' }}>
            {title}
          </div>
        )}
        {children && (
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', marginTop: title ? 'var(--space-1)' : 0 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
