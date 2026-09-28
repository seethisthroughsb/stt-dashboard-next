import * as Icons from 'lucide-react';

// Lucide was a flagged substitution in the design bundle (no icon set shipped
// with the brand) — the prototype loaded it globally via <script> and
// DOM-manipulated a <span>. We use the real lucide-react package instead, per
// START-HERE.md's port guidance ("replace with lucide-react for Next.js").
function toPascalCase(kebab) {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function Icon({ name, size = 20, strokeWidth = 2, style, ...rest }) {
  const Cmp = Icons[toPascalCase(name)] || Icons.HelpCircle;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      style={{ display: 'inline-flex', flex: 'none', ...style }}
      {...rest}
    />
  );
}
