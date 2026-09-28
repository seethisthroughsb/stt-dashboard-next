'use client';
import React from 'react';

// Ported from reference/components/core/Button.jsx — same inline-style
// approach (the design system's tokens are CSS custom properties, so inline
// styles referencing var(--...) work as-is; see START-HERE.md §3).
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-none)',
  font: 'var(--type-button)',
  letterSpacing: 'var(--tracking-wide)',
  textTransform: 'uppercase',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'var(--transition-control)',
  whiteSpace: 'nowrap',
};

const SIZES = {
  sm: { height: 'var(--control-sm)', padding: '0 var(--space-4)', fontSize: 'var(--size-xs)' },
  md: { height: 'var(--control-md)', padding: '0 var(--space-5)' },
  lg: { height: 'var(--control-lg)', padding: '0 var(--space-6)', fontSize: 'var(--size-md)' },
};

const VARIANTS = {
  primary: {
    rest: { background: 'var(--action-primary)', color: 'var(--action-primary-text)' },
    hover: { background: 'var(--action-primary-hover)' },
  },
  secondary: {
    rest: { background: 'transparent', color: 'var(--action-secondary-text)', borderColor: 'var(--action-secondary-border)' },
    hover: { background: 'var(--surface-hover)', borderColor: 'var(--border-strong)' },
  },
  ghost: {
    rest: { background: 'transparent', color: 'var(--text-heading)' },
    hover: { background: 'var(--surface-hover)' },
  },
  inverse: {
    rest: { background: 'var(--surface-inverse)', color: 'var(--text-inverse)' },
    hover: { background: 'var(--stt-white)' },
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  cut = false,
  fullWidth = false,
  disabled = false,
  as,
  children,
  style,
  className,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const Tag = as || (rest.href ? 'a' : 'button');

  const resolved = {
    ...BASE,
    ...SIZES[size],
    ...v.rest,
    ...(hover && !disabled ? v.hover : null),
    ...(press && !disabled ? { transform: 'translateY(1px)' } : null),
    ...(fullWidth ? { width: '100%' } : null),
    ...(cut ? { clipPath: 'var(--clip-cut-sm)' } : null),
    ...(disabled
      ? {
          background: 'transparent',
          color: 'var(--text-disabled)',
          borderColor: 'var(--border-hairline)',
          cursor: 'not-allowed',
        }
      : null),
    ...style,
  };

  return (
    <Tag
      className={className}
      style={resolved}
      disabled={Tag === 'button' ? disabled : undefined}
      aria-disabled={disabled || undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
