import { NextResponse } from 'next/server';

const LINKEDIN_COOKIE_KEYS = ['li_token', 'li_urn', 'li_name', 'li_picture', 'li_state'] as const;

type LinkedInErrorBody = {
  serviceErrorCode?: number;
  code?: string;
  message?: string;
};

export function clearLinkedInCookies(response: NextResponse) {
  for (const key of LINKEDIN_COOKIE_KEYS) {
    response.cookies.delete(key);
  }
}

export function isLinkedInRevokedToken(status: number, errorText: string) {
  if (status !== 401) return false;
  const lowered = errorText.toLowerCase();
  if (lowered.includes('revoked_access_token') || lowered.includes('65601')) return true;
  try {
    const parsed = JSON.parse(errorText) as LinkedInErrorBody;
    return parsed.code === 'REVOKED_ACCESS_TOKEN' || parsed.serviceErrorCode === 65601;
  } catch {
    return false;
  }
}
