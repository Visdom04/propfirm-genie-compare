import { NextResponse } from 'next/server';

/** Public product pages in this handoff pack. */
const LIVE = ['/challenges', '/firms', '/overview', '/compare'];
const LEGACY = {
  '/': '/challenges',
  '/demo-2': '/challenges',
  '/demo-4': '/firms',
  '/compare-page-2': '/overview',
  '/compare-firms': '/compare',
};

function isAllowed(pathname) {
  if (pathname === '/_not-found' || pathname === '/not-found') return true;
  return LIVE.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const dest = LEGACY[pathname];

  if (dest) {
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.redirect(url);
  }

  if (!isAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/_not-found';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
