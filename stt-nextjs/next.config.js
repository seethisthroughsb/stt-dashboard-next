/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sync route handlers call external APIs (Google, Meta, WooCommerce, Gemini)
  // sequentially — give them room under Vercel's function duration limit,
  // same rationale as the old Apps Script 6-minute-ceiling design.
  experimental: {},
};

module.exports = nextConfig;
