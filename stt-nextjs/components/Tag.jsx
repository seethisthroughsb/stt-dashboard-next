'use client';
import React from 'react';
import { Icon } from './Icon';

// Ported from reference/components/core/Tag.jsx — interactive chip, used for
// Fan Voice's filter row (sentence case, unlike Badge).
export function Tag({ children, onRemove, active = false, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const interactive = Boolean(rest.onClick || onRemove);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: 30,
        padding: '0 var(--space-3)',
        border: '1px solid ' + (active ? 'var(--border-focus)' : hover && interactive ? 'var(--border-strong)' : 'var(--border-hairline)'),
        background: active ? 'var(--surface-active)' : hover && interactive ? 'var(--surface-hover)' : 'transparent',
        color: active ? 'var(--text-heading)' : 'var(--text-body)',
        font: 'var(--type-body-sm)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'var(--transition-control)',
        ...style,
      }}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
          style={{ display: 'grid', placeItems: 'center', background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </span>
  );
}
