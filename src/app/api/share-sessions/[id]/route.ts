import { NextResponse } from 'next/server';
import { createServiceClient } from '@/util/supabase/service';

const DEFAULT_BUCKET = 'share-sessions';

type Params = { id: string };

export async function GET(_request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_SHARE_SESSIONS_BUCKET?.trim() || DEFAULT_BUCKET;
  const base = `sessions/${id}`;

  try {
    const supabase = createServiceClient();
    const { data: metaBlob, error: metaErr } = await supabase.storage.from(bucket).download(`${base}/meta.json`);
    if (metaErr || !metaBlob) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const metaText = await metaBlob.text();
    let meta: { caption?: string; expiresAt?: string; heroKey?: string };
    try {
      meta = JSON.parse(metaText) as { caption?: string; expiresAt?: string; heroKey?: string };
    } catch {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 500 });
    }
    if (meta.expiresAt && new Date(meta.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }

    const heroPath =
      meta.heroKey && !meta.heroKey.includes('..') && meta.heroKey.startsWith('sessions/')
        ? meta.heroKey
        : `${base}/hero.jpg`;
    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(heroPath, 60 * 30);
    if (signErr || !signed?.signedUrl) {
      console.error('[share-sessions] sign', signErr);
      return NextResponse.json({ error: 'Could not load image' }, { status: 500 });
    }

    return NextResponse.json({
      id,
      caption: meta.caption ?? '',
      heroImageUrl: signed.signedUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[share-sessions]', e);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
