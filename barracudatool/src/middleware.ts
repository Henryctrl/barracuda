import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set(name, value, options);
        },
        remove(name: string, options) {
          request.cookies.set(name, '');
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set(name, '', options);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If user is not logged in, redirect to login
  if (!user && request.nextUrl.pathname.startsWith('/gatherer')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in but trying to access /gatherer, check subscription
  if (user && request.nextUrl.pathname.startsWith('/gatherer')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    // If no active subscription, redirect to subscribe page
    if (!profile || profile.subscription_status !== 'active') {
      return NextResponse.redirect(new URL('/subscribe', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
