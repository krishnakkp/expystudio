import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // If the OAuth provider returned an error, redirect to login
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login`);
  }

  if (code) {
    const cookieStore = await cookies();

    // Collect cookies set during the Supabase operation so we can apply
    // them directly to the NextResponse we return. In Next.js Route Handlers,
    // cookies written via cookies().set() are NOT automatically merged into a
    // manually constructed NextResponse — they only apply to the implicit
    // response. Setting them on the response object directly ensures the
    // browser actually receives the session cookies after the redirect.
    const pendingCookies: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // ignore in Server Components
              }
              pendingCookies.push({ name, value, options });
            });
          },
        },
      },
    );

    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message);
      return NextResponse.redirect(`${origin}/login`);
    }

    // Session is now set in cookies — check the user's role for redirect
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Ensure a profile row exists for OAuth users
      const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
      const role = user.user_metadata?.role ?? 'attendee';

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: fullName,
          role,
        });
      } else if (!existing.full_name && fullName) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const destination = profile?.role === 'organizer' ? '/dashboard' : '/';
      const res = NextResponse.redirect(`${origin}${destination}`);

      // Apply session cookies directly onto the redirect response
      pendingCookies.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options),
      );

      // If the user signed in via LinkedIn OIDC, Supabase provides the
      // provider access token on the session. Set it as li_token / li_urn
      // cookies so the LinkedIn posting API routes work without a separate
      // LinkedIn OAuth connect step.
      const session = sessionData?.session;
      const providerToken = session?.provider_token;
      const isLinkedIn = user.app_metadata?.provider === 'linkedin_oidc';

      if (isLinkedIn && providerToken) {
        // Fetch the LinkedIn person URN using the provider token
        try {
          const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${providerToken}` },
          });
          if (profileResp.ok) {
            const liProfile = await profileResp.json();
            if (liProfile.sub) {
              const personUrn = `urn:li:person:${liProfile.sub}`;
              const maxAge = session.expires_in ?? 3600;
              const cookieOpts = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                maxAge,
                path: '/',
              };
              res.cookies.set('li_token', providerToken, cookieOpts);
              res.cookies.set('li_urn', personUrn, cookieOpts);
            }
          }
        } catch (e) {
          // Non-critical — user can still connect LinkedIn manually later
          console.error('Failed to set LinkedIn cookies from provider token:', e);
        }
      }

      return res;
    }
  }

  // Fallback — no code and no error, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
