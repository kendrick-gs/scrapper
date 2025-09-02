import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createList, getLists, deleteList, updateList } from '@/lib/redis-storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ lists: [] }, { status: 200 });
  const lists = await getLists(email);
  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const list = await createList(email, name);
  return NextResponse.json({ ok: true, list });
}

export async function DELETE(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'List ID required' }, { status: 400 });
  const success = await deleteList(email, id);
  if (!success) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name } = await req.json();
  if (!id || !name) return NextResponse.json({ error: 'List ID and name required' }, { status: 400 });
  const list = await updateList(email, id, name);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  return NextResponse.json({ ok: true, list });
}

