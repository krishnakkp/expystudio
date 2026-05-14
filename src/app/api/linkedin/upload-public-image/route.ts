import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clearLinkedInCookies, isLinkedInRevokedToken } from '../_shared';

const MAX_REMOTE_BYTES = 12 * 1024 * 1024;

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
  return norm.startsWith('/red-hat/') || norm.startsWith('/event/') || norm.startsWith('/dell/');
}

function allowedImageUrlHosts(): Set<string> {
  const set = new Set<string>();
  const extra =
    process.env.LINKEDIN_PUBLIC_IMAGE_URL_HOSTS?.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];
  for (const h of extra) set.add(h);
  for (const raw0 of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    const raw = raw0?.trim();
    if (!raw) continue;
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      set.add(u.hostname.toLowerCase());
    } catch {
      // ignore
    }
  }
  return set;
}

function isAllowedHttpsImageUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const hosts = allowedImageUrlHosts();
  if (hosts.size === 0) return false;
  return hosts.has(u.hostname.toLowerCase());
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const ownerUrn = request.cookies.get('li_urn')?.value;

  if (!token || !ownerUrn) {
    return NextResponse.json({ error: 'Not connected to LinkedIn' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { publicPath?: string; imageUrl?: string };
  const publicPath = typeof body.publicPath === 'string' ? body.publicPath : undefined;
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : undefined;

  let bytes: Uint8Array;
  let mimeType: string;

  if (publicPath && !imageUrl) {
    if (!isSafePublicPath(publicPath)) {
      return NextResponse.json({ error: 'Invalid publicPath' }, { status: 400 });
    }
    const absPath = path.join(process.cwd(), 'public', publicPath);
    bytes = new Uint8Array(await readFile(absPath));
    mimeType = guessMimeType(publicPath);
  } else if (imageUrl && !publicPath) {
    if (!isAllowedHttpsImageUrl(imageUrl)) {
      return NextResponse.json(
        {
          error:
            'imageUrl host is not allowlisted. Set LINKEDIN_PUBLIC_IMAGE_URL_HOSTS (comma-separated hostnames) for HTTPS generic images.',
        },
        { status: 400 },
      );
    }
    const imgResp = await fetch(imageUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'expystudio-linkedin-upload/1.0' },
    });
    if (!imgResp.ok) {
      return NextResponse.json({ error: `Failed to fetch imageUrl (${imgResp.status})` }, { status: 400 });
    }
    const len = Number(imgResp.headers.get('content-length') || 0);
    if (len > MAX_REMOTE_BYTES) {
      return NextResponse.json({ error: 'Remote image too large' }, { status: 400 });
    }
    const buf = new Uint8Array(await imgResp.arrayBuffer());
    if (buf.byteLength > MAX_REMOTE_BYTES) {
      return NextResponse.json({ error: 'Remote image too large' }, { status: 400 });
    }
    bytes = buf;
    const headerType = imgResp.headers.get('content-type')?.split(';')[0]?.trim();
    mimeType = headerType && headerType.startsWith('image/') ? headerType : guessMimeType(imageUrl);
  } else {
    return NextResponse.json({ error: 'Provide exactly one of publicPath or imageUrl' }, { status: 400 });
  }

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
