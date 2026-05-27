import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define static legacy routes to be auto-routed into the default avc-migration tenant workspace
  const routesToRedirect = [
    { source: '/dashboard', target: '/dashboard' },
    { source: '/agreements', target: '/agreements' },
    { source: '/documents', target: '/documents' },
    { source: '/templates', target: '/templates' },
    { source: '/clients', target: '/clients' },
    { source: '/analytics', target: '/analytics' },
    { source: '/reports', target: '/reports' },
    { source: '/settings', target: '/settings' },
    { source: '/billing', target: '/billing' }
  ]

  for (const route of routesToRedirect) {
    if (pathname === route.source || pathname.startsWith(route.source + '/')) {
      const remaining = pathname.substring(route.source.length)
      // Redirect to the default tenant workspace matching the subpath
      const destination = `/workspace/avc-migration${route.target}${remaining}`
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agreements/:path*',
    '/documents/:path*',
    '/templates/:path*',
    '/clients/:path*',
    '/analytics/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/billing/:path*'
  ]
}
