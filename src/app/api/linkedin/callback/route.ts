import { NextRequest, NextResponse } from 'next/server';

function getPublicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const storedState = request.cookies.get('li_state')?.value;
  const origin = getPublicOrigin(request);

  const fail = () => {
    const res = NextResponse.redirect(`${origin}/?linkedin=error`);
    res.cookies.delete('li_state');
    return res;
  };

  if (error || !code || !state || state !== storedState) return fail();

  // Exchange code for token
  const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!tokenResp.ok) return fail();

  const { access_token, expires_in } = await tokenResp.json();

  // Get person URN from OpenID userinfo
  const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileResp.ok) return fail();

  const profile = await profileResp.json();
  if (!profile.sub) return fail();

  const personUrn = `urn:li:person:${profile.sub}`;
  const maxAge = expires_in ?? 3600;
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };

  const res = NextResponse.redirect(`${origin}/?linkedin=connected`);
  res.cookies.delete('li_state');
  res.cookies.set('li_token', access_token, cookieOpts);
  res.cookies.set('li_urn', personUrn, cookieOpts);
  if (profile.name) {
    res.cookies.set('li_name', profile.name, cookieOpts);
  }
  if (profile.picture) {
    res.cookies.set('li_picture', profile.picture, { ...cookieOpts, httpOnly: false });
  }
  return res;
}
