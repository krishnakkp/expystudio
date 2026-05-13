'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EXTRA_POST_IMAGE_CANDIDATES, EXTRA_POST_IMAGES } from '@/lib/extra-post-images';

type ShareSession = {
  id: string;
  caption: string;
  selectedImageUrl: string;
  status: string;
  expiresAt: string;
};

export default function MobileSharePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [session, setSession] = useState<ShareSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedInConnected, setLinkedInConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  const expired = useMemo(() => {
    if (!session) return false;
    return new Date(session.expiresAt).getTime() <= Date.now();
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    void params.then((p) => {
      if (!cancelled) setId(p.id);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(`/api/share-sessions/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(txt || `HTTP ${resp.status}`);
        }
        const data = (await resp.json()) as ShareSession;
        if (!cancelled) setSession(data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refreshLinkedIn = async () => {
    const resp = await fetch('/api/linkedin/status', { cache: 'no-store' });
    const data = await resp.json();
    setLinkedInConnected(Boolean(data?.connected));
  };

  useEffect(() => {
    void refreshLinkedIn();
  }, []);

  const connectLinkedIn = () => {
    if (!id) return;
    window.location.href = `/api/linkedin/auth?redirect=${encodeURIComponent(`/m/share/${id}`)}`;
  };

  const postToLinkedIn = async () => {
    if (!session) return;
    setPosting(true);
    setError(null);
    setPostUrl(null);
    try {
      const assetUrns: string[] = [];

      const urlResp = await fetch(session.selectedImageUrl, { cache: 'no-store' });
      if (!urlResp.ok) throw new Error(`Featured image fetch failed (HTTP ${urlResp.status})`);
      const blob = await urlResp.blob();

      const form = new FormData();
      form.append('image', blob, 'post.png');
      const uploadResp = await fetch('/api/linkedin/upload-image', { method: 'POST', body: form });
      if (!uploadResp.ok) {
        const err = await uploadResp.json().catch(() => ({ error: `HTTP ${uploadResp.status}` }));
        if (err?.reconnectRequired) {
          setLinkedInConnected(false);
          throw new Error('LinkedIn session expired. Please reconnect.');
        }
        throw new Error(err?.error || `Featured upload failed (HTTP ${uploadResp.status})`);
      }
      const { assetUrn: featuredUrn } = await uploadResp.json();
      if (featuredUrn) assetUrns.push(featuredUrn);

      for (let i = 0; i < EXTRA_POST_IMAGES.length; i++) {
        let uploaded = false;
        let lastError = 'HTTP 500';
        const pathCandidates = EXTRA_POST_IMAGE_CANDIDATES[i] ?? [EXTRA_POST_IMAGES[i]];
        for (const publicPath of pathCandidates) {
          const upResp = await fetch('/api/linkedin/upload-public-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicPath }),
          });
          if (!upResp.ok) {
            const err = await upResp.json().catch(() => ({ error: `HTTP ${upResp.status}` }));
            if (err?.reconnectRequired) {
              setLinkedInConnected(false);
              throw new Error('LinkedIn session expired. Please reconnect.');
            }
            lastError = err?.error || `HTTP ${upResp.status}`;
            continue;
          }
          const { assetUrn } = await upResp.json();
          if (assetUrn) assetUrns.push(assetUrn);
          uploaded = true;
          break;
        }
        if (!uploaded) throw new Error(typeof lastError === 'string' ? lastError : 'Extra image upload failed');
      }

      let postResp = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: session.caption, assetUrns }),
      });
      if (!postResp.ok && postResp.status >= 500) {
        await new Promise((r) => setTimeout(r, 1200));
        postResp = await fetch('/api/linkedin/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: session.caption, assetUrns }),
        });
      }
      if (!postResp.ok) {
        const err = await postResp.json().catch(() => ({ error: `HTTP ${postResp.status}` }));
        if (err?.reconnectRequired) {
          setLinkedInConnected(false);
          throw new Error('LinkedIn session expired. Please reconnect.');
        }
        throw new Error(err?.error || `Post failed (HTTP ${postResp.status})`);
      }
      const data = await postResp.json();
      setPostUrl(data?.postUrl ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
      void refreshLinkedIn();
    }
  };

  return (
    <div className="min-h-[100svh] bg-[#F1E1ED] text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Preview & Post</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm your post and publish to LinkedIn from your phone.
          </p>
        </div>

        {!id || loading ? (
          <div className="rounded-2xl border border-border/60 bg-white p-4 text-sm">Loading…</div>
        ) : error ? (
          <div className="rounded-2xl border border-border/60 bg-white p-4 text-sm text-destructive">{error}</div>
        ) : !session ? null : (
          <>
            {expired && (
              <div className="rounded-2xl border border-border/60 bg-white p-4 text-sm text-destructive">
                This QR link has expired. Please regenerate it on the desktop.
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-white overflow-hidden">
              <div className="p-4">
                <p className="text-sm whitespace-pre-line">{session.caption}</p>
              </div>
              <div className="w-full aspect-[16/9] bg-neutral-100">
                <img src={session.selectedImageUrl} alt="Selected" className="w-full h-full object-cover" />
              </div>
            </div>

            {postUrl && (
              <div className="rounded-2xl border border-border/60 bg-white p-4 space-y-3">
                <p className="text-sm font-medium text-center">Posted successfully</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 rounded-xl flex-1"
                    onClick={() => window.open(postUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open in LinkedIn
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl flex-1"
                    onClick={() => {
                      const share = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
                      window.open(share, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Repost on LinkedIn
                  </Button>
                </div>
              </div>
            )}

            {!postUrl && (
              <div className="flex gap-3">
                {!linkedInConnected ? (
                  <Button className="w-full h-11 rounded-xl" onClick={connectLinkedIn} disabled={expired}>
                    Connect LinkedIn
                  </Button>
                ) : (
                  <Button className="w-full h-11 rounded-xl" onClick={postToLinkedIn} disabled={expired || posting}>
                    {posting ? 'Posting…' : 'Post to LinkedIn'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
