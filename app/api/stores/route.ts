import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addStore, getStores, removeStore } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ stores: [] });
  const stores = await getStores(email);
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { shopUrl } = await req.json();
  if (!shopUrl) return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });
  await addStore(email, shopUrl);
  const stores = await getStores(email);
  return NextResponse.json({ ok: true, stores });
}

export async function DELETE(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { shopUrl } = await req.json();
  if (!shopUrl) return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });
  await removeStore(email, shopUrl);
  const stores = await getStores(email);
  return NextResponse.json({ ok: true, stores });
}
