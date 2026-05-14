'use client';

type UploadErr = { error?: string; reconnectRequired?: boolean };

export class LinkedInReconnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkedInReconnectError';
  }
}

export async function uploadLinkedInPublicImageCandidates(candidates: readonly string[]): Promise<string> {
  let lastError = 'HTTP 500';
  for (const ref of candidates) {
    const payload =
      ref.startsWith('http://') || ref.startsWith('https://') ? { imageUrl: ref } : { publicPath: ref };
    const upResp = await fetch('/api/linkedin/upload-public-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!upResp.ok) {
      const err = (await upResp.json().catch(() => ({ error: `HTTP ${upResp.status}` }))) as UploadErr;
      if (err.reconnectRequired) {
        throw new LinkedInReconnectError('Your LinkedIn session was revoked. Please reconnect and try again.');
      }
      lastError = err.error || `HTTP ${upResp.status}`;
      continue;
    }
    const { assetUrn } = (await upResp.json()) as { assetUrn?: string };
    if (assetUrn) return assetUrn;
  }
  throw new Error(lastError);
}
