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

export const metadata = {
  title: 'STT Social Listening',
  description: 'See This Through — fan comment sentiment, platform analytics, and merch performance.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sackers.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
