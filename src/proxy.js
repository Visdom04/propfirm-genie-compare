import { NextResponse } from 'next/server';

/** Public product pages in this handoff pack. */
const LIVE = ['/challenges', '/demo-4', '/compare-firms', '/compare-page-2'];

function isAllowed(pathname) {
  if (pathname === '/_not-found' || pathname === '/not-found') return true;
  return LIVE.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' || pathname === '/demo-2') {
    const url = request.nextUrl.clone();
    url.pathname = '/challenges';
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
