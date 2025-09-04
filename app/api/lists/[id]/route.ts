import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addItemsToList, getList, renameList, deleteList } from '@/lib/storage';

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

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const { id } = await context.params;
  await renameList(email, id, name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await deleteList(email, id);
  return NextResponse.json({ ok: true });
}
