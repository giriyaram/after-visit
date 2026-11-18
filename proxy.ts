import {NextResponse, type NextRequest} from 'next/server';
import {getSessionCookie} from 'better-auth/cookies';

// A fast redirect only. This sees that a session cookie exists, not that it
// is valid, so it protects nothing. The real check is getCurrentStaff() in
// lib/current-staff.ts, which every staff page and data function calls.
export function proxy(request: NextRequest) {
  const hasSessionCookie = getSessionCookie(request) !== null;
  const isSignIn = request.nextUrl.pathname === '/sign-in';

  if (!isSignIn && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/inbox/:path*', '/follow-ups/:path*'],
};
