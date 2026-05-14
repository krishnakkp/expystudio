import type { PublicEventConfig } from '@/types/event-config';

/** Default AI prompts (aligned with typical `events.prompt_variants` seed). */
export const DEFAULT_AI_PROMPT_VARIANTS: string[] = [
  'Create a professional LinkedIn-style photo at a tech conference keynote stage. Keep it photorealistic, phone-camera look, natural lighting.',
  'Create a professional LinkedIn-style networking photo in a conference lobby. Photorealistic, candid, realistic lighting and perspective.',
  'Create a professional LinkedIn-style expo-floor photo near booths and banners. Photorealistic, phone-camera look, realistic background.',
  'Create a professional LinkedIn-style photo in front of an event backdrop (step-and-repeat). Photorealistic, crisp, realistic shadows.',
];

/** Default caption options (EXPY App / `public.events` baseline). */
export const DEFAULT_CAPTION_OPTIONS: string[] = [
  'Great insights and meaningful conversations at the EXPY Technologies Forum, with a clear focus on innovation and business transformation. The discussions highlighted how technology continues to shape enterprise resilience and growth.',
  'An engaging experience at EXPY Technologies Forum, bringing together leaders to explore the future of digital transformation. Strong emphasis on practical solutions and scalable innovation across industries.',
  'EXPY Technologies Forum delivered valuable perspectives on navigating evolving tech landscape. The sessions reinforced the importance of aligning technology with strategic business priorities.',
  'Insightful sessions at EXPY Technologies Forum showcasing how organizations are leveraging emerging technologies for competitive advantage. A strong platform for collaboration, learning, and forward-looking ideas.',
];

const DEFAULT_GENERIC_IMAGE_URLS: string[] = [
  'https://expy.crafttechhub.com/assets/app/events/1.jpeg',
  'https://expy.crafttechhub.com/assets/app/events/2.jpeg',
  'https://expy.crafttechhub.com/assets/app/events/3.jpeg',
];

const DEFAULT_APP_EVENT_ID = '1aef07bb-6092-4e86-8cb2-0689a91832b2';

/** Baseline branding when no Supabase row matches `public_app_url` (matches App / app.expystudios.ai seed). */
export function getFallbackEventConfig(): PublicEventConfig {
  return {
    id: process.env.NEXT_PUBLIC_EVENTS_UUID?.trim() || DEFAULT_APP_EVENT_ID,
    event_slug: 'app',
    event_name: 'App',
    public_app_url: 'https://app.expystudios.ai/',
    background_color: '#0A0A09',
    foreground_color: '#888780',
    secondary_color: '#2A2A28',
    button_bg_color: '#C8FF00',
    button_text_color: '#2A2A28',
    logo_url: 'https://expy.crafttechhub.com/assets/app/logo.png',
    generic_image_urls: DEFAULT_GENERIC_IMAGE_URLS,
    prompt_variants: DEFAULT_AI_PROMPT_VARIANTS,
    caption_options: DEFAULT_CAPTION_OPTIONS,
    tags: ['#EXPY', '#EXPYVISUUALY', '#VISUALLYSTUDIOS'],
  };
}
