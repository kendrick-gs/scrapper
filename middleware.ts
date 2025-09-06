import { NextRequest, NextResponse } from 'next/server';

// Inject the user email (if present) into the internal request headers so API routes can read it.
export function middleware(req: NextRequest) {
  const email = req.cookies.get('auth_email')?.value; // Adjust cookie name if your auth system differs
  // Clone existing headers and append our custom header so the downstream route sees it.
  const requestHeaders = new Headers(req.headers);
  if (email) {
    requestHeaders.set('x-user-email', email);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/user/prefs'],
};
