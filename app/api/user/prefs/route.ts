import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// Simple in-memory preference cache (per runtime). Replace with persistent storage for production.
const memoryStore: Record<string, any> = {};

function getEmail(req: NextRequest){
  // Primary: signed session cookie. Secondary: dev header injected by middleware for local experimentation.
  return getUserFromRequest(req) || req.headers.get('x-user-email') || null;
}

export async function GET(req: NextRequest) {
  const email = getEmail(req);
  if(!email){
    // Return empty prefs (not 401) so UI can still function without auth, avoiding noisy console errors.
    return NextResponse.json({ prefs: {} }, { status: 200 });
  }
  return NextResponse.json({ prefs: memoryStore[email] || {} });
}

export async function POST(req: NextRequest) {
  const email = getEmail(req);
  if(!email){
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const body = await req.json().catch(()=>({}));
  if(typeof body !== 'object' || Array.isArray(body)){
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  memoryStore[email] = { ...(memoryStore[email]||{}), ...body };
  return NextResponse.json({ ok: true, prefs: memoryStore[email] });
}
