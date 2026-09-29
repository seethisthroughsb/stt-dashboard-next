'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';

// Ported from reference/ui_kits/dashboard/Shell.jsx. Two changes from the
// prototype, both per START-HERE.md's Vercel port guidance:
//   1. Responsive behaviour (sidebar collapse at 860px, mobile-only elements
//      at 760px) is CSS-driven (see .stt-sidebar-desktop etc. in
//      app/globals.css) instead of a JS `useNarrow()` width hook, so there's
//      no server/client layout mismatch on first paint.
//   2. All 7 views now have real routes.
export const VIEWS = [
  { id: 'now', href: '/', label: 'Right now', icon: 'activity' },
  { id: 'voice', href: '/voice', label: 'Fan voice', icon: 'message-square' },
  { id: 'platforms', href: '/platforms', label: 'Platforms', icon: 'bar-chart-2' },
  { id: 'audience', href: '/audience', label: 'Audience', icon: 'users' },
  { id: 'campaigns', href: '/campaigns', label: 'Campaigns', icon: 'target' },
  { id: 'opportunities', href: '/opportunities', label: 'Opportunities', icon: 'lightbulb' },
  { id: 'merch', href: '/merch', label: 'Merch', icon: 'shopping-bag' },
];

const BUILT_VIEWS = new Set(['now', 'voice', 'platforms', 'audience', 'campaigns', 'opportunities', 'merch']);

