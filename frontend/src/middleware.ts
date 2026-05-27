import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom Domain Resolution Middleware
 * 
 * Intercepts every incoming request and checks if the hostname is a custom domain.
 * If it is, rewrites the request to the /domain/[hostname] route which handles
 * resolving the portfolio from the backend.
 * 
 * Platform domains (localhost, your deployed domain) pass through normally.
 */

// Platform hostnames that should NOT be treated as custom domains
const PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'foliohub-swart.vercel.app',
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  // Strip port for localhost matching (e.g., "localhost:3000" → "localhost")
  const cleanHost = hostname.split(':')[0];

  // Allow platform hosts to pass through — these are normal FolioHub routes
  if (PLATFORM_HOSTS.some(h => cleanHost === h || cleanHost.endsWith(`.${h}`))) {
    return NextResponse.next();
  }

  // If we're here, the hostname is a custom domain (e.g., chanuka.com)
  // Rewrite the request to the /domain/[hostname] route
  const url = request.nextUrl.clone();
  url.pathname = `/domain/${cleanHost}${url.pathname === '/' ? '' : url.pathname}`;
  
  return NextResponse.rewrite(url);
}

export const config = {
  // Match all paths except static files, API routes, and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
