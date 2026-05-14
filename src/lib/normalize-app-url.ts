/** Normalize a configured or incoming app URL to `https://host[:port]` for comparison. */
export function normalizeAppOrigin(urlLike: string | null | undefined): string | null {
  if (!urlLike?.trim()) return null;
  const s = urlLike.trim();
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase();
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${host}${port}`;
  } catch {
    return null;
  }
}
