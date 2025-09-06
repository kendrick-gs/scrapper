import { NextRequest, NextResponse } from 'next/server';

// NOTE: This is a minimal placeholder using an in-memory map. In production replace with DB.
// Keyed by user email. Survives only per server runtime lifecycle.
const memoryStore: Record<string, any> = {};

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email');
  if(!email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  return NextResponse.json({ prefs: memoryStore[email] || {} });
}

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email');
  if(!email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await req.json();
  memoryStore[email] = { ...(memoryStore[email]||{}), ...body };
  return NextResponse.json({ ok: true, prefs: memoryStore[email] });
}
