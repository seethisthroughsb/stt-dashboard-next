'use client';
import React from 'react';

// Hand-built SVG, zero chart-library dependency — ported near-verbatim from
// reference/ui_kits/dashboard/Charts.jsx. START-HERE.md is explicit about
// keeping it this way: "don't swap in Recharts or Chart.js, the data-viz.css
// rules are the point and a library fights them."

const num = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

// Charts are drawn at MEASURED PIXEL WIDTH, not into a fixed viewBox
// stretched to 100% — see the original file's comment: an 11px axis label
// shrank to 1.8px in a 178px panel under that approach. With the viewBox set
// to the real pixel box, 1 user unit = 1 CSS px and authored sizes stay literal.
function useWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const MONO_AXIS = { font: '500 11px Roboto, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' };
const MONO_SMALL = { font: '500 11px Roboto, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' };

// Sparkline — no text, so it can stretch freely. For series too small to
// deserve an axis (under ~20 at peak per data-viz.css's SCALE RULE).
export function Spark({ data, height = 28, color = 'var(--viz-spark-stroke)' }) {
  if (!data || !data.length) return null;
  const vals = data.map((d) => (Array.isArray(d) ? d[1] : d));
  const max = Math.max(...vals, 1);
  const w = 100;
  const pts = vals.map((v, i) => [i * (w / Math.max(vals.length - 1, 1)), height - 2 - (v / max) * (height - 4)]);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <path
        d={pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Full chart — axis + gridlines, reserved for genuinely meaningful-range
// series (data-viz.css's SCALE RULE: "meaningful range → full chart").
export function TrendChart({ data, height = 180, peakCallout = true }) {
  const [ref, W] = useWidth();
  const body = () => {
    if (!data || !data.length || W < 80) return null;
    const vals = data.map((d) => d[1]);
    const max = Math.max(...vals);
    const niceMax = Math.ceil(max / 50) * 50 || 10;
    const PADL = 46, PADB = 24, PADT = 10, PADR = 8;
    const H = height;
    const x = (i) => PADL + i * ((W - PADL - PADR) / Math.max(vals.length - 1, 1));
    const y = (v) => H - PADB - (v / niceMax) * (H - PADB - PADT);
    const line = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const area = line + ` L${x(vals.length - 1).toFixed(1)} ${H - PADB} L${x(0).toFixed(1)} ${H - PADB} Z`;
    const peakI = vals.indexOf(max);
    const nearRight = x(peakI) > W - 70;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0, niceMax / 2, niceMax].map((t) => (
          <g key={t}>
            <line
              x1={PADL} y1={y(t)} x2={W - PADR} y2={y(t)}
              stroke={t === 0 ? 'var(--viz-grid-zero)' : 'var(--viz-grid)'} strokeWidth="1"
            />
            <text x={PADL - 8} y={y(t) + 4} textAnchor="end" fill="var(--viz-label)" style={MONO_AXIS}>{num(t)}</text>
          </g>
        ))}
        <path d={area} fill="var(--viz-area-fill)" />
        <path d={line} fill="none" stroke="var(--viz-series-1)" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt" />
        {peakCallout && (
          <g>
            <rect x={x(peakI) - 3} y={y(max) - 3} width="6" height="6" fill="var(--stt-rust)" />
            <text
              x={nearRight ? x(peakI) - 10 : x(peakI) + 10} y={y(max) + 4}
              textAnchor={nearRight ? 'end' : 'start'} fill="var(--text-heading)" style={MONO_AXIS}
            >
              {num(max)}
            </text>
          </g>
        )}
        <text x={PADL} y={H - 6} fill="var(--viz-label)" style={MONO_SMALL}>{data[0][0]}</text>
        <text x={W - PADR} y={H - 6} textAnchor="end" fill="var(--viz-label)" style={MONO_SMALL}>{data[data.length - 1][0]}</text>
      </svg>
    );
  };
  return <div ref={ref} style={{ width: '100%', minHeight: height }}>{body()}</div>;
}

