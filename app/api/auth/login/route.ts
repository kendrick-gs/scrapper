import { NextRequest, NextResponse } from 'next/server';
import { listUsers } from '@/lib/storage';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const users = await listUsers();
    if (!email || !users.includes(email)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    setSessionCookie(email);
    return NextResponse.json({ ok: true, user: { email } });
  } catch (e: any) {
    return NextResponse.json({ error: 'Login failed', details: e.message }, { status: 500 });
  }
}

