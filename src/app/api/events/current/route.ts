import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/util/supabase/service';
import { normalizeAppOrigin } from '@/lib/normalize-app-url';
import type { PublicEventConfig } from '@/types/event-config';

function publicOriginFromRequest(request: NextRequest): string | null {
  const qp = request.nextUrl.searchParams.get('url')?.trim();
  if (qp) {
    const n = normalizeAppOrigin(qp);
    if (n) return n;
  }
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
  const hostRaw = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0]?.trim();
  if (!hostRaw) return null;
  try {
    const u = new URL(`${proto}://${hostRaw}`);
    const host = u.hostname.toLowerCase();
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${host}${port}`;
  } catch {
    return null;
  }
}

function rowToPublicConfig(row: Record<string, unknown>): PublicEventConfig {
  const strArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  return {
    id: String(row.id ?? ''),
    event_slug: String(row.event_slug ?? ''),
    event_name: String(row.event_name ?? ''),
    public_app_url: row.public_app_url != null ? String(row.public_app_url) : null,
    background_color: row.background_color != null ? String(row.background_color) : null,
    foreground_color: row.foreground_color != null ? String(row.foreground_color) : null,
    secondary_color: row.secondary_color != null ? String(row.secondary_color) : null,
    button_bg_color: row.button_bg_color != null ? String(row.button_bg_color) : null,
    button_text_color: row.button_text_color != null ? String(row.button_text_color) : null,
    logo_url: row.logo_url != null ? String(row.logo_url) : null,
    generic_image_urls: strArr(row.generic_image_urls),
    prompt_variants: strArr(row.prompt_variants),
    caption_options: strArr(row.caption_options),
    tags: strArr(row.tags),
  };
}

/**
 * Resolve the active event row whose `public_app_url` origin matches this deployment
 * (or the `url` query override, e.g. `NEXT_PUBLIC_APP_URL`).
 */
export async function GET(request: NextRequest) {
  const target = publicOriginFromRequest(request);
  if (!target) {
    return NextResponse.json({ ok: false, error: 'Could not determine public origin', event: null }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('events')
      .select(
        'id,event_name,public_app_url,background_color,foreground_color,secondary_color,button_bg_color,button_text_color,logo_url,generic_image_urls,prompt_variants,caption_options,tags,is_active,updated_at'
      )
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, event: null }, { status: 502 });
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const normalizedTarget = normalizeAppOrigin(target);
    let matched: PublicEventConfig | null = null;
    for (const row of rows) {
      const origin = normalizeAppOrigin(row.public_app_url != null ? String(row.public_app_url) : null);
      if (origin && normalizedTarget && origin === normalizedTarget) {
        matched = rowToPublicConfig(row);
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      matched: Boolean(matched),
      resolvedOrigin: target,
      event: matched,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ ok: false, error: msg, event: null }, { status: 500 });
  }
}
