import { AUTH_COOKIE } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return res;
}
