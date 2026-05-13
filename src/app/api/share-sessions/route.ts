import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/util/supabase/service';

const DEFAULT_BUCKET = 'share-sessions';

function stripDataUrl(dataUrl: string) {
  if (dataUrl.startsWith('data:')) return dataUrl.split(',')[1] ?? '';
  return dataUrl;
}

export async function POST(request: Request) {
  let body: {
    caption?: string;
    imageDataUrl?: string;
    expiresInMinutes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const caption = String(body.caption ?? '').trim();
  const imageDataUrl = body.imageDataUrl;
  if (!caption || !imageDataUrl || typeof imageDataUrl !== 'string') {
    return NextResponse.json({ error: 'caption and imageDataUrl are required' }, { status: 400 });
  }

  const mimeMatch = /^data:([^;]+);base64,/.exec(imageDataUrl);
  const contentType = mimeMatch?.[1]?.startsWith('image/') ? mimeMatch[1] : 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';

  const id = randomUUID();
  const base = `sessions/${id}`;
  const bucket = process.env.SUPABASE_SHARE_SESSIONS_BUCKET?.trim() || DEFAULT_BUCKET;
  const ttlMin = Math.min(1440, Math.max(5, Number(body.expiresInMinutes) || 15));
  const expiresAt = new Date(Date.now() + ttlMin * 60_000).toISOString();

  let buf: Buffer;
  try {
    buf = Buffer.from(stripDataUrl(imageDataUrl), 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
  }
  if (buf.length < 100 || buf.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image payload size out of range' }, { status: 400 });
  }

  const meta = JSON.stringify({ caption, expiresAt, heroKey: `${base}/hero.${ext}` });

  try {
    const supabase = createServiceClient();
    const { error: e1 } = await supabase.storage.from(bucket).upload(`${base}/hero.${ext}`, buf, {
      contentType,
      upsert: true,
    });
    if (e1) {
      console.error('[share-sessions] hero upload', e1);
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }
    const { error: e2 } = await supabase.storage.from(bucket).upload(`${base}/meta.json`, Buffer.from(meta, 'utf8'), {
      contentType: 'application/json',
      upsert: true,
    });
    if (e2) {
      console.error('[share-sessions] meta upload', e2);
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    return NextResponse.json({ id, expiresInMinutes: ttlMin });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[share-sessions]', e);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
