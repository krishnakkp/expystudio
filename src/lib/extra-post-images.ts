/** Public paths for the three generic images appended to LinkedIn posts (Red Hat Ansible). */
export const EXTRA_POST_IMAGE_CANDIDATES = [
  ['/red-hat/1.JPG', '/red-hat/1.jpg'],
  ['/red-hat/2.JPG', '/red-hat/2.jpg'],
  ['/red-hat/3.JPG', '/red-hat/3.jpg'],
] as const;

export const EXTRA_POST_IMAGES = EXTRA_POST_IMAGE_CANDIDATES.map((paths) => paths[0]) as readonly string[];
