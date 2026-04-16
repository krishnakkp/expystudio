'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Camera, Upload, Sparkles, Check, ArrowLeft, ArrowRight, Edit3, Download, Share2, X, Image as ImageIcon, AlertCircle, Loader2, Video, VideoOff, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin.png';
import supabase from '@/util/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';

type Step = 'scan' | 'upload' | 'processing' | 'photos' | 'linkedin' | 'complete';
type PhotoStatus = 'idle' | 'processing' | 'done' | 'failed';
type AIProvider = 'chatgpt' | 'gemini';

const LOCAL_BACKGROUNDS = [
  { name: 'Registration Desk', location: 'Entrance Hall', image: '/placeholder-bg.jpg' },
  { name: 'Main Stage', location: 'Auditorium', image: '/placeholder-bg.jpg' },
  { name: 'Exhibition Booth', location: 'Expo Floor', image: '/placeholder-bg.jpg' },
  { name: 'Event Entrance', location: 'Lobby', image: '/placeholder-bg.jpg' },
];

const DEFAULT_CAPTION = `🚀 Thrilled to be at TechSummit 2025!

Amazing sessions on AI innovation and incredible networking opportunities. The future is being built right here!

#TechSummit2025 #Innovation #AI #Networking`;

interface GeneratedPhoto {
  name: string;
  location: string;
  imageUrl: string | null;
  error?: string;
}

function DemoFlowInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('scan');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set([0]));
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [generatedPhotos, setGeneratedPhotos] = useState<GeneratedPhoto[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [photoStatuses, setPhotoStatuses] = useState<PhotoStatus[]>(['idle', 'idle', 'idle', 'idle']);
  const [backgrounds, setBackgrounds] = useState(LOCAL_BACKGROUNDS);
  const [aiProvider, setAiProvider] = useState<AIProvider>('chatgpt');
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinPicture, setLinkedinPicture] = useState<string | null>(null);
  const [linkedinPosting, setLinkedinPosting] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinProgress, setLinkedinProgress] = useState('');
  const [autoPosted, setAutoPosted] = useState(false);
  const [linkedinPostUrl, setLinkedinPostUrl] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<number | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formCompleted, setFormCompleted] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const formIframeLoadCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  const [selfieCamera, setSelfieCamera] = useState(false);
  const { toast } = useToast();

  // QR scanner state
  const [scanning, setScanning] = useState(false);
  const [manualEventId, setManualEventId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);

  /** Extract event_id from a scanned value (full URL or raw UUID). */
  const parseEventId = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    // UUID pattern
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(trimmed)) return trimmed;
    try {
      const url = new URL(trimmed);
      return url.searchParams.get('event_id');
    } catch {
      return null;
    }
  }, []);

  /** Apply a scanned/entered event_id: fetch backgrounds immediately and advance. */
  const applyEventId = useCallback(async (eid: string) => {
    toast({ title: 'Event found', description: `Loading backgrounds for event...` });
    // Update URL for bookmarkability, but don't wait for it
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('event_id', eid);
    router.replace(`?${params.toString()}`, { scroll: false });
    // Fetch backgrounds directly instead of waiting for searchParams to update
    try {
      const { data } = await (supabase as any)
        .from('event_backgrounds')
        .select('name, location_desc, image_url')
        .eq('event_id', eid);
      if (data && data.length > 0) {
        setBackgrounds(data.map((bg: any) => ({ name: bg.name, location: bg.location_desc, image: bg.image_url })));
        setSelectedPhotos(new Set([0]));
        setPhotoStatuses(data.map(() => 'idle' as PhotoStatus));
        setCurrentStep('upload');
      } else {
        toast({ title: 'No backgrounds', description: 'No backgrounds found for this event.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load event backgrounds.', variant: 'destructive' });
    }
  }, [searchParams, router, toast]);

  const startScanning = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Camera error',
        description: window.isSecureContext === false
          ? 'Camera requires HTTPS. Please access this page over a secure connection.'
          : 'Camera is not available on this device or browser.',
        variant: 'destructive',
      });
      return;
    }
    setScanning(true);
  }, [toast]);

  // Actually start the QR reader AFTER React renders the visible video element
  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result) => {
        if (cancelled) return;
        if (result) {
          const eid = parseEventId(result.getText());
          if (eid) {
            scannerControlsRef.current?.stop();
            scannerControlsRef.current = null;
            setScanning(false);
            applyEventId(eid);
          }
        }
      },
    ).then((controls) => {
      if (cancelled) { controls.stop(); return; }
      scannerControlsRef.current = controls;
    }).catch((err: any) => {
      if (cancelled) return;
      setScanning(false);
      toast({
        title: 'Camera error',
        description: err.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : err.message || 'Could not start camera',
        variant: 'destructive',
      });
    });
    return () => { cancelled = true; scannerControlsRef.current?.stop(); scannerControlsRef.current = null; };
  }, [scanning, parseEventId, applyEventId, toast]);

  const stopScanning = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanning(false);
  }, []);

  const handleManualSubmit = useCallback(() => {
    const eid = parseEventId(manualEventId);
    if (eid) {
      applyEventId(eid);
    } else {
      toast({ title: 'Invalid input', description: 'Please enter a valid event URL or event ID.', variant: 'destructive' });
    }
  }, [manualEventId, parseEventId, applyEventId, toast]);

  // Stop scanner on unmount or step change away from scan
  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, []);

  // Check LinkedIn connection status on mount and whenever the tab regains focus
  // (user completes OAuth in a new tab and returns here)
  useEffect(() => {
    const check = async () => {
      try {
        const resp = await fetch('/api/linkedin/status');
        const { connected, name, picture } = await resp.json();
        setLinkedinConnected(connected);
        if (name) setLinkedinName(name);
        if (picture) setLinkedinPicture(picture);
      } catch {
        setLinkedinConnected(false);
      }
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  // On initial load, if ?event_id= is already in the URL, load backgrounds
  useEffect(() => {
    const eventId = searchParams?.get('event_id');
    if (!eventId || currentStep !== 'scan') return;
    (supabase as any)
      .from('event_backgrounds')
      .select('name, location_desc, image_url')
      .eq('event_id', eventId)
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          setBackgrounds(data.map((bg: any) => ({ name: bg.name, location: bg.location_desc, image: bg.image_url })));
          setSelectedPhotos(new Set([0]));
          setPhotoStatuses(data.map(() => 'idle' as PhotoStatus));
          setCurrentStep('upload');
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance to photos only when BOTH generation and form are complete
  useEffect(() => {
    if (generationDone && formCompleted && currentStep === 'processing') {
      setCurrentStep('photos');
    }
  }, [generationDone, formCompleted, currentStep]);

  const stepIndex = ['scan', 'upload', 'processing', 'photos', 'linkedin', 'complete'].indexOf(currentStep);
  const progress = (stepIndex / 5) * 100;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelfie(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // ── Selfie camera (webcam) helpers ─────────────────────────────────────────
  const stopSelfieCamera = useCallback(() => {
    selfieStreamRef.current?.getTracks().forEach(t => t.stop());
    selfieStreamRef.current = null;
    setSelfieCamera(false);
  }, []);

  const startSelfieCamera = useCallback(async () => {
    // On mobile, just use the native capture input
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      selfieStreamRef.current = stream;
      setSelfieCamera(true);
      // Attach stream after React renders the video element
      requestAnimationFrame(() => {
        if (selfieVideoRef.current) {
          selfieVideoRef.current.srcObject = stream;
        }
      });
    } catch {
      toast({ title: 'Camera error', description: 'Could not access camera. Please allow camera permissions or upload a photo instead.', variant: 'destructive' });
    }
  }, [toast]);

  const captureSelfie = useCallback(() => {
    const video = selfieVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    // Mirror the image so it looks natural (like a selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setSelfie(canvas.toDataURL('image/jpeg', 0.9));
    stopSelfieCamera();
  }, [stopSelfieCamera]);

  // Clean up camera on unmount or step change
  useEffect(() => {
    return () => {
      selfieStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Prompt──────────────────────
  const buildEditPrompt = (venueName: string, venueLocation: string): string =>
    `Take this person's face from the selfie and place them naturally into a professional event photo looking towards the camera at the "${venueName}" area (${venueLocation}) of a tech conference. The person should look like they're actually at the event, with realistic lighting and perspective. Make it look like a candid professional event photo suitable for LinkedIn. High quality, photorealistic but taken on a phone camera.`;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Convert a data URL or plain base64 string to a Blob. */
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.startsWith('data:')
      ? dataUrl.split(',')
      : ['data:image/jpeg;base64', dataUrl];
    const mimeType = header.replace('data:', '').replace(';base64', '');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
  };

  /** Fetch an image URL and return it as a Blob. */
  const fetchLocalImageAsBlob = async (url: string): Promise<Blob> => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load background image: ${resp.status}`);
    return resp.blob();
  };

  const generateCompositeImage = async (
    selfieBlob: Blob,
    backgroundBlob: Blob,
    prompt: string,
    bgName: string,
  ): Promise<string> => {
    const buildForm = () => {
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('image[]', selfieBlob, 'selfie.jpg');
      form.append('image[]', backgroundBlob, 'background.jpg');
      if (aiProvider === 'chatgpt') {
        form.append('model', 'gpt-image-1.5');
        form.append('n', '1');
        form.append('size', '1536x1024');
        form.append('quality', 'high');
      }
      return form;
    };

    const endpoint = aiProvider === 'gemini' ? '/api/generate-image-gemini' : '/api/generate-image';
    const providerLabel = aiProvider === 'gemini' ? 'Gemini' : 'ChatGPT';

    let resp = await fetch(endpoint, {
      method: 'POST',
      body: buildForm(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`${providerLabel} error (${resp.status}) for "${bgName}": ${errText}`);
    }

    const data = await resp.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error(`No image returned from ${providerLabel} for "${bgName}"`);
    return `data:image/png;base64,${b64}`;
  };

  // ── Main generation function ───────────────────────────────────────────────
  const generatePhotos = async () => {
    setCurrentStep('processing');
    setGenerationError(null);
    setGenerationDone(false);
    setFormCompleted(false);
    formIframeLoadCount.current = 0;
    setPhotoStatuses(['idle', 'idle', 'idle', 'idle']);

    try {
      if (!selfie) throw new Error('No selfie uploaded');

      // Prepare the selfie blob once — reused across all backgrounds
      const selfieBlob = dataUrlToBlob(selfie);

      // Mark all slots as processing simultaneously
      setPhotoStatuses(['processing', 'processing', 'processing', 'processing']);

      // Generate all composites in parallel
      const results = await Promise.allSettled(
        backgrounds.map(async (bg, i) => {
          console.log(`Generating composite for "${bg.name}"…`);
          const backgroundBlob = await fetchLocalImageAsBlob(bg.image);
          const prompt = buildEditPrompt(bg.name, bg.location);
          const compositeDataUrl = await generateCompositeImage(selfieBlob, backgroundBlob, prompt, bg.name);
          setPhotoStatuses(prev => prev.map((s, idx) => idx === i ? 'done' : s));
          return { name: bg.name, location: bg.location, imageUrl: compositeDataUrl };
        })
      );

      const photos: GeneratedPhoto[] = results.map((result, i) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const err = result.reason as Error;
          console.error(`Failed for "${backgrounds[i].name}":`, err.message);
          setPhotoStatuses(prev => prev.map((s, idx) => idx === i ? 'failed' : s));
          return { name: backgrounds[i].name, location: backgrounds[i].location, imageUrl: null, error: err.message };
        }
      });

      setGeneratedPhotos(photos);

      const successIndices = new Set<number>();
      photos.forEach((p, i) => { if (p.imageUrl) successIndices.add(i); });

      if (successIndices.size === 0) {
        throw new Error('All image generations failed. See console for details.');
      }

      // Default to the first successfully generated photo
      const firstSuccess = successIndices.values().next().value as number;
      setSelectedPhotos(new Set([firstSuccess]));
      setGenerationDone(true);
    } catch (err: any) {
      console.error('Photo generation error:', err);
      setGenerationError(err.message || 'Something went wrong');
      setGeneratedPhotos([]);
      setSelectedPhotos(new Set([0]));
      setGenerationDone(true);
      toast({
        title: 'AI generation issue',
        description: 'Using placeholder photos instead. ' + (err.message || ''),
        variant: 'destructive',
      });
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['scan', 'upload', 'processing', 'photos', 'linkedin', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      if (steps[currentIndex + 1] === 'processing') {
        generatePhotos();
      } else {
        setCurrentStep(steps[currentIndex + 1]);
      }
    }
  };

  const handleApproveAndPost = async () => {
    if (linkedinConnected) {
      setLinkedinPosting(true);
      setLinkedinError(null);
      setLinkedinProgress('');
      try {
        const postImages = getPostImages();

        // Upload each image one-at-a-time as binary (avoids large JSON payloads)
        const assetUrns: string[] = [];
        for (let n = 0; n < postImages.length; n++) {
          setLinkedinProgress(`Uploading photo ${n + 1} of ${postImages.length}…`);
          const imgSrc = postImages[n].src;
          // AI-generated images are data URLs; background images are regular URLs
          const blob = imgSrc.startsWith('data:')
            ? dataUrlToBlob(imgSrc)
            : await fetchLocalImageAsBlob(imgSrc);
          const form = new FormData();
          form.append('image', blob, `photo-${n}.png`);
          const uploadResp = await fetch('/api/linkedin/upload-image', { method: 'POST', body: form });
          if (!uploadResp.ok) {
            const { error, reconnectRequired } = await uploadResp
              .json()
              .catch(() => ({ error: `HTTP ${uploadResp.status}`, reconnectRequired: false }));
            if (reconnectRequired) {
              setLinkedinConnected(false);
              throw new Error('Your LinkedIn session was revoked. Please reconnect and try again.');
            }
            throw new Error(`Image upload failed: ${error}`);
          }
          const { assetUrn } = await uploadResp.json();
          assetUrns.push(assetUrn);
        }

        // Create the post with caption + uploaded asset URNs
        setLinkedinProgress('Creating post…');
        const postResp = await fetch('/api/linkedin/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption, assetUrns }),
        });
        if (!postResp.ok) {
          const { error, reconnectRequired } = await postResp
            .json()
            .catch(() => ({ error: `HTTP ${postResp.status}`, reconnectRequired: false }));
          if (reconnectRequired) {
            setLinkedinConnected(false);
            throw new Error('Your LinkedIn session was revoked. Please reconnect and try again.');
          }
          throw new Error(error);
        }

        const postResult = await postResp.json();
        if (postResult.postUrl) {
          setLinkedinPostUrl(postResult.postUrl);
        }

        setAutoPosted(true);
        setCurrentStep('complete');
      } catch (err: any) {
        setLinkedinError(err.message);
      } finally {
        setLinkedinPosting(false);
        setLinkedinProgress('');
      }
    } else {
      // Not connected — copy caption and open LinkedIn manually
      setAutoPosted(false);
      setCurrentStep('complete');
      navigator.clipboard.writeText(caption).catch(() => {});
      setTimeout(() => window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank'), 1800);
    }
  };

  const togglePhoto = (index: number) => {
    // Single-select: user picks exactly one AI-generated photo
    setSelectedPhotos(new Set([index]));
  };

  const getPhotoSrc = (index: number): string => {
    const generated = generatedPhotos[index];
    if (generated?.imageUrl) return generated.imageUrl;
    return backgrounds[index].image;
  };

  /** Build the final ordered list of images for the LinkedIn post:
   *  selected AI-generated photo first, then raw backgrounds for the rest. */
  const getPostImages = (): { src: string; name: string }[] => {
    const selectedIndex = selectedPhotos.values().next().value as number;
    const images: { src: string; name: string }[] = [];
    // Add the selected AI photo first
    images.push({ src: getPhotoSrc(selectedIndex), name: backgrounds[selectedIndex].name });
    // Add the remaining backgrounds (raw, without AI merge)
    backgrounds.forEach((bg, i) => {
      if (i !== selectedIndex) {
        images.push({ src: bg.image, name: bg.name });
      }
    });
    return images;
  };

  const downloadPhotos = () => {
    selectedPhotos.forEach((index) => {
      const bg = backgrounds[index];
      const src = getPhotoSrc(index);
      const link = document.createElement('a');
      link.href = src;
      link.download = `eventsnap-${bg.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      link.click();
    });
  };

  const downloadSinglePhoto = (index: number) => {
    const bg = backgrounds[index];
    const src = getPhotoSrc(index);
    const link = document.createElement('a');
    link.href = src;
    link.download = `eventsnap-${bg.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    link.click();
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
  };

  const resetDemo = () => {
    setCurrentStep('scan');
    setSelfie(null);
    setSelectedPhotos(new Set([0]));
    setCaption(DEFAULT_CAPTION);
    setIsEditingCaption(false);
    setGeneratedPhotos([]);
    setGenerationError(null);
    setPhotoStatuses(['idle', 'idle', 'idle', 'idle']);
    setAutoPosted(false);
    setLinkedinPostUrl(null);
    setLinkedinError(null);
    setViewingPhoto(null);
    setAgreedToTerms(false);
    setFormCompleted(false);
    setGenerationDone(false);
    formIframeLoadCount.current = 0;
    stopSelfieCamera();
  };

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/30" id="demo">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Interactive Demo
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Try It Yourself
          </h2>
          <p className="text-xl text-muted-foreground">
            Experience the complete flow from scan to share
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Scan</span>
            <span>Upload</span>
            <span>AI Magic</span>
            <span>Photos</span>
            <span>LinkedIn</span>
            <span>Done</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Main content area */}
        <div className="bg-card rounded-3xl shadow-card border border-border overflow-hidden min-h-[500px]">
          <AnimatePresence mode="wait">
            {/* Step 1: QR Scan */}
            {currentStep === 'scan' && (
              <motion.div
                key="scan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 flex flex-col items-center justify-center min-h-[500px]"
              >
                {/* Single video element — always in the DOM so the ref is stable */}
                <div className={scanning
                  ? 'w-64 h-64 rounded-3xl overflow-hidden border-4 border-accent/50 mb-6 relative bg-black'
                  : 'w-0 h-0 overflow-hidden absolute'
                }>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  {scanning && (
                    <motion.div
                      className="absolute inset-0 border-4 border-accent rounded-3xl pointer-events-none"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                {scanning ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">Point your camera at the event QR code</p>
                    <Button variant="heroOutline" size="lg" onClick={stopScanning} className="gap-2">
                      <VideoOff className="w-5 h-5" /> Stop Scanning
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-48 rounded-3xl border-4 border-dashed border-accent/50 flex items-center justify-center mb-8 relative">
                      <QrCode className="w-24 h-24 text-accent" />
                      <motion.div
                        className="absolute inset-0 border-4 border-accent rounded-3xl"
                        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Scan QR Code</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      At the event, scan the QR code placed at registration, stage, booths, or entrance
                    </p>
                    <Button variant="hero" size="lg" onClick={startScanning} className="gap-2 mb-6">
                      <Video className="w-5 h-5" /> Start Camera Scan
                    </Button>

                    {/* Manual event ID fallback */}
                    <div className="w-full max-w-sm">
                      <p className="text-xs text-muted-foreground text-center mb-2">Or enter event ID / URL manually</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Event ID or URL"
                          value={manualEventId}
                          onChange={(e) => setManualEventId(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                          className="bg-background text-sm"
                        />
                        <Button variant="outline" size="sm" onClick={handleManualSubmit}>
                          Go
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Upload Selfie */}
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 flex flex-col items-center justify-center min-h-[500px]"
              >
                {!agreedToTerms ? (
                  <>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Terms and Conditions</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      Please review and accept our terms before uploading your photo.
                    </p>

                    <div className="w-full max-w-md bg-secondary/50 rounded-2xl border border-border/50 p-5 mb-6 max-h-60 overflow-y-auto text-sm text-muted-foreground leading-relaxed space-y-3">
                      <p>By using EventSnap, you agree that your uploaded photos will be processed using AI to generate event images. You retain ownership of your original photos and grant EventSnap a non-exclusive license to process them for service delivery.</p>
                      <p>AI-generated content may not always be unique. You are responsible for any content posted to LinkedIn through EventSnap.</p>
                      <p>Post engagement data may be shared with event organizers. Your personal data is handled per our Privacy Policy.</p>
                    </div>

                    <label className="flex items-start gap-2.5 mb-6 max-w-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border accent-accent shrink-0"
                      />
                      <span className="text-sm text-muted-foreground leading-snug">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-accent hover:underline font-medium">
                          Terms and Conditions
                        </a>{' '}
                        and consent to my photo being processed by AI.
                      </span>
                    </label>

                    <div className="flex gap-4">
                      <Button variant="heroOutline" size="lg" onClick={() => setCurrentStep('scan')}>
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {selfieCamera ? (
                      <div className="flex flex-col items-center mb-8">
                        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-accent/50 mb-4 bg-black relative">
                          <video
                            ref={selfieVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button variant="heroOutline" size="lg" onClick={stopSelfieCamera}>
                            <X className="w-5 h-5 mr-2" /> Cancel
                          </Button>
                          <Button variant="hero" size="lg" onClick={captureSelfie}>
                            <Camera className="w-5 h-5 mr-2" /> Capture
                          </Button>
                        </div>
                      </div>
                    ) : selfie ? (
                      <div
                        className="w-64 h-64 rounded-full bg-secondary border-4 border-accent/50 flex items-center justify-center mb-8 overflow-hidden"
                      >
                        <img src={selfie} alt="Your selfie" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex gap-6 mb-8">
                        <button
                          onClick={startSelfieCamera}
                          className="w-40 h-40 rounded-2xl bg-secondary border-4 border-dashed border-accent/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors"
                        >
                          <Camera className="w-12 h-12 text-accent mb-3" />
                          <span className="text-sm font-medium text-muted-foreground">Take Photo</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-40 h-40 rounded-2xl bg-secondary border-4 border-dashed border-accent/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors"
                        >
                          <Upload className="w-12 h-12 text-accent mb-3" />
                          <span className="text-sm font-medium text-muted-foreground">Upload Photo</span>
                        </button>
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {selfie ? 'Looking Good!' : 'Add Your Photo'}
                    </h3>
                    <p className="text-muted-foreground text-center mb-8 max-w-md">
                      {selfie
                        ? 'Your photo is ready. Choose an AI engine and continue.'
                        : 'Take a selfie with your camera or upload an existing photo.'}
                    </p>

                    {/* AI Provider Selector */}
                    <div className="flex items-center gap-3 mb-8">
                      <span className="text-sm font-medium text-muted-foreground">AI Engine:</span>
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => setAiProvider('chatgpt')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            aiProvider === 'chatgpt'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                          ChatGPT
                        </button>
                        <button
                          onClick={() => setAiProvider('gemini')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            aiProvider === 'gemini'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                          Gemini
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button variant="heroOutline" size="lg" onClick={() => { stopSelfieCamera(); setCurrentStep('scan'); }}>
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                      </Button>
                      {selfie && (
                        <Button variant="hero" size="lg" onClick={nextStep}>
                          Continue <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {selfie && (
                  <button
                    onClick={() => setSelfie(null)}
                    className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove & retake
                  </button>
                )}
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {currentStep === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 md:p-8 min-h-[500px]"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-1">AI Magic in Progress</h3>
                  <p className="text-sm text-muted-foreground">While your photos generate, tell us a bit about yourself!</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left: Generation progress */}
                  <div className="md:w-1/3 flex flex-col items-center">
                    {/* Spinning orb */}
                    <div className="relative mb-4">
                      <motion.div
                        className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-8 h-8 text-accent-foreground" />
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-accent/30"
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>

                    {/* Per-image status list */}
                    <div className="w-full space-y-2">
                      {backgrounds.map((bg, i) => {
                        const status = photoStatuses[i];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border transition-colors duration-300 ${status === 'processing'
                              ? 'border-accent/60 bg-accent/10'
                              : status === 'done'
                                ? 'border-green-500/40 bg-green-500/10'
                                : status === 'failed'
                                  ? 'border-destructive/40 bg-destructive/10'
                                  : 'border-border bg-secondary/30'
                              }`}
                          >
                            <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                              {status === 'processing' && (
                                <motion.div
                                  className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                />
                              )}
                              {status === 'done' && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.4 }}>
                                  <Check className="w-4 h-4 text-green-500" />
                                </motion.div>
                              )}
                              {status === 'failed' && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                </motion.div>
                              )}
                              {status === 'idle' && <div className="w-4 h-4 rounded-full border-2 border-border" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${status === 'processing' ? 'text-accent'
                                : status === 'done' ? 'text-green-400'
                                  : status === 'failed' ? 'text-destructive'
                                    : 'text-muted-foreground'
                                }`}>{bg.name}</p>
                            </div>
                            <span className={`text-[10px] font-medium shrink-0 ${status === 'processing' ? 'text-accent'
                              : status === 'done' ? 'text-green-400'
                                : status === 'failed' ? 'text-destructive'
                                  : 'text-muted-foreground/50'
                              }`}>
                              {status === 'idle' && 'Waiting'}
                              {status === 'processing' && 'Generating…'}
                              {status === 'done' && 'Done'}
                              {status === 'failed' && 'Failed'}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {selfie && (
                      <div className="mt-4 flex items-center gap-2">
                        <img src={selfie} alt="Processing" className="w-7 h-7 rounded-full object-cover border-2 border-accent" />
                        <span className="text-[10px] text-muted-foreground">Using your selfie</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Google Form */}
                  <div className="md:w-2/3 rounded-2xl overflow-hidden border border-border/50 bg-white">
                    {formCompleted ? (
                      <div className="flex flex-col items-center justify-center h-[450px] bg-secondary/30 px-6">
                        <Check className="w-12 h-12 text-green-500 mb-3" />
                        <p className="text-lg font-semibold text-foreground">Thanks for filling out the form!</p>
                        {!generationDone && (
                          <p className="text-sm text-muted-foreground mt-1">Waiting for photos to finish generating…</p>
                        )}
                      </div>
                    ) : (
                      <iframe
                        src="https://docs.google.com/forms/d/e/1FAIpQLSf1tnzsIK2brWBAJiL_6of85qqYz7_rVYuCSn3Z0F5TGSu3zg/viewform?embedded=true"
                        width="100%"
                        height="450"
                        className="border-0"
                        title="Event Survey"
                        loading="eager"
                        onLoad={() => {
                          // First load = form rendered, second load = form submitted (confirmation page)
                          formIframeLoadCount.current += 1;
                          if (formIframeLoadCount.current >= 2) {
                            setFormCompleted(true);
                          }
                        }}
                      >
                        Loading…
                      </iframe>
                    )}
                  </div>
                </div>

                {/* Waiting message when generation done but form not filled */}
                {generationDone && !formCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center px-4 py-3 rounded-xl bg-accent/10 border border-accent/30"
                  >
                    <p className="text-sm font-medium text-accent">
                      Your photos are ready! Please complete the form to view them.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 4: Photos Generated */}
            {currentStep === 'photos' && (
              <motion.div
                key="photos"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 min-h-[500px]"
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {generatedPhotos.some(p => p.imageUrl) ? 'Your AI-Generated Event Photos' : 'Your Event Photos'}
                  </h3>
                  <p className="text-muted-foreground">
                    Choose one AI-generated photo — the other event backgrounds will be included as-is
                  </p>
                  {generationError && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      <span>AI generation had issues — showing placeholders for failed photos</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {backgrounds.map((bg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.15 }}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 ${selectedPhotos.has(i) ? 'ring-4 ring-accent shadow-lg' : 'opacity-60 hover:opacity-90'
                        }`}
                      onClick={() => togglePhoto(i)}
                    >
                      <img src={getPhotoSrc(i)} alt={bg.name} className="w-full h-full object-cover" />
                      {/* Show selfie overlay only when using fallback static images */}
                      {selfie && !generatedPhotos[i]?.imageUrl && (
                        <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full overflow-hidden border-2 border-card shadow-md">
                          <img src={selfie} alt="You" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 right-2 text-right">
                        <span className="text-xs font-semibold text-white drop-shadow">{bg.name}</span>
                      </div>
                      {generatedPhotos[i]?.imageUrl && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent/80 text-accent-foreground text-[10px] font-semibold">
                          AI Generated
                        </div>
                      )}
                      {/* Action buttons — expand & download */}
                      <div className="absolute bottom-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewingPhoto(i); }}
                          className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                          title="View full size"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadSinglePhoto(i); }}
                          className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${selectedPhotos.has(i) ? 'bg-accent text-accent-foreground' : 'bg-card/70 text-muted-foreground'
                        }`}>
                        <Check className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="heroOutline" size="lg" onClick={() => setCurrentStep('upload')}>
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={nextStep}
                    disabled={selectedPhotos.size === 0}
                  >
                    Create LinkedIn Post <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: LinkedIn Post */}
            {currentStep === 'linkedin' && (
              <motion.div
                key="linkedin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 min-h-[500px]"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Review Your Post</h3>
                  <p className="text-muted-foreground">Edit the caption before publishing</p>
                </div>

                {/* LinkedIn connection status */}
                <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2">
                    <img src={linkedinIcon.src} alt="LinkedIn" className="w-4 h-4" />
                    <span className="text-sm font-medium">LinkedIn Account</span>
                  </div>
                  {linkedinConnected === null ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking…
                    </span>
                  ) : linkedinConnected ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => window.open('/api/linkedin/auth', '_blank')}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Connect LinkedIn →
                    </button>
                  )}
                </div>

                <div className="bg-secondary/50 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center gradient-accent text-accent-foreground font-bold text-sm">
                      {linkedinPicture ? (
                        <img src={linkedinPicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : selfie ? (
                        <img src={selfie} alt="You" className="w-full h-full object-cover" />
                      ) : (
                        'YN'
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground text-sm">{linkedinName || 'Your Name'}</span>
                      <p className="text-xs text-muted-foreground">Posting to LinkedIn</p>
                    </div>
                    <button
                      onClick={() => setIsEditingCaption(!isEditingCaption)}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      <Edit3 className={`w-5 h-5 ${isEditingCaption ? 'text-accent' : 'text-muted-foreground'}`} />
                    </button>
                  </div>

                  {isEditingCaption ? (
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full bg-card rounded-xl p-4 text-sm text-foreground min-h-[140px] border border-accent/30 focus:border-accent focus:outline-none resize-none"
                      autoFocus
                    />
                  ) : (
                    <div className="bg-card rounded-xl p-4 text-sm text-foreground whitespace-pre-line">
                      {caption}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {getPostImages().map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
                        <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-accent/80 text-accent-foreground text-[9px] font-semibold">
                            AI
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => setViewingPhoto(i)}
                            className="p-1.5 rounded-full bg-white/90 text-black hover:bg-white transition-colors"
                            title="View full size"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = img.src;
                              link.download = `eventsnap-${img.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
                              link.click();
                            }}
                            className="p-1.5 rounded-full bg-white/90 text-black hover:bg-white transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex justify-center gap-4">
                    <Button variant="heroOutline" size="lg" onClick={() => { setLinkedinError(null); setCurrentStep('photos'); }}>
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </Button>
                    {linkedinConnected && (
                      <Button variant="hero" size="lg" onClick={handleApproveAndPost} disabled={linkedinPosting}>
                        {linkedinPosting ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {linkedinProgress || 'Posting…'}</>
                        ) : (
                          <><img src={linkedinIcon.src} alt="LinkedIn" className="w-5 h-5 mr-2" /> Approve & Post</>
                        )}
                      </Button>
                    )}
                  </div>
                  {!linkedinConnected && linkedinConnected !== null && (
                    <p className="text-sm text-muted-foreground">
                      Connect your LinkedIn account above to post.
                    </p>
                  )}
                  {linkedinError && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center max-w-sm">
                      {linkedinError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 6: Complete */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-8 flex flex-col items-center justify-center min-h-[500px]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center mb-8"
                >
                  <Check className="w-12 h-12 text-accent-foreground" />
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Post Curated! 🎉</h3>
                {autoPosted ? (
                  <p className="text-muted-foreground text-center mb-8 max-w-md">
                    Your post has been published to LinkedIn with your selected photos.
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground text-center mb-2 max-w-md">
                      Your caption has been copied to clipboard. LinkedIn is opening so you can paste and post!
                    </p>
                    <p className="text-xs text-muted-foreground text-center mb-8 max-w-md">
                      Just paste (Ctrl+V / ⌘+V) your caption into the LinkedIn post box and attach your downloaded photos.
                    </p>
                  </>
                )}

                <div className="flex gap-4 mb-4">
                  <Button variant="soft" size="lg" onClick={downloadPhotos}>
                    <Download className="w-5 h-5 mr-2" /> Download Photos
                  </Button>
                  {autoPosted && linkedinPostUrl ? (
                    <Button variant="soft" size="lg" onClick={() => window.open(linkedinPostUrl!, '_blank')}>
                      <img src={linkedinIcon.src} alt="LinkedIn" className="w-5 h-5 mr-2" /> View Post
                    </Button>
                  ) : (
                    <Button variant="soft" size="lg" onClick={() => window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')}>
                      <img src={linkedinIcon.src} alt="LinkedIn" className="w-5 h-5 mr-2" /> Open LinkedIn
                    </Button>
                  )}
                </div>

                <Button variant="heroOutline" onClick={resetDemo}>
                  Try Demo Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox image viewer */}
      <AnimatePresence>
        {viewingPhoto !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setViewingPhoto(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev button */}
            {viewingPhoto > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setViewingPhoto(viewingPhoto - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next button */}
            {viewingPhoto < backgrounds.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setViewingPhoto(viewingPhoto + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={viewingPhoto}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={getPhotoSrc(viewingPhoto)}
              alt={backgrounds[viewingPhoto]?.name}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Bottom bar */}
            <div
              className="absolute bottom-6 flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white text-sm font-medium">
                {backgrounds[viewingPhoto]?.name}
              </span>
              <button
                onClick={() => downloadSinglePhoto(viewingPhoto!)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Wrap with Suspense because useSearchParams() requires it in Next.js App Router
export function DemoFlow() {
  return (
    <Suspense fallback={null}>
      <DemoFlowInner />
    </Suspense>
  );
}
