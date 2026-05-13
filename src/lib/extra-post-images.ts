/** Public paths for the three generic images appended to LinkedIn posts. */
export const EXTRA_POST_IMAGE_CANDIDATES = [
  ['/dell/1.jpeg', '/dell/1.jpg', '/dell/1.JPG'],
  ['/dell/2.jpeg', '/dell/2.jpg', '/dell/2.JPG'],
  ['/dell/3.jpeg', '/dell/3.jpg', '/dell/3.JPG'],
] as const;

export const EXTRA_POST_IMAGES = EXTRA_POST_IMAGE_CANDIDATES.map((paths) => paths[0]) as readonly string[];
