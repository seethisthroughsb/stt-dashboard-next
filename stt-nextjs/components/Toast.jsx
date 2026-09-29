// Ported verbatim from reference/components/feedback/Toast.jsx. No hooks of
// its own — dismiss/auto-dismiss timing lives in whichever client component
// renders it (Shell.jsx, for the Sync Now flow).
import { Icon } from './Icon';

export function Toast({ message, tone = 'neutral', onDismiss, style, ...rest }) {
  const accent = tone === 'danger' ? 'var(--stt-rust)' : tone === 'success' ? 'var(--stt-gold)' : 'var(--stt-ice)';
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        background: 'var(--surface-inverse)',
        color: 'var(--text-inverse)',
        borderLeft: '3px solid ' + accent,
        padding: 'var(--space-3) var(--space-4)',
        boxShadow: 'var(--shadow-overlay)',
        font: 'var(--type-body-sm)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button" aria-label="Dismiss" onClick={onDismiss}
          style={{ display: 'grid', placeItems: 'center', background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
