import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appUrl}/api/linkedin/callback`,
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
