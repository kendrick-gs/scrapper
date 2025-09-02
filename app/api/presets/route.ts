import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addToPresets, getPresets, removeFromPresets } from '@/lib/redis-storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ presets: { vendors: [], productTypes: [], tags: [] } });
  const presets = await getPresets(email);
  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const updated = await addToPresets(email, body || {});
  return NextResponse.json({ ok: true, presets: updated });
}

export async function DELETE(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { kind, value } = await req.json();
  if (!kind || !value) return NextResponse.json({ error: 'kind and value required' }, { status: 400 });
  const updated = await removeFromPresets(email, kind, value);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, presets: updated });
}

export async function PUT(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { kind, from, to } = await req.json();
  if (!kind || !from) return NextResponse.json({ error: 'kind and from required' }, { status: 400 });
  // Rename functionality not implemented in Redis storage yet
  return NextResponse.json({ error: 'Rename not implemented' }, { status: 501 });
}

