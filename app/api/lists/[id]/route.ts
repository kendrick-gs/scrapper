import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addItemsToList, getList, renameList, deleteList, updateListItems, removeListItems } from '@/lib/storage';

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
  const url = new URL(req.url);
  const handlesParam = url.searchParams.get('handles');
  if (handlesParam) {
    const handles = handlesParam.split(',').map(h => h.trim()).filter(Boolean);
    const list = await removeListItems(email, id, handles);
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json({ ok: true, list });
  } else {
    await deleteList(email, id);
    return NextResponse.json({ ok: true });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const { updates } = await req.json();
    if (!Array.isArray(updates)) return NextResponse.json({ error: 'updates array required' }, { status: 400 });
    const list = await updateListItems(email, id, updates);
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json({ ok: true, list });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update list' }, { status: 500 });
  }
}
