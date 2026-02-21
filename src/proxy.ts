/**
 * Protege las rutas del dashboard: redirige a /login si no hay cookie de sesión.
 * La cookie se establece en el cliente tras el login vía /api/auth/session.
 * Next.js 16: convención "proxy" (sustituye a middleware).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Proteger todo lo que esté bajo /dashboard
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get(SESSION_COOKIE_NAME);
    if (!session?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
