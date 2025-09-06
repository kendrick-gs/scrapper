import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

// Per-user JSON file backed preference store with schema + corruption recovery.
// File layout: .data/prefs/<sanitized-email>.json => { schemaVersion: 1, updatedAt: <epoch>, data: { ...prefs } }
const memoryStore: Record<string, { schemaVersion: number; updatedAt: number; data: any }> = {};
const pendingFlush: Record<string, NodeJS.Timeout> = {};
const PREF_DIR = path.join(process.cwd(), '.data', 'prefs');
const SCHEMA_VERSION = 1;

function sanitize(email: string){ return email.replace(/[^a-zA-Z0-9._-]/g,'_'); }
function userFile(email: string){ return path.join(PREF_DIR, `${sanitize(email)}.json`); }

async function loadUser(email: string){
  if(memoryStore[email]) return;
  try {
    const file = userFile(email);
    const raw = await fs.readFile(file,'utf8');
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed!=='object') throw new Error('invalid');
    if(parsed.schemaVersion !== SCHEMA_VERSION){
      // Simple migration placeholder: wrap existing into current structure
      memoryStore[email] = { schemaVersion: SCHEMA_VERSION, updatedAt: Date.now(), data: parsed.data || parsed.prefs || {} };
      scheduleFlush(email); // write back migrated
    } else {
      memoryStore[email] = { schemaVersion: SCHEMA_VERSION, updatedAt: parsed.updatedAt||Date.now(), data: parsed.data||{} };
    }
  } catch (e: any) {
    // Corruption: rename file and start fresh
    try {
      const file = userFile(email);
      await fs.mkdir(PREF_DIR,{recursive:true});
      await fs.rename(file, file+`.corrupt-${Date.now()}`);
    } catch {/* ignore */}
    memoryStore[email] = { schemaVersion: SCHEMA_VERSION, updatedAt: Date.now(), data: {} };
    scheduleFlush(email);
  }
}

async function flushUser(email: string){
  const rec = memoryStore[email];
  if(!rec) return;
  try {
    await fs.mkdir(PREF_DIR,{recursive:true});
    await fs.writeFile(userFile(email), JSON.stringify(rec, null, 2),'utf8');
  } catch {/* ignore */}
}

function scheduleFlush(email: string){
  if(pendingFlush[email]) return; // already scheduled
  pendingFlush[email] = setTimeout(()=>{
    flushUser(email); delete pendingFlush[email];
  }, 500); // debounce window
}

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
  await loadUser(email);
  return NextResponse.json({ prefs: memoryStore[email].data });
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
  await loadUser(email);
  // Merge partial update
  memoryStore[email].data = { ...memoryStore[email].data, ...body };
  memoryStore[email].updatedAt = Date.now();
  scheduleFlush(email);
  return NextResponse.json({ ok: true, prefs: memoryStore[email].data });
}
