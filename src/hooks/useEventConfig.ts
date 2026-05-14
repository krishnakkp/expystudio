'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicEventConfig } from '@/types/event-config';
import { getFallbackEventConfig } from '@/lib/event-config-defaults';
import { mergePublicEventConfig } from '@/lib/event-config-merge';

type ApiResponse = {
  ok?: boolean;
  event?: Partial<PublicEventConfig> | null;
  matched?: boolean;
  error?: string;
};

/** When developing on the default Next port, resolve the same `public_app_url` row as production. */
const LOCAL_DEV_EVENT_URL = 'https://app.expystudios.ai/';

function resolveEventLookupUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const { hostname, port } = window.location;
  const isDefaultNextDevPort =
    (hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000';
  if (isDefaultNextDevPort) return LOCAL_DEV_EVENT_URL;
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || null;
}

export function useEventConfig() {
  const fallback = useMemo(() => getFallbackEventConfig(), []);
  const [config, setConfig] = useState<PublicEventConfig>(fallback);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const u = new URL('/api/events/current', window.location.origin);
        const lookupUrl = resolveEventLookupUrl();
        if (lookupUrl) u.searchParams.set('url', lookupUrl);
        const resp = await fetch(u.toString(), { cache: 'no-store' });
        const json = (await resp.json().catch(() => ({}))) as ApiResponse;
        if (!resp.ok) {
          throw new Error(json.error || `HTTP ${resp.status}`);
        }
        const merged = mergePublicEventConfig(fallback, json.event ?? null);
        if (!cancelled) setConfig(merged);
      } catch (e: unknown) {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : 'Failed to load event');
          setConfig(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return { config, loading, error: fetchError };
}
