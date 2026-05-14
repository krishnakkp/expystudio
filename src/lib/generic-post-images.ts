/** Default public paths when `generic_image_urls` is empty (Dell carousel). */
export const DEFAULT_GENERIC_PATHS = ['/dell/1.jpeg', '/dell/2.jpeg', '/dell/3.jpeg'] as const;

function extVariants(base: string): string[] {
  const lower = base.toLowerCase();
  if (lower.endsWith('.jpeg')) {
    const stem = base.slice(0, -5);
    return [base, `${stem}.jpg`, `${stem}.JPG`];
  }
  if (lower.endsWith('.jpg')) {
    const stem = base.slice(0, -4);
    return [base, `${stem}.jpeg`, `${stem}.JPG`];
  }
  return [base];
}

/**
 * Build three LinkedIn “extra image” slots. Remote URLs use a single candidate per slot;
 * local `/…` paths try common extension variants.
 */
export function buildGenericImageSlots(
  urls: string[] | null | undefined,
  fallbackPaths: readonly string[] = DEFAULT_GENERIC_PATHS
): string[][] {
  const cleaned = (urls ?? []).map((u) => u.trim()).filter(Boolean);
  const picked: string[] = [];
  for (let i = 0; i < 3; i++) {
    picked.push(cleaned[i] ?? fallbackPaths[i] ?? fallbackPaths[fallbackPaths.length - 1] ?? '/placeholder.svg');
  }
  return picked.map((ref) =>
    ref.startsWith('http://') || ref.startsWith('https://') ? [ref] : extVariants(ref)
  );
}

export function flatFirstPerSlot(slots: string[][]): string[] {
  return slots.map((c) => c[0] ?? '');
}
