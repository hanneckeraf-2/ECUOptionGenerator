import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

// Note: a checagem aqui e apenas a primeira camada (UX de redirecionamento).
// Cada rota/pagina protegida tambem valida sessao e role no servidor.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedRoute = pathname.startsWith('/generate') || isAdminRoute;

  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/generate', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/generate/:path*', '/admin/:path*'],
};
