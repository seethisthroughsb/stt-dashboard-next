// Ported verbatim from reference/components/core/Logo.jsx. Logo artwork is
// inlined so it inherits currentColor. The logotype is outlined artwork,
// never type — never set "See This Through" in the display face as a
// stand-in for this component.
const ART = {
  mark: {
    viewBox: '0 0 1366.02 1080',
    body:
      '<path class="cls-1" d="M705.33,467.72c0-17.75-6.59-108.77-19.56-161.59L683,294.92l-2.75,11.21c-13,52.92-19.57,144.18-19.57,161.69v17.94l351.24,354.35H370.14l58.48-106.93S311.14,816,247,884.75h872.1Z"></path><path class="cls-1" d="M680.26,773.87,683,785.08l2.76-11.21c13-52.92,19.56-144.18,19.56-161.69V594.24L354.09,239.89H995.88L937.4,346.82S1054.88,264,1119.06,195.25H247l413.73,417C660.72,630,667.28,721.05,680.26,773.87Z"></path>',
  },
  markBleed: {
    viewBox: '0 0 1366.02 1080',
    body:
      '<path class="cls-1" d="M718,426.78c0-27.8-10.33-170.37-30.65-253.1L683,156.12l-4.31,17.56C658.34,256.57,648.05,399.52,648.05,427V455l550.17,555H192.94l91.61-167.5S100.53,972.3,0,1080H1366S893.42,603.64,718,426.78Z"></path><path class="cls-1" d="M678.7,906.32,683,923.88l4.32-17.56C707.68,823.43,718,680.48,718,653.05V625L167.8,69.92H1173.08l-91.61,167.5S1265.49,107.7,1366,0H0S472.6,476.36,648.05,653.22C648.09,681,658.38,823.59,678.7,906.32Z"></path>',
  },
};

export function Logo({
  lockup = 'mark',
  size = 200,
  color = 'currentColor',
  clearspace = false,
  atmospheric = false,
  title = 'See This Through',
  style,
  ...rest
}) {
  const src = ART[atmospheric ? 'markBleed' : lockup] || ART.mark;
  const [, , vbW, vbH] = src.viewBox.split(' ').map(Number);
  const height = (size * vbH) / vbW;

  const svg = (
    <svg
      viewBox={src.viewBox}
      role="img"
      aria-label={title}
      fill={color}
      style={{ display: 'block', width: size, maxWidth: '100%', height: 'auto', aspectRatio: `${vbW} / ${vbH}` }}
      dangerouslySetInnerHTML={{ __html: src.body }}
    />
  );

  if (atmospheric) {
    return (
      <div aria-hidden="true" style={{ color, opacity: 0.08, pointerEvents: 'none', minWidth: 0, ...style }} {...rest}>
        {svg}
      </div>
    );
  }

  const pad = clearspace ? Math.round(height * 0.25) : 0;
  return (
    <div style={{ display: 'inline-flex', padding: pad, color, ...style }} {...rest}>
      {svg}
    </div>
  );
}
