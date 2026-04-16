import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clearLinkedInCookies, isLinkedInRevokedToken } from '../_shared';

function guessMimeType(p: string) {
  const ext = p.toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.jpeg') || ext.endsWith('.jpg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function isSafePublicPath(p: string) {
  if (!p.startsWith('/')) return false;
  const norm = path.posix.normalize(p);
  if (norm.includes('..')) return false;
  // Restrict to known folders only
  return norm.startsWith('/red-hat/') || norm.startsWith('/event/') || norm.startsWith('/dell/');
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const ownerUrn = request.cookies.get('li_urn')?.value;

  if (!token || !ownerUrn) {
    return NextResponse.json({ error: 'Not connected to LinkedIn' }, { status: 401 });
  }

  const { publicPath } = (await request.json().catch(() => ({}))) as { publicPath?: string };
  if (!publicPath || typeof publicPath !== 'string') {
    return NextResponse.json({ error: 'Missing publicPath' }, { status: 400 });
  }
  if (!isSafePublicPath(publicPath)) {
    return NextResponse.json({ error: 'Invalid publicPath' }, { status: 400 });
  }

  const absPath = path.join(process.cwd(), 'public', publicPath);
  const bytes = await readFile(absPath);
  const mimeType = guessMimeType(publicPath);

  // Step 1: Register upload slot with LinkedIn
  const regResp = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: ownerUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  });

  if (!regResp.ok) {
    const errText = await regResp.text();
    if (isLinkedInRevokedToken(regResp.status, errText)) {
      const response = NextResponse.json(
        { error: 'LinkedIn access was revoked. Please reconnect LinkedIn.', reconnectRequired: true },
        { status: 401 },
      );
      clearLinkedInCookies(response);
      return response;
    }
    return NextResponse.json({ error: `LinkedIn registerUpload failed (${regResp.status}): ${errText}` }, { status: regResp.status });
  }

  const regData = await regResp.json();
  const uploadUrl: string | undefined =
    regData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const assetUrn: string | undefined = regData.value?.asset;

  if (!uploadUrl || !assetUrn) {
    return NextResponse.json({ error: 'LinkedIn did not return an upload URL' }, { status: 502 });
  }

  // Step 2: Upload binary directly
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
    },
    body: bytes,
  });

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    if (isLinkedInRevokedToken(uploadResp.status, errText)) {
      const response = NextResponse.json(
        { error: 'LinkedIn access was revoked. Please reconnect LinkedIn.', reconnectRequired: true },
        { status: 401 },
      );
      clearLinkedInCookies(response);
      return response;
    }
    return NextResponse.json({ error: `LinkedIn image upload failed (${uploadResp.status}): ${errText}` }, { status: uploadResp.status });
  }

  return NextResponse.json({ assetUrn });
}

