import localFont from 'next/font/local';
import { Roboto } from 'next/font/google';
import './globals.css';

// The licensed display face. Self-hosted via next/font/local per
// START-HERE.md §3 ("Use verbatim" list) — caps-only, one weight (500),
// never lowercase, never bold (the display face has no bold to synthesise).
const sackers = localFont({
  src: '../fonts/Sackers-Gothic-Medium.otf',
  weight: '500',
  style: 'normal',
  display: 'swap',
  variable: '--font-sackers',
});

// Body text + all numeric data. 400/500/700 per README's Type section.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
});

// 28 Oct 2026 (Nick: "I don't want anyone to glean what the login leads
// to"): both of these used to spell out exactly what this is — band name,
// "fan comment sentiment, platform analytics, and merch performance" — in
// the browser tab and in any link-preview/search-result snippet. Renamed
// to the vague, on-brand "The Signal" (already used inside the app itself,
// on Opportunities' "THE SIGNAL" section) with a description that reveals
// nothing. See app/login/page.js (same visible text) and next.config.js /
// app/robots.js (stops this from being indexed/previewed at all) for the
// rest of this pass.
export const metadata = {
  title: 'The Signal',
  description: 'Internal tool.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sackers.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
