'use client';
import React from 'react';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { Button } from './Button';

// Ported from reference/ui_kits/dashboard/Shell.jsx. Two changes from the
// prototype, both per START-HERE.md's Vercel port guidance:
//   1. Responsive behaviour (sidebar collapse at 860px, mobile-only elements
//      at 760px) is CSS-driven (see .stt-sidebar-desktop etc. in
//      app/globals.css) instead of a JS `useNarrow()` width hook, so there's
//      no server/client layout mismatch on first paint.
//   2. Only "Right now" is a real route so far — the other 6 views are
//      being built one at a time (see the project handoff doc). They render
//      as disabled nav items rather than being left out, so the full nav
//      structure is visible from the start.
export const VIEWS = [
  { id: 'now', href: '/', label: 'Right now', icon: 'activity' },
  { id: 'voice', href: '/voice', label: 'Fan voice', icon: 'message-square' },
  { id: 'platforms', href: '/platforms', label: 'Platforms', icon: 'bar-chart-2' },
  { id: 'audience', href: '/audience', label: 'Audience', icon: 'users' },
  { id: 'campaigns', href: '/campaigns', label: 'Campaigns', icon: 'target' },
  { id: 'opportunities', href: '/opportunities', label: 'Opportunities', icon: 'lightbulb' },
  { id: 'merch', href: '/merch', label: 'Merch', icon: 'shopping-bag' },
];

// Views that have a real route built so far. Update this as each one ships.
const BUILT_VIEWS = new Set(['now', 'voice', 'platforms', 'audience', 'campaigns', 'opportunities']);

const SIDEBAR_W = 216;

function NavItem({ view, active }) {
  const [hover, setHover] = React.useState(false);
  const disabled = !BUILT_VIEWS.has(view.id);
  const content = (
    <>
      <Icon name={view.icon} size={16} />
      {view.label}
      {disabled && (
        <span style={{ marginLeft: 'auto', font: 'var(--type-label-sm)', color: 'var(--text-disabled)' }}>Soon</span>
      )}
    </>
  );
  const style = {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    width: '100%', minHeight: 'var(--touch-min)',
    padding: '0 var(--space-4)',
    background: active ? 'var(--surface-active)' : hover && !disabled ? 'var(--surface-hover)' : 'transparent',
    border: 0,
    borderLeft: '3px solid ' + (active ? 'var(--stt-rust)' : 'transparent'),
    color: disabled ? 'var(--text-disabled)' : active ? 'var(--text-heading)' : 'var(--text-muted)',
    font: 'var(--type-button)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    textAlign: 'left',
    textDecoration: 'none',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'var(--transition-control)',
  };

  if (disabled) {
    return (
      <span aria-disabled="true" style={style}>
        {content}
      </span>
    );
  }
  return (
    <a
      href={view.href}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
    >
      {content}
    </a>
  );
}

const STAMP_LINE = {
  font: 'var(--type-label-sm)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

// Freshness is load-bearing here: the analytics pull is daily, the comment
// feed can be quiet for weeks. Showing both stops "quiet" reading as
// "broken". Sync Now's real (non-simulated) progress state lands in a later
// step — see the project handoff doc's Sync Now section — so this only
// renders the idle state for now.
function DataStamp({ pull, lastComment }) {
  const days = lastComment ? Math.max(0, Math.round((Date.now() - new Date(lastComment)) / 86400000)) : null;
  return (
    <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-hairline)', display: 'grid', gap: 'var(--space-2)' }}>
      <div style={STAMP_LINE}>Data pulled {pull}</div>
      <div style={STAMP_LINE}>{days == null ? 'No comments yet' : `Last comment ${days}d ago`}</div>
      <div className="stt-readonly-note" style={{ ...STAMP_LINE, color: 'var(--text-disabled)' }}>Read only on mobile</div>
    </div>
  );
}

// Manual re-pull. Secondary, not primary: the daily automatic pull is the
// normal path, this is the exception. Not yet wired to real sync routes —
// disabled with a tooltip until that step. See DataStamp's comment above.
function SyncButton() {
  return (
    <Button
      variant="secondary" size="sm" disabled
      className="stt-sync-btn"
      aria-label="Sync now"
      title="Sync now — coming in a later step"
    >
      <Icon name="refresh-cw" size={14} />
      <span className="stt-sync-btn-label">Sync now</span>
    </Button>
  );
}

export function Shell({ view, pull, lastComment, children }) {
  const [mobileNav, setMobileNav] = React.useState(false);
  const active = VIEWS.find((v) => v.id === view) || VIEWS[0];

  const sidebar = (
    <nav
      style={{
        width: SIDEBAR_W, flex: 'none',
        borderRight: '1px solid var(--border-hairline)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-page)',
        height: '100%',
      }}
    >
      <div style={{ padding: 'var(--space-5) var(--space-4)', borderBottom: '1px solid var(--border-hairline)', color: 'var(--stt-ice)' }}>
        <Logo lockup="mark" size={30} />
        <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
          Social listening
        </div>
      </div>
      <div style={{ display: 'grid', gap: 2, padding: 'var(--space-3) 0', flex: 1 }}>
        {VIEWS.map((v) => (
          <NavItem key={v.id} view={v} active={v.id === view} />
        ))}
      </div>
      <DataStamp pull={pull} lastComment={lastComment} />
    </nav>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      <div className="stt-sidebar-desktop">
        {sidebar}
      </div>

      {mobileNav && (
        <div
          onClick={() => setMobileNav(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--surface-scrim)', display: 'flex' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ height: '100vh' }}>{sidebar}</div>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 40,
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            minHeight: 72, padding: '0 var(--page-pad-x)',
            background: 'var(--stt-coal-a88)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-hairline)',
          }}
        >
          <button
            type="button" aria-label="Menu" onClick={() => setMobileNav(true)}
            className="stt-header-menu-btn"
            style={{ width: 40, height: 40, background: 'none', border: '1px solid var(--border-hairline)', color: 'var(--text-heading)', cursor: 'pointer' }}
          >
            <Icon name="menu" size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ font: 'var(--type-h3)', letterSpacing: 'var(--tracking-display)', textTransform: 'uppercase', color: 'var(--text-heading)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {active.label}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 'none' }}>
            <SyncButton />
            <Button variant="secondary" size="sm" disabled className="stt-header-export" title="Export — coming in a later step">
              <Icon name="download" size={14} /> Export
            </Button>
          </div>
        </header>
        <main style={{
          flex: 1, minWidth: 0,
          padding: 'var(--space-6) var(--page-pad-x) var(--space-9)',
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)',
          alignContent: 'start', gap: 'var(--space-8)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
