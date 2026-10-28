/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sync route handlers call external APIs (Google, Meta, WooCommerce, Gemini)
  // sequentially — give them room under Vercel's function duration limit,
  // same rationale as the old Apps Script 6-minute-ceiling design.
  experimental: {},

  // 28 Oct 2026 (Nick: "I don't want anyone to glean what the login leads
  // to"): the password gate already stops anyone from seeing real data,
  // but /login itself has to stay publicly reachable, and nothing was
  // stopping a search engine from crawling and indexing it. This header
  // applies to every response from every route — including /login, which
  // can't be gated — and is the most reliable way to say "don't index,
  // don't preview this" (it's read before a crawler even parses the HTML,
  // unlike a <meta> tag). app/robots.js is the second layer: it tells
  // well-behaved crawlers not to even request anything in the first place.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