// The design bundle's own Sync Now spec ("SOURCES is the actual pull order
// from the backend handoff") lists YouTube comments → YouTube analytics →
// Meta comments → Meta insights → Website → Merch → Sentiment tagging. The
// order actually proven clean end-to-end in production (see
// STT_Vercel_Migration_Handoff.md) groups both comment sources first, then
// both analytics-heavy sources, then merch, then insights, then tagging
// last (comments have to exist before they can be tagged) — that's the
// order used here; correctness over matching the mockup's exact sequence.
// 'translate' and 'ai-summary' are last on purpose, in that order: both hit
// this app's own local routes (not the external backend proxy the other 7
// stages use — /api/sync/[source]/route.js only allows those 7 keys
// through; a literal folder route like /api/sync/translate takes routing
// precedence over that dynamic catch-all in Next.js, so no special-casing
// is needed here — the fetch below is identical for every stage). Neither
// ever fails the rest of a sync in a way that loses data — if either
// errors, Shell's normal per-stage handling just reports it like any other
// failed stage. Translate runs before AI summary since a freshly-translated
// comment could in principle matter to a future insight rule, though none
// reads translated_text today.
const SOURCES = [
  { key: 'youtube-comments', label: 'YouTube comments' },
  { key: 'meta-comments', label: 'Meta comments' },
  { key: 'website-analytics', label: 'Website (GA4)' },
  { key: 'merch', label: 'Merch (WooCommerce)' },
  { key: 'meta-insights', label: 'Meta insights' },
  { key: 'youtube-analytics', label: 'YouTube analytics' },
  { key: 'sentiment-tagging', label: 'Sentiment tagging' },
  { key: 'translate', label: 'Translation' },
  { key: 'ai-summary', label: 'AI summary' },
];

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
// "broken". While a sync is running this becomes the progress readout per
// the design spec: stage name, a 2px rust bar at done/total, and the count.
// A failed sync leaves a persistent rust line until the next success.
function DataStamp({ pull, lastComment, sync }) {
  const days = lastComment ? Math.max(0, Math.round((Date.now() - new Date(lastComment)) / 86400000)) : null;

  if (sync.status === 'running') {
    const pct = sync.total ? Math.round((sync.done / sync.total) * 100) : 0;
    return (
      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-hairline)', display: 'grid', gap: 'var(--space-2)' }}>
        <div style={STAMP_LINE}>Syncing · {sync.stage}</div>
        <div style={{ height: 2, background: 'var(--viz-bar-track)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: 'var(--stt-rust)', transition: 'width 0.3s' }} />
        </div>
        <div style={STAMP_LINE}>{sync.done} of {sync.total} sources</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-hairline)', display: 'grid', gap: 'var(--space-2)' }}>
      <div style={STAMP_LINE}>Data pulled {pull}</div>
      <div style={STAMP_LINE}>{days == null ? 'No comments yet' : `Last comment ${days}d ago`}</div>
      {sync.lastErrorStage && (
        <div style={{ ...STAMP_LINE, color: 'var(--stt-rust)' }}>Last sync failed · {sync.lastErrorStage}</div>
      )}
      <div className="stt-readonly-note" style={{ ...STAMP_LINE, color: 'var(--text-disabled)' }}>Read only on mobile</div>
    </div>
  );
}

// Manual re-pull. Secondary, not primary: the daily automatic pull is the
// normal path, this is the exception. Calls this app's own /api/sync/*
// proxy routes (see app/api/sync/[source]/route.js) one source at a time,
// in SOURCES order, so the UI can advance per stage rather than only
// reporting at the very end.
function SyncButton({ status, onClick }) {
  const running = status === 'running';
  return (
    <Button
      variant="secondary" size="sm"
      disabled={running}
      className="stt-sync-btn"
      aria-label="Sync now"
      title={running ? 'Syncing…' : 'Re-pull all 7 sources now'}
      onClick={onClick}
    >
      <span style={{ display: 'inline-flex', animation: running ? 'stt-spin 1.1s linear infinite' : undefined }}>
        <Icon name="refresh-cw" size={14} />
      </span>
      <span className="stt-sync-btn-label">{running ? 'Syncing' : 'Sync now'}</span>
    </Button>
  );
}

export function Shell({ view, pull, lastComment, children }) {
  const [mobileNav, setMobileNav] = React.useState(false);
  const [sync, setSync] = React.useState({ status: 'idle', stage: null, done: 0, total: SOURCES.length, lastErrorStage: null });
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);
  const router = useRouter();
  const active = VIEWS.find((v) => v.id === view) || VIEWS[0];

  const notify = (message, tone) => {
    setToast({ message, tone: tone || 'success' });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const runSync = async () => {
    if (sync.status === 'running') return;
    setSync({ status: 'running', stage: SOURCES[0].label, done: 0, total: SOURCES.length, lastErrorStage: null });

    for (let i = 0; i < SOURCES.length; i++) {
      const src = SOURCES[i];
      setSync((s) => ({ ...s, stage: src.label, done: i }));
      try {
        const resp = await fetch(`/api/sync/${src.key}`, { cache: 'no-store' });
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data || data.ok === false) {
          throw new Error((data && data.error) || `${src.label} failed`);
        }
      } catch (err) {
        setSync({ status: 'idle', stage: null, done: i, total: SOURCES.length, lastErrorStage: src.label });
        notify(`Sync failed at ${src.label}. ${err.message}`, 'danger');
        return;
      }
    }

    const stamp = new Date().toLocaleDateString('en-US');
    setSync({ status: 'idle', stage: null, done: SOURCES.length, total: SOURCES.length, lastErrorStage: null });
    notify(`All ${SOURCES.length} sources re-pulled. Data current as of ${stamp}.`, 'success');
    router.refresh();
  };

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
      <DataStamp pull={pull} lastComment={lastComment} sync={sync} />
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
            <SyncButton status={sync.status} onClick={runSync} />
            <Button
              as="a" href={`/api/export/${view}`}
              variant="secondary" size="sm" className="stt-header-export"
              title="Download this view as CSV"
            >
              <Icon name="download" size={14} /> Export
            </Button>
            <Button variant="ghost" size="sm" aria-label="Log out" title="Log out" onClick={logout}>
              <Icon name="log-out" size={14} />
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

      {toast && (
        <div style={{ position: 'fixed', left: 'var(--space-5)', bottom: 'var(--space-5)', zIndex: 200, maxWidth: 360 }}>
          <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
