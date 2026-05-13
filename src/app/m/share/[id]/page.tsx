'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EXTRA_POST_IMAGE_CANDIDATES, EXTRA_POST_IMAGES } from '@/lib/extra-post-images';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

export default function MobileSharePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (!id || typeof window === 'undefined') return;
    const paramsUrl = new URLSearchParams(window.location.search);
    const linkedin = paramsUrl.get('linkedin');
    if (linkedin === 'connected' || linkedin === 'error') {
      paramsUrl.delete('linkedin');
      const qs = paramsUrl.toString();
      router.replace(qs ? `/m/share/${id}?${qs}` : `/m/share/${id}`);
      if (linkedin === 'connected') {
        toast({ title: 'LinkedIn connected', description: 'You can post when ready.' });
      }
    }
  }, [id, router, toast]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSessionError(null);
      try {
        const r = await fetch(`/api/share-sessions/${id}`, { cache: 'no-store' });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        if (cancelled) return;
        setCaption(String(data?.caption ?? ''));
        setHeroImageUrl(typeof data?.heroImageUrl === 'string' ? data.heroImageUrl : null);
      } catch (e) {
        if (!cancelled) setSessionError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const checkLinkedIn = useCallback(async () => {
    try {
      const resp = await fetch('/api/linkedin/status', { cache: 'no-store' });
      const data = await resp.json();
      setLinkedinConnected(Boolean(data?.connected));
    } catch {
      setLinkedinConnected(false);
    }
  }, []);

  useEffect(() => {
    void checkLinkedIn();
  }, [checkLinkedIn]);

  const connectLinkedIn = useCallback(() => {
    if (!id) return;
    const redirect = `/m/share/${id}`;
    window.location.href = `/api/linkedin/auth?redirect=${encodeURIComponent(redirect)}`;
  }, [id]);

  const postToLinkedIn = useCallback(async () => {
    if (!heroImageUrl || !caption || posting) return;
    if (!linkedinConnected) {
      connectLinkedIn();
      return;
    }
    setPosting(true);
    try {
      const heroBlob = await fetch(heroImageUrl).then((r) => {
        if (!r.ok) throw new Error('Could not load hero image');
        return r.blob();
      });

      const assetUrns: string[] = [];
      const form = new FormData();
      form.append('image', heroBlob, 'selected.jpg');
      const upResp = await fetch('/api/linkedin/upload-image', { method: 'POST', body: form });
      if (!upResp.ok) {
        const j = await upResp.json().catch(() => ({}));
        throw new Error(j?.error || `Upload failed (${upResp.status})`);
      }
      const { assetUrn } = await upResp.json();
      assetUrns.push(assetUrn);

      for (let i = 0; i < EXTRA_POST_IMAGES.length; i++) {
        let uploaded = false;
        let lastError = 'Upload failed';
        const pathCandidates = EXTRA_POST_IMAGE_CANDIDATES[i] ?? [EXTRA_POST_IMAGES[i]];
        for (const publicPath of pathCandidates) {
          const up = await fetch('/api/linkedin/upload-public-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicPath }),
          });
          if (!up.ok) {
            const j = await up.json().catch(() => ({}));
            lastError = j?.error || `HTTP ${up.status}`;
            continue;
          }
          const { assetUrn: u } = await up.json();
          assetUrns.push(u);
          uploaded = true;
          break;
        }
        if (!uploaded) throw new Error(lastError);
      }

      const postPayload = JSON.stringify({ caption, assetUrns });
      let postResp = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postPayload,
      });
      if (!postResp.ok && postResp.status >= 500) {
        await new Promise((r) => setTimeout(r, 1200));
        postResp = await fetch('/api/linkedin/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postPayload,
        });
      }
      if (!postResp.ok) {
        const j = await postResp.json().catch(() => ({}));
        throw new Error(j?.error || `Post failed (${postResp.status})`);
      }
      setPosted(true);
      toast({ title: 'Posted to LinkedIn', description: 'Your post is live.' });
    } catch (e) {
      toast({ title: 'Post failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  }, [heroImageUrl, caption, linkedinConnected, posting, connectLinkedIn, toast]);

  if (!id) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Invalid link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionError || !heroImageUrl) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 text-center">
          <p className="text-sm text-destructive">{sessionError || 'Session unavailable.'}</p>
        </Card>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center p-6 bg-slate-950 text-white">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-700">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center mb-4">
            <Check className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold">Posted</h1>
          <p className="text-sm text-slate-300 mt-2">Your LinkedIn post was published from this phone.</p>
          <Button className="mt-6 w-full" variant="secondary" onClick={() => window.location.assign('https://www.linkedin.com/feed/')}>
            Open LinkedIn
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-slate-950 text-white p-4 flex flex-col gap-4">
      <div className="text-center pt-2">
        <h1 className="text-lg font-semibold">Post to LinkedIn</h1>
        <p className="text-xs text-slate-400 mt-1">Connect your account, then publish.</p>
      </div>

      <Card className="overflow-hidden border-slate-700 bg-white text-black">
        {heroImageUrl && (
          <img src={heroImageUrl} alt="" className="w-full aspect-[16/9] object-cover bg-slate-100" />
        )}
        <div className="p-4">
          <p className="text-sm whitespace-pre-line">{caption}</p>
        </div>
      </Card>

      <div className="flex flex-col gap-2 mt-auto pb-6">
        {!linkedinConnected && (
          <Button type="button" className="w-full h-12" onClick={connectLinkedIn}>
            Connect LinkedIn
          </Button>
        )}
        <Button
          type="button"
          className="w-full h-12"
          disabled={posting || !linkedinConnected}
          onClick={() => void postToLinkedIn()}
        >
          {posting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> Posting…
            </>
          ) : (
            'Publish to my LinkedIn'
          )}
        </Button>
      </div>
    </div>
  );
}
