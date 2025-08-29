import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createList, getLists } from '@/lib/storage';

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

