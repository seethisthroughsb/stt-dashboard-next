'use client';
import React from 'react';
import { Icon } from './Icon';

// Ported from reference/components/forms/Select.jsx — a native <select>
// under brand chrome (reliable on mobile, no custom popover).
export function Select({ error = false, disabled, children, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <select
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          minWidth: 0,
          height: 'var(--control-md)',
          padding: '0 36px 0 var(--space-3)',
          background: disabled ? 'transparent' : 'var(--surface-sunken)',
          color: disabled ? 'var(--text-disabled)' : 'var(--text-heading)',
          border: '1px solid ' + (error ? 'var(--stt-rust)' : focus ? 'var(--border-focus)' : 'var(--border-default)'),
          borderRadius: 'var(--radius-xs)',
          font: 'var(--type-body)',
          appearance: 'none',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'var(--transition-control)',
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
      <span style={{ position: 'absolute', right: 12, top: 0, height: 'var(--control-md)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
        <Icon name="chevron-down" size={16} />
      </span>
    </span>
  );
}
