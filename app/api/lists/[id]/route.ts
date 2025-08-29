import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addItemsToList, getList, removeItemsFromList, updateItemsInList } from '@/lib/storage';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ list: null }, { status: 200 });
  const { id } = await context.params;
  const list = await getList(email, id);
  return NextResponse.json({ list });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { products } = await req.json();
  if (!Array.isArray(products)) return NextResponse.json({ error: 'products array required' }, { status: 400 });
  const { id } = await context.params;
  const list = await addItemsToList(email, id, products);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  return NextResponse.json({ ok: true, list });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { keys } = await req.json();
  if (!Array.isArray(keys)) return NextResponse.json({ error: 'keys array required' }, { status: 400 });
  const { id } = await context.params;
  const list = await removeItemsFromList(email, id, keys);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  return NextResponse.json({ ok: true, list });
}


export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { updates } = await req.json();
  if (!Array.isArray(updates)) return NextResponse.json({ error: 'updates array required' }, { status: 400 });
  const { id } = await context.params;
  const list = await updateItemsInList(email, id, updates);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  return NextResponse.json({ ok: true, list });
}
