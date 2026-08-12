import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // 1. HARD BLOCK: If trying to access super-admin without an active session, abort immediately.
  if (path.startsWith('/super-admin') && !user) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 2. ROLE CHECK: If logged in, verify super_admin status for super-admin route
  if (path.startsWith('/super-admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // 3. Protect standard dashboard routes
  if (path.startsWith('/dashboard') && !user) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 4. Prevent root loop
  if (path === '/' && user) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api/webhooks/stripe|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};