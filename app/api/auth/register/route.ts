import { NextRequest, NextResponse } from 'next/server';
import { addUser } from '@/lib/storage';
import { setSessionCookie } from '@/lib/auth';

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    await addUser(email);
    setSessionCookie(email);
    return NextResponse.json({ ok: true, user: { email } });
  } catch (e: any) {
    return NextResponse.json({ error: 'Registration failed', details: e.message }, { status: 500 });
  }
}

