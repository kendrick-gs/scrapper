import { NextRequest, NextResponse } from 'next/server';

// Lightweight pass-through middleware (kept to allow future auth/header logic without churn).
export function middleware(_req: NextRequest) {
	return NextResponse.next();
}

export const config = {
	// Apply only to API routes where we might later need auth enrichment.
	matcher: ['/api/:path*'],
};
