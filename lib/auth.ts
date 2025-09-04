import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
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

export function buildSetCookieHeader(name: string, value: string, opts: { maxAge?: number } = {}) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'SameSite=Lax',
    'HttpOnly'
  ];
  if (opts.maxAge !== undefined) {
    parts.push(`Max-Age=${opts.maxAge}`);
  }
  return parts.join('; ');
}

export function setSessionCookie(email: string): string {
  const token = signToken(email);
  return buildSetCookieHeader(COOKIE_NAME, token, { maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookie(): string {
  return buildSetCookieHeader(COOKIE_NAME, '', { maxAge: 0 });
}

export function getUserFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.email || null;
}

export function getUserFromCookies(): string | null {
  try {
    // Attempt sync cookies helper; if promise returned, handle gracefully
    const c: any = cookies();
    const maybe = typeof c.then === 'function' ? null : c.get?.(COOKIE_NAME)?.value;
    if (!maybe) return null;
    const payload = verifyToken(maybe);
    return payload?.email || null;
  } catch {
    return null;
  }
}

