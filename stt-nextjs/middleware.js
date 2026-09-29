import { NextResponse } from 'next/server';
import { computeAuthToken, AUTH_COOKIE } from './lib/auth';

// App-level password gate. Runs on every request before any page or API
// route renders. Public paths are the login page itself, the login API
// route that issues the auth cookie, and Next's own static asset paths.
//
// The cookie never stores the plaintext password — see lib/auth.js for how
// the token is derived (HMAC of the password with AUTH_SECRET, both set as
// Vercel env vars, never in this repo).
const PUBLIC_PATHS = ['/login', '/api/login'];

function isPublic(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  // Any file with an extension under /public (fonts, images, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await computeAuthToken(process.env.DASHBOARD_PASSWORD, process.env.AUTH_SECRET);

  // If AUTH_SECRET/DASHBOARD_PASSWORD aren't configured yet, fail open
  // rather than lock everyone out silently — the gate only takes effect
  // once both env vars are set in Vercel.
  if (!expected) {
    return NextResponse.next();
  }

  if (cookieToken && cookieToken === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
