import { NextRequest, NextResponse } from 'next/server';

import { createServiceClient } from '@/util/supabase/service';

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient();
  const { id } = await ctx.params;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await supabase
    .from('share_sessions')
    .select('id, caption, selected_image_url, status, created_at, expires_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: data.id,
    caption: data.caption,
    selectedImageUrl: data.selected_image_url,
    status: data.status,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  });
}
