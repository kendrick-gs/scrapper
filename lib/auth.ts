import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-secret';
const COOKIE_NAME = 'session';

type SessionPayload = { email: string; exp: number };

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signToken(email: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: SessionPayload = { email, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadStr = base64url(JSON.stringify(payload));
  const data = `${header}.${payloadStr}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (expected !== sig) return null;
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as SessionPayload;
    if (json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

export async function setSessionCookie(email: string) {
  const token = signToken(email);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function getUserFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.email || null;
}

export async function getUserFromCookies(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.email || null;
}

