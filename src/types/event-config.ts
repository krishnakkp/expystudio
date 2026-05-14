/** Public `events` row fields used by the post wizard and mobile share flow. */
export type PublicEventConfig = {
  id: string;
  event_slug: string;
  event_name: string;
  public_app_url: string | null;
  background_color: string | null;
  foreground_color: string | null;
  secondary_color: string | null;
  button_bg_color: string | null;
  button_text_color: string | null;
  logo_url: string | null;
  generic_image_urls: string[];
  prompt_variants: string[];
  caption_options: string[];
  tags: string[];
};
