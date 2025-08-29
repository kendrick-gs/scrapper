import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getHistory } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ history: [] });
  const history = await getHistory(email);
  return NextResponse.json({ history });
}

