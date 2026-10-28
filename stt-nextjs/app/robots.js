// Next.js App Router's metadata-route convention: this file generates a
// real /robots.txt at build time. 28 Oct 2026 (Nick: "I don't want anyone
// to glean what the login leads to") — paired with the X-Robots-Tag header
// in next.config.js, which covers crawlers that ignore robots.txt; this
// covers the well-behaved ones (including Google) that check it first and
// won't even request a page here if it says not to.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
