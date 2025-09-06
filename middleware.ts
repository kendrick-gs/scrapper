import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const email = req.cookies.get('auth_email')?.value; // Placeholder: align with actual auth implementation
  if(email) res.headers.set('x-user-email', email);
  return res;
}

export const config = {
  matcher: ['/api/user/prefs'],
};
