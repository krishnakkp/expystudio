import { NextRequest, NextResponse } from 'next/server';
import { clearLinkedInCookies, isLinkedInRevokedToken } from '../_shared';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const urn = request.cookies.get('li_urn')?.value;
  const name = request.cookies.get('li_name')?.value ?? null;
  const picture = request.cookies.get('li_picture')?.value ?? null;
  if (!token || !urn) {
    return NextResponse.json({ connected: false, name: null, picture: null });
  }

  // Validate token health; cookie presence alone is not enough.
  const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (profileResp.ok) {
    return NextResponse.json({ connected: true, name, picture });
  }

  const errText = await profileResp.text().catch(() => '');
  const response = NextResponse.json({ connected: false, name: null, picture: null });
  if (isLinkedInRevokedToken(profileResp.status, errText) || profileResp.status === 401) {
    clearLinkedInCookies(response);
  }
  return response;
}
