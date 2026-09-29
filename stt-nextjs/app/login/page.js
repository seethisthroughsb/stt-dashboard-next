'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) {
        setError(data?.error || 'Incorrect password.');
        setBusy(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from') || '/';
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-hairline)',
          padding: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Logo size={56} color="var(--text-heading)" />
          <span
            style={{
              font: 'var(--type-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            STT Social Listening
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="password"
            style={{
              font: 'var(--type-label-sm)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              height: 'var(--control-md)',
              padding: '0 var(--space-4)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-page)',
              color: 'var(--text-heading)',
              font: 'var(--type-body-sm)',
              borderRadius: 'var(--radius-none)',
            }}
          />
        </div>

        {error && (
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--stt-rust)' }}>{error}</div>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={busy || !password}>
          {busy ? 'Checking…' : 'Enter'}
        </Button>
      </form>
    </div>
  );
}
