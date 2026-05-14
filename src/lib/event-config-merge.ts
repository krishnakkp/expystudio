import type { PublicEventConfig } from '@/types/event-config';

/** Overlay API row onto fallback so empty DB arrays keep working defaults. */
export function mergePublicEventConfig(fallback: PublicEventConfig, row: Partial<PublicEventConfig> | null): PublicEventConfig {
  if (!row) return fallback;
  const opt = (v: string | null | undefined, fb: string | null) => (v != null && String(v).trim() ? String(v).trim() : fb);

  return {
    ...fallback,
    ...row,
    id: row.id?.trim() || fallback.id,
    event_slug: row.event_slug?.trim() || fallback.event_slug,
    event_name: row.event_name?.trim() || fallback.event_name,
    public_app_url: row.public_app_url != null ? row.public_app_url : fallback.public_app_url,
    background_color: opt(row.background_color, fallback.background_color),
    foreground_color: opt(row.foreground_color, fallback.foreground_color),
    secondary_color: opt(row.secondary_color, fallback.secondary_color),
    button_bg_color: opt(row.button_bg_color, fallback.button_bg_color),
    button_text_color: opt(row.button_text_color, fallback.button_text_color),
    logo_url: opt(row.logo_url, fallback.logo_url),
    generic_image_urls:
      row.generic_image_urls && row.generic_image_urls.length > 0 ? row.generic_image_urls : fallback.generic_image_urls,
    prompt_variants:
      row.prompt_variants && row.prompt_variants.length > 0 ? row.prompt_variants : fallback.prompt_variants,
    caption_options:
      row.caption_options && row.caption_options.length > 0 ? row.caption_options : fallback.caption_options,
    tags: row.tags && row.tags.length > 0 ? row.tags : fallback.tags,
  };
}
