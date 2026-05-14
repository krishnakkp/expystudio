import { buildGenericImageSlots, flatFirstPerSlot } from '@/lib/generic-post-images';
import { getFallbackEventConfig } from '@/lib/event-config-defaults';

const _slots = buildGenericImageSlots(getFallbackEventConfig().generic_image_urls);

/** Public paths or absolute URLs for the 3 generic carousel images (same order as LinkedIn publish). */
export const EXTRA_POST_IMAGE_CANDIDATES = _slots;

export const EXTRA_POST_IMAGES = flatFirstPerSlot(_slots) as readonly string[];
