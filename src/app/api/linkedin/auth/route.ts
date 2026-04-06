import { NextResponse } from 'next/server';

function getPublicOrigin(request: Request): string {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const origin = getPublicOrigin(request);

  if (!clientId) {
    return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${origin}/api/linkedin/callback`,
    state,
    scope: 'openid profile w_member_social',
  });

  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params}`,
  );

  response.cookies.set('li_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