// Ranked horizontal bar list — every categorical breakdown (discovery
// source, geo, device, tags, etc.).
export function BarList({ data, max: maxN = 6, fill = 'var(--viz-general-praise)', unit, hatchIndex }) {
  if (!data || !data.length) return null;
  const sorted = [...data].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, maxN);
  const tail = sorted.slice(maxN);
  const rows = tail.length
    ? [...head, ['Other · ' + tail.length + ' more', tail.reduce((a, r) => a + r[1], 0)]]
    : head;
  const top = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <div style={{ display: 'grid', gap: 5 }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(70px, 34%) 1fr 54px', gap: 'var(--space-3)', alignItems: 'center' }}>
          <span title={k} style={{ font: 'var(--type-body-sm)', color: i === 0 ? 'var(--text-heading)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {k}
          </span>
          <span style={{ height: 14, background: 'var(--viz-bar-track)', position: 'relative', minWidth: 0 }}>
            <span
              className={hatchIndex === i ? 'viz-hatch-criticism' : undefined}
              style={{
                position: 'absolute', inset: '0 auto 0 0',
                width: Math.max((v / top) * 100, 1.2) + '%',
                background: hatchIndex === i ? undefined : (String(k).startsWith('Other') ? 'var(--stt-ice-a24)' : fill),
              }}
            />
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>
            {num(v)}{unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// Monthly comment volume. Zero months draw as a 2px track stub, not an
// omission — the silences are the point (see README's stated reasoning).
// `highlightMonth` drives both the rust bar and the caption label so the
// annotation can never name a different month than the one marked.
export function MonthBars({ months, highlightMonth, highlightLabel }) {
  const [ref, W] = useWidth();
  const H = 76;
  const max = Math.max(...months.map((m) => m[1]), 1);
  const bw = W ? W / months.length : 0;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {highlightLabel && (
        <div style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--stt-rust)', marginBottom: 'var(--space-2)' }}>
          {highlightLabel}
        </div>
      )}
      {W > 40 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {months.map(([k, v], i) => {
            const h = v === 0 ? 2 : (v / max) * (H - 2);
            return (
              <rect
                key={k}
                x={(i * bw).toFixed(1)} y={(H - h).toFixed(1)}
                width={Math.max(bw - 1.5, 1).toFixed(1)} height={Math.max(h, 0.8).toFixed(1)}
                fill={k === highlightMonth ? 'var(--stt-rust)' : v === 0 ? 'var(--viz-bar-track)' : 'var(--viz-general-praise)'}
              />
            );
          })}
        </svg>
      )}
      <div style={{ borderTop: '1px solid var(--viz-grid-zero)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', paddingTop: 5 }}>
        <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', color: 'var(--viz-label)' }}>{months[0][0]}</span>
        <span style={{ font: 'var(--type-label-sm)', letterSpacing: 'var(--tracking-label)', color: 'var(--viz-label)' }}>{months[months.length - 1][0]}</span>
      </div>
    </div>
  );
}

// Single stacked proportional bar + legend — age/gender demographic splits.
export function SplitBar({ parts }) {
  const total = parts.reduce((a, p) => a + p[1], 0) || 1;
  const shade = (i) => (i === 0 ? 'var(--stt-gold)' : `rgba(226,242,240,${Math.max(0.56 - i * 0.11, 0.2)})`);
  return (
    <div>
      <div style={{ display: 'flex', height: 28, border: '1px solid var(--border-hairline)' }}>
        {parts.map(([k, v], i) => (
          <span key={k} title={k + ' ' + v + '%'} style={{ width: (v / total) * 100 + '%', background: shade(i) }} />
        ))}
      </div>
      <div style={{ display: 'grid', gap: 4, marginTop: 'var(--space-3)' }}>
        {parts.map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ width: 12, height: 12, flex: 'none', background: shade(i) }} />
            <span style={{ font: 'var(--type-body-sm)', color: i === 0 ? 'var(--text-heading)' : 'var(--text-muted)', flex: 1 }}>{k}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--size-xs)', color: 'var(--text-muted)' }}>{v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
