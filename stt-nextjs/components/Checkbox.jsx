import { Icon } from './Icon';

// Ported from reference/components/forms/Checkbox.jsx. Square (no circles —
// brand identity), 44px touch target, custom-styled hidden native input. No
// local state, safe as a server component (parent owns `checked`).
export function Checkbox({ checked, onChange, label, disabled, id, style, ...rest }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        minHeight: 'var(--touch-min)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--text-disabled)' : 'var(--text-body)',
        font: 'var(--type-body)',
        ...style,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          flex: 'none',
          width: 20,
          height: 20,
          border: '1px solid ' + (checked ? 'var(--stt-rust)' : 'var(--border-default)'),
          background: checked ? 'var(--stt-rust)' : 'var(--surface-sunken)',
          color: 'var(--stt-white)',
          transition: 'var(--transition-control)',
        }}
      >
        {checked && <Icon name="check" size={14} />}
      </span>
      {label}
    </label>
  );
}
