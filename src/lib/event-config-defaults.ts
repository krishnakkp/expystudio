import type { PublicEventConfig } from '@/types/event-config';

export const DEFAULT_AI_PROMPT_VARIANTS: string[] = [
  'Create a professional LinkedIn-style photo at a tech conference keynote stage. Keep it photorealistic, phone-camera look, natural lighting.',
  'Create a professional LinkedIn-style networking photo in a conference lobby. Photorealistic, candid, realistic lighting and perspective.',
  'Create a professional LinkedIn-style expo-floor photo near booths and banners. Photorealistic, phone-camera look, realistic background.',
  'Create a professional LinkedIn-style photo in front of an event backdrop (step-and-repeat). Photorealistic, crisp, realistic shadows.',
];

export const DEFAULT_CAPTION_OPTIONS: string[] = [
  `Great insights and meaningful conversations at the Dell Technologies Forum, with a clear focus on innovation and business transformation.\n\nThe discussions highlighted how technology continues to shape enterprise resilience and growth.\n\n#DellTechnologiesForum #DellTechForum #DellTechWorld`,
  `An engaging experience at Dell Technologies Forum, bringing together leaders to explore the future of digital transformation.\n\nStrong emphasis on practical solutions and scalable innovation across industries.\n\n#DellTechnologies #DellTechnologiesForum2026 #DellTechForum`,
  `Dell Technologies Forum delivered valuable perspectives on navigating today's evolving tech landscape.\n\nThe sessions reinforced the importance of aligning technology with strategic business priorities.\n\n#DellTechWorld #DellTechnologiesForum #DellTechnologiesForum2026`,
  `Insightful sessions at Dell Technologies Forum showcasing how organizations are leveraging emerging technologies for competitive advantage.\n\nA strong platform for collaboration, learning, and forward-looking ideas.\n\n#DellTechForum #DellTechnologies #DellTechWorld`,
];

/** Baseline branding when no Supabase row matches `public_app_url`. */
export function getFallbackEventConfig(): PublicEventConfig {
  return {
    id: process.env.NEXT_PUBLIC_EVENTS_UUID?.trim() || '',
    event_slug: 'default',
    event_name: 'Forum 2026',
    public_app_url: null,
    background_color: '#0076CE',
    foreground_color: '#ffffff',
    secondary_color: null,
    button_bg_color: '#0672cb',
    button_text_color: '#ffffff',
    logo_url: '/event/dell.png',
    generic_image_urls: [],
    prompt_variants: DEFAULT_AI_PROMPT_VARIANTS,
    caption_options: DEFAULT_CAPTION_OPTIONS,
    tags: [],
  };
}
