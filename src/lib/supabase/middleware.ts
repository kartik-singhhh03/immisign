import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Create protected routes arrays
  const protectedRoutes = ['/dashboard', '/agreements', '/documents', '/settings', '/billing', '/team'];
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // Create public auth routes to redirect authenticated users away from
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  const isSafeDevMode =
    process.env.NODE_ENV === 'development' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (isSafeDevMode) {
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create workspace route check
  const isWorkspaceRoute = request.nextUrl.pathname.startsWith('/workspace/');
  let agencySlug: string | null = null;
  
  if (isWorkspaceRoute) {
    const segments = request.nextUrl.pathname.split('/');
    if (segments.length >= 3) {
      agencySlug = segments[2];
    }
  }

  if (!user && (isProtectedRoute || isWorkspaceRoute)) {
    // no user, potentially redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect_to', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    // redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    return NextResponse.redirect(url);
  }

  // Enforce Agency Access
  if (user && isWorkspaceRoute && agencySlug) {
    // We should fetch the user's agency to ensure they belong to this slug
    const { data: agencyData } = await (supabase as any)
      .from('agencies')
      .select('id, slug')
      .eq('slug', agencySlug)
      .single();

    if (!agencyData) {
      const url = request.nextUrl.clone();
      url.pathname = '/404';
      return NextResponse.redirect(url);
    }

    // Now check if user belongs to this agency
    const { data: userData } = await (supabase as any)
      .from('users')
      .select('agency_id, role')
      .eq('id', user.id)
      .single();

    if (!userData || (userData as any).agency_id !== (agencyData as any).id) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export async function requireAgencyAccess(request: NextRequest, supabase: any, agencySlug: string, userId: string) {
  const { data: agency } = await supabase.from('agencies').select('id').eq('slug', agencySlug).single();
  if (!agency) throw new Error("Agency not found");

  const { data: user } = await supabase.from('users').select('agency_id, role').eq('id', userId).single();
  if (!user || user.agency_id !== agency.id) throw new Error("Unauthorized access to agency");
  
  return { agencyId: agency.id, role: user.role };
}

