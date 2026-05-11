import { NextRequest, NextResponse } from 'next/server';

import { createServiceClient } from '@/util/supabase/service';

type CreateShareSessionBody = {
  caption: string;
  selectedImageUrl?: string;
  imageDataUrl?: string;
  expiresInMinutes?: number;
};

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  const body = (await request.json().catch(() => null)) as CreateShareSessionBody | null;
  const caption = body?.caption?.trim();
  const selectedImageUrl = body?.selectedImageUrl?.trim() || null;
  const imageDataUrl = body?.imageDataUrl?.trim() || null;
  const expiresInMinutes = body?.expiresInMinutes ?? 15;

  if (!caption) {
    return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
  }
  if (!selectedImageUrl && !imageDataUrl) {
    return NextResponse.json({ error: 'Missing selectedImageUrl or imageDataUrl' }, { status: 400 });
  }

  const clampedExpires = Math.max(1, Math.min(60, expiresInMinutes));
  const expiresAt = new Date(Date.now() + clampedExpires * 60_000).toISOString();

  let finalImageUrl = selectedImageUrl;
  if (!finalImageUrl && imageDataUrl) {
    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid imageDataUrl' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const bucket = process.env.SUPABASE_SHARE_SESSIONS_BUCKET?.trim() || 'share-sessions';
    const ext = parsed.mimeType.includes('png') ? 'png' : parsed.mimeType.includes('webp') ? 'webp' : 'jpg';
    const objectPath = `share-sessions/${id}.${ext}`;

    const bytes = Buffer.from(parsed.base64, 'base64');
    const upload = await supabase.storage.from(bucket).upload(objectPath, bytes, {
      contentType: parsed.mimeType,
      upsert: true,
    });
    if (upload.error) {
      return NextResponse.json({ error: `Storage upload failed: ${upload.error.message}` }, { status: 500 });
    }

    // Prefer signed URL so bucket can remain private.
    const signed = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, clampedExpires * 60 + 120);
    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: `Create signed URL failed: ${signed.error?.message || 'unknown'}` }, { status: 500 });
    }

    finalImageUrl = signed.data.signedUrl;

    const { data, error } = await supabase
      .from('share_sessions')
      .insert({
        id,
        caption,
        selected_image_url: finalImageUrl,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, expiresAt: data.expires_at });
  }

  const { data, error } = await supabase
    .from('share_sessions')
    .insert({
      caption,
      selected_image_url: finalImageUrl,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id, expires_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, expiresAt: data.expires_at });
}

