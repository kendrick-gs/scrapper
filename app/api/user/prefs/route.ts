import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

// Simple JSON-file backed preference cache (still not production-grade but survives dev restarts).
// Stores keys like: columnOrder, listColumnSizing, listColumnVisibility, dataPresets { vendors[], productTypes[], tags[] }
const memoryStore: Record<string, any> = {};
const DATA_FILE = path.join(process.cwd(), '.data', 'user-prefs.json');

async function ensureLoaded(){
  if((ensureLoaded as any)._loaded) return; (ensureLoaded as any)._loaded = true;
  try {
    const raw = await fs.readFile(DATA_FILE,'utf8');
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed==='object' && !Array.isArray(parsed)){
      Object.assign(memoryStore, parsed);
    }
  } catch {
    // ignore (file missing or invalid)
  }
}

async function persist(){
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch {
    // ignore write errors (best effort)
  }
}

function getEmail(req: NextRequest){
  // Primary: signed session cookie. Secondary: dev header injected by middleware for local experimentation.
  return getUserFromRequest(req) || req.headers.get('x-user-email') || null;
}

export async function GET(req: NextRequest) {
  await ensureLoaded();
  const email = getEmail(req);
  if(!email){
    // Return empty prefs (not 401) so UI can still function without auth, avoiding noisy console errors.
    return NextResponse.json({ prefs: {} }, { status: 200 });
  }
  return NextResponse.json({ prefs: memoryStore[email] || {} });
}

export async function POST(req: NextRequest) {
  await ensureLoaded();
  const email = getEmail(req);
  if(!email){
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const body = await req.json().catch(()=>({}));
  if(typeof body !== 'object' || Array.isArray(body)){
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  memoryStore[email] = { ...(memoryStore[email]||{}), ...body };
  persist();
  return NextResponse.json({ ok: true, prefs: memoryStore[email] });
}
