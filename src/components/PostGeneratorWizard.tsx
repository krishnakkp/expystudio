'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Copy,
  Download,
  Loader2,
  Star,
  Upload,
  X,
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type Rating = 0 | 1 | 2 | 3 | 4 | 5;

type GeneratedImage = {
  dataUrl: string | null;
  error?: string;
};

const SURVEY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: 'Overall, how satisfied were you with the event?' },
  { id: 'q2', label: 'How would you rate the quality of content/sessions?' },
  { id: 'q3', label: 'How satisfied were you with the event experience (venue, flow, hospitality)?' },
  { id: 'q4', label: 'How likely are you to attend or recommend our future events?' },
  { id: 'q5', label: 'Did the event meet your expectations?' },
];

const CAPTION_OPTIONS: string[] = [
  `Building faster. Operating smarter.\n\nThat’s what Ansible Automation is enabling today.\n\n#Ansible #RedHat #DevOps #CloudAutomation #RedHat #AnsibleAutomation #RedHatAnsible2026`,
  `What stood out at Red Hat Ansible Automation 2026 wasn’t just the technology—it was the measurable business impact.\n\nAutomation is no longer just an engineering win—it’s a boardroom conversation.\n\n#RedHat #AnsibleAutomation #RedHatAnsibleAutomation2026 #RedHatAnsible2026`,
  `From complexity to clarity—powered by automation.\n\nGreat conversations and real use cases at Red Hat Ansible Automation 2026.\n\n#RedHat #AnsibleAutomation #RedHatAnsibleAutomation2026`,
  `Automation at scale. Simplicity in action.\n\nThat’s the core theme at Red Hat Ansible Automation 2026—and it’s powerful to see it come alive.\n\n#RedHat #Ansible #Automation #RedHatAnsibleAutomation2026`,
];

const EXTRA_POST_IMAGES = ['/red-hat/1.jpg', '/red-hat/2.jpg', '/red-hat/3.jpg'] as const;
const WIZARD_STORAGE_KEY = 'eventstudio_postwizard_resume_step';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

function extractGeminiMessage(errText: string) {
  // Gemini REST often returns JSON with { error: { message } }.
  try {
    const parsed = JSON.parse(errText);
    const msg =
      (typeof parsed?.error === 'string' ? parsed.error : undefined) ||
      parsed?.error?.message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  } catch {
    // ignore
  }
  return errText;
}

function stripDataUrlPrefix(dataUrlOrB64: string) {
  if (dataUrlOrB64.startsWith('data:')) return dataUrlOrB64.split(',')[1] ?? '';
  return dataUrlOrB64;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mimeType = header.replace('data:', '').replace(';base64', '') || 'image/jpeg';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

async function downloadUrl(url: string, filename: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download: ${resp.status}`);
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImage(dataUrl: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function generateLocalVariants(selfie: string): Promise<string[]> {
  const img = await loadImage(selfie);
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  const draw = (filter: string) => {
    ctx.clearRect(0, 0, size, size);
    ctx.filter = filter;
    // cover crop into square
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  return [
    draw('contrast(1.1) saturate(1.05)'),
    draw('brightness(1.05) contrast(1.2) saturate(1.15)'),
    draw('grayscale(1) contrast(1.15)'),
    draw('sepia(0.35) contrast(1.1) saturate(1.1)'),
  ];
}

async function normalizeToJpeg(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const maxSide = 1536;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function copyToClipboard(text: string) {
  // Clipboard API requires secure context on most mobile browsers.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback: execCommand copy
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'true');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('Copy not permitted');
}

export function PostGeneratorWizard() {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const progressValue = useMemo(() => Math.round(((step - 1) / 6) * 100), [step]);

  // Step 1
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Step 2
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  const [selfieCamera, setSelfieCamera] = useState(false);

  // Step 3
  const [survey, setSurvey] = useState<Record<string, Rating>>(() =>
    Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, 0])) as Record<string, Rating>
  );
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');

  // Step 4
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([
    { dataUrl: null },
    { dataUrl: null },
    { dataUrl: null },
    { dataUrl: null },
  ]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Step 5
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState<number | null>(null);
  const selectedCaption = selectedCaptionIndex === null ? '' : CAPTION_OPTIONS[selectedCaptionIndex];

  // LinkedIn
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinPicture, setLinkedinPicture] = useState<string | null>(null);
  const [linkedinPosting, setLinkedinPosting] = useState(false);
  const [linkedinProgress, setLinkedinProgress] = useState('');
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinPostUrl, setLinkedinPostUrl] = useState<string | null>(null);

  // Resume after LinkedIn OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedin = params.get('linkedin');
    const resumeTo = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (linkedin === 'connected' && resumeTo) {
      const nextStep = Number(resumeTo);
      if (nextStep >= 1 && nextStep <= 7) {
        setConsentAccepted(true);
        setStep(nextStep as Step);
      }
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    }

    if (linkedin === 'connected' || linkedin === 'error') {
      // Clean URL
      params.delete('linkedin');
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      if (linkedin === 'connected') {
        toast({ title: 'LinkedIn connected', description: 'You can continue the flow.' });
      } else {
        toast({ title: 'LinkedIn connection failed', description: 'Please try connecting again.', variant: 'destructive' });
      }
    }
  }, [toast]);

  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      // Normalize phone formats (e.g., HEIC) to JPEG for AI providers.
      const normalized = await normalizeToJpeg(dataUrl);
      setSelfieDataUrl(normalized);
    } catch (err: unknown) {
      toast({ title: 'Upload failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      // allow selecting the same file again after "retake"
      e.target.value = '';
    }
  }, [toast]);

  const canGoStep1 = consentAccepted;
  const canGoStep2 = Boolean(selfieDataUrl);
  const surveyComplete = SURVEY_QUESTIONS.every((q) => (survey[q.id] ?? 0) > 0);
  const canGoStep3 = surveyComplete && fullName.trim().length > 0 && companyName.trim().length > 0 && isValidEmail(email);
  const canGoStep4 = selectedImageIndex !== null && generatedImages[selectedImageIndex]?.dataUrl;
  const canGoStep5 = selectedCaptionIndex !== null;

  const goNext = useCallback(() => {
    setStep((s) => (s < 6 ? ((s + 1) as Step) : s));
  }, []);
  const goBack = useCallback(() => {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }, []);

  const startOver = useCallback(() => {
    setStep(1);
    setConsentAccepted(false);
    setSelfieDataUrl(null);
    setSurvey(Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, 0])) as Record<string, Rating>);
    setFullName('');
    setCompanyName('');
    setEmail('');
    setIsGenerating(false);
    setGeneratedImages([{ dataUrl: null }, { dataUrl: null }, { dataUrl: null }, { dataUrl: null }]);
    setSelectedImageIndex(null);
    setSelectedCaptionIndex(null);
    selfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    selfieStreamRef.current = null;
    setSelfieCamera(false);
    setLinkedinConnected(null);
    setLinkedinName(null);
    setLinkedinPicture(null);
    setLinkedinPosting(false);
    setLinkedinProgress('');
    setLinkedinError(null);
    setLinkedinPostUrl(null);
  }, []);

  const stopSelfieCamera = useCallback(() => {
    selfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    selfieStreamRef.current = null;
    setSelfieCamera(false);
  }, []);

  const startSelfieCamera = useCallback(async () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);

    // On mobile, use the native camera UI.
    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    // On desktop, open webcam preview and let user capture.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      selfieStreamRef.current = stream;
      setSelfieCamera(true);
      requestAnimationFrame(() => {
        if (selfieVideoRef.current) selfieVideoRef.current.srcObject = stream;
      });
    } catch (err) {
      toast({
        title: 'Camera error',
        description: 'Could not access camera. Please allow permission or upload a photo instead.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const captureSelfie = useCallback(() => {
    const video = selfieVideoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // mirror horizontally for selfie feel
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    setSelfieDataUrl(canvas.toDataURL('image/jpeg', 0.92));
    stopSelfieCamera();
  }, [stopSelfieCamera]);

  useEffect(() => {
    return () => {
      selfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const promptVariants = useMemo(() => ([
    'Use the provided stage background image exactly as the scene. Place the same person as an event attendee standing naturally in front of the stage backdrop, slight smile, relaxed arms by the sides. Keep photorealistic phone-camera quality, realistic lighting, natural skin texture, and correct perspective.',
    'Use the provided stage background image exactly as the scene. Place the same person as an event attendee in a 3/4 angle pose with one hand in pocket, calm expression, standing in front of the stage backdrop. Keep photorealistic phone-camera quality, realistic lighting, natural skin texture, and correct perspective.',
    'Use the provided stage background image exactly as the scene. Place the same person as an event attendee in a candid standing pose, body slightly turned and looking slightly off-camera, in front of the stage backdrop. Keep photorealistic phone-camera quality, realistic lighting, natural skin texture, and correct perspective.',
    'Use the provided stage background image exactly as the scene. Place the same person as an event attendee in a friendly pose with arms lightly crossed and a slight smile, standing in front of the stage backdrop. Keep photorealistic phone-camera quality, realistic lighting, natural skin texture, and correct perspective.',
  ]), []);

  

  const generateFourImages = useCallback(async () => {
    if (!selfieDataUrl) return;
    setIsGenerating(true);
    setGeneratedImages([{ dataUrl: null }, { dataUrl: null }, { dataUrl: null }, { dataUrl: null }]);
    setSelectedImageIndex(null);
    try {
      const selfieBlob = dataUrlToBlob(selfieDataUrl);
      // Include the fixed stage background as an additional reference image.
      const bgResp = await fetch('/red-hat/bg.jpg', { cache: 'no-store' });
      if (!bgResp.ok) throw new Error(`Failed to load stage background (${bgResp.status})`);
      const stageBackgroundBlob = await bgResp.blob();
      const tasks = promptVariants.map(async (prompt) => {
        const fullPrompt = `${prompt}\n\nUse the person from selfie.jpg as the subject and the scene from bg.jpg as the background. Keep identity, face, hair, and body proportions consistent. Do not create cartoon/art styles.`;

        // Try Gemini first (fast + lower cost), then fallback to OpenAI image edits.
        const form = new FormData();
        form.append('prompt', fullPrompt);
        form.append('image[]', selfieBlob, 'selfie.jpg');
        form.append('image[]', stageBackgroundBlob, 'bg.jpg');
        const geminiResp = await fetch('/api/generate-image-gemini', { method: 'POST', body: form });
        if (geminiResp.ok) {
          const data = await geminiResp.json();
          const b64 = data?.data?.[0]?.b64_json as string | undefined;
          if (!b64) throw new Error('No image returned');
          return `data:image/png;base64,${stripDataUrlPrefix(b64)}`;
        }

        // Gemini failed for this variant; fallback to OpenAI route.
        const geminiErrText = await geminiResp.text().catch(() => '');
        const chatForm = new FormData();
        chatForm.append('model', 'gpt-image-1');
        chatForm.append('prompt', fullPrompt);
        chatForm.append('n', '1');
        chatForm.append('size', '1024x1024');
        chatForm.append('quality', 'high');
        chatForm.append('image[]', selfieBlob, 'selfie.jpg');
        chatForm.append('image[]', stageBackgroundBlob, 'bg.jpg');

        const chatResp = await fetch('/api/generate-image', { method: 'POST', body: chatForm });
        if (!chatResp.ok) {
          const chatErrText = await chatResp.text().catch(() => '');
          const geminiMsg = extractGeminiMessage(geminiErrText) || `Gemini HTTP ${geminiResp.status}`;
          const chatMsg = extractGeminiMessage(chatErrText) || `OpenAI HTTP ${chatResp.status}`;
          throw new Error(`${geminiMsg}; ${chatMsg}`);
        }
        const chatData = await chatResp.json();
        const chatB64 = chatData?.data?.[0]?.b64_json as string | undefined;
        if (!chatB64) throw new Error('No image returned');
        return `data:image/png;base64,${stripDataUrlPrefix(chatB64)}`;
      });

      const results = await Promise.allSettled(tasks);
      const next: GeneratedImage[] = results.map((r) => {
        if (r.status === 'fulfilled') return { dataUrl: r.value };
        return { dataUrl: null, error: getErrorMessage(r.reason) || 'Generation failed' };
      });
      const okCount = next.filter((x) => Boolean(x.dataUrl)).length;
      if (okCount === 0) {
        // If Gemini quota is exhausted, still give the user 4 usable options.
        const locals = await generateLocalVariants(selfieDataUrl);
        const localImgs: GeneratedImage[] = locals.map((u) => ({ dataUrl: u }));
        setGeneratedImages(localImgs);
        setSelectedImageIndex(0);
        toast({
          title: 'Using local enhancements',
          description: 'AI quota is unavailable right now, so we generated 4 local variants instead.',
        });
      } else {
        setGeneratedImages(next);
        const firstOk = next.findIndex((x) => Boolean(x.dataUrl));
        if (firstOk >= 0) setSelectedImageIndex(firstOk);
      }
    } catch (err: unknown) {
      // Hard failure: fallback to local variants
      try {
        const locals = await generateLocalVariants(selfieDataUrl);
        const localImgs: GeneratedImage[] = locals.map((u) => ({ dataUrl: u }));
        setGeneratedImages(localImgs);
        setSelectedImageIndex(0);
        toast({
          title: 'Using local enhancements',
          description: 'AI generation failed, so we generated 4 local variants instead.',
        });
      } catch (e) {
        toast({ title: 'AI error', description: getErrorMessage(err) || getErrorMessage(e), variant: 'destructive' });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [promptVariants, selfieDataUrl, toast]);

  // auto-trigger generation once user reaches Step 4 (first time)
  const step4AutoTriggeredRef = useRef(false);
  useEffect(() => {
    if (step !== 4) return;
    if (step4AutoTriggeredRef.current) return;
    step4AutoTriggeredRef.current = true;
    generateFourImages();
  }, [step, generateFourImages]);

  const checkLinkedIn = useCallback(async () => {
    try {
      const resp = await fetch('/api/linkedin/status', { cache: 'no-store' });
      const data = await resp.json();
      setLinkedinConnected(Boolean(data?.connected));
      setLinkedinName(data?.name ?? null);
      setLinkedinPicture(data?.picture ?? null);
    } catch {
      setLinkedinConnected(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 1 && step !== 5 && step !== 6) return;
    checkLinkedIn();
    const onFocus = () => checkLinkedIn();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [step, checkLinkedIn]);

  const connectLinkedIn = useCallback(() => {
    // Use same-tab navigation so it works reliably on mobile.
    window.location.href = '/api/linkedin/auth';
  }, []);

  const getSelectedImageDataUrl = useCallback(() => {
    if (selectedImageIndex === null) return null;
    return generatedImages[selectedImageIndex]?.dataUrl ?? null;
  }, [generatedImages, selectedImageIndex]);

  const publish = useCallback(async () => {
    setLinkedinError(null);
    setLinkedinPostUrl(null);

    if (!canGoStep4 || !canGoStep5) return;

    // If not connected, start OAuth.
    if (!linkedinConnected) {
      toast({ title: 'Connect LinkedIn', description: 'Please connect your LinkedIn account to publish.' });
      sessionStorage.setItem(WIZARD_STORAGE_KEY, '6');
      connectLinkedIn();
      return;
    }

    const selected = getSelectedImageDataUrl() || selfieDataUrl;
    if (!selected) {
      toast({ title: 'Missing image', description: 'Please select an image first.', variant: 'destructive' });
      return;
    }

    setLinkedinPosting(true);
    setLinkedinProgress('Preparing images…');
    try {
      const imagesToUpload: { blob: Blob; filename: string }[] = [];
      imagesToUpload.push({ blob: dataUrlToBlob(selected), filename: 'selected.jpg' });

      // Upload each image to LinkedIn to get asset URNs.
      const assetUrns: string[] = [];
      // 1) Upload selected image (small) via FormData
      for (let i = 0; i < imagesToUpload.length; i++) {
        setLinkedinProgress(`Uploading image ${i + 1} of ${imagesToUpload.length}…`);
        const form = new FormData();
        form.append('image', imagesToUpload[i].blob, imagesToUpload[i].filename);
        const upResp = await fetch('/api/linkedin/upload-image', { method: 'POST', body: form });
        if (!upResp.ok) {
          const { error } = await upResp.json().catch(() => ({ error: `HTTP ${upResp.status}` }));
          throw new Error(error);
        }
        const { assetUrn } = await upResp.json();
        assetUrns.push(assetUrn);
      }

      // 2) Upload the 3 large public images server-side to avoid the 10MB request limit
      for (let i = 0; i < EXTRA_POST_IMAGES.length; i++) {
        setLinkedinProgress(`Uploading image ${i + 2} of ${EXTRA_POST_IMAGES.length + 1}…`);
        const upResp = await fetch('/api/linkedin/upload-public-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicPath: EXTRA_POST_IMAGES[i] }),
        });
        if (!upResp.ok) {
          const { error } = await upResp.json().catch(() => ({ error: `HTTP ${upResp.status}` }));
          throw new Error(error);
        }
        const { assetUrn } = await upResp.json();
        assetUrns.push(assetUrn);
      }

      setLinkedinProgress('Creating LinkedIn post…');
      const postResp = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: selectedCaption, assetUrns }),
      });
      if (!postResp.ok) {
        const { error } = await postResp.json().catch(() => ({ error: `HTTP ${postResp.status}` }));
        throw new Error(error);
      }
      const postData = await postResp.json();
      if (postData?.postUrl) setLinkedinPostUrl(postData.postUrl);

      // Best-effort copy (will fail on non-secure contexts, so don't block).
      try {
        await copyToClipboard(selectedCaption);
      } catch {
        // ignore
      }

      setStep(7);
    } catch (err) {
      setLinkedinError(getErrorMessage(err));
      toast({ title: 'LinkedIn publish failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLinkedinPosting(false);
      setLinkedinProgress('');
    }
  }, [
    canGoStep4,
    canGoStep5,
    connectLinkedIn,
    getSelectedImageDataUrl,
    linkedinConnected,
    selfieDataUrl,
    selectedCaption,
    toast,
  ]);

  return (
    <div className="min-h-dvh gradient-hero flex items-center justify-center px-4 py-6 overflow-hidden">
      <div className="w-full max-w-md">
        <Card className="dark relative overflow-hidden border text-card-foreground shadow-sm shadow-card border-border/40 rounded-3xl p-6 bg-card/70 backdrop-blur-md bg-[url('/event/bg-dark.png')] bg-cover bg-center before:content-[''] before:absolute before:inset-0 before:bg-black/60">
          <div className="relative z-10">
          {/* Branding (inside card) */}
          <div className="flex items-center justify-center mb-4">
            <img
              src="/event/ansible.png"
              alt="Ansible"
              className="h-10 w-auto drop-shadow"
            />
          </div>

          {/* Step 1: Consent */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-center text-white">
                  Ansible Automates
                  <br />
                  2026
                </h1>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Accept consent and connect your LinkedIn account (required to publish).
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4 cursor-pointer select-none">
                <Checkbox checked={consentAccepted} onCheckedChange={(v) => setConsentAccepted(v === true)} />
                <span className="text-sm text-muted-foreground leading-snug">
                  I consent to my uploaded photo being processed by AI to generate enhanced images. I understand I can publish the final post to my LinkedIn account.
                </span>
              </label>

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">LinkedIn</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {linkedinConnected === null
                        ? 'Checking…'
                        : linkedinConnected
                          ? `Connected${linkedinName ? ` as ${linkedinName}` : ''}`
                          : 'Not connected'}
                    </p>
                  </div>
                  {!linkedinConnected && linkedinConnected !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        sessionStorage.setItem(WIZARD_STORAGE_KEY, '2');
                        connectLinkedIn();
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="w-full h-11"
                  variant="hero"
                  disabled={!canGoStep1}
                  onClick={() => {
                    if (!linkedinConnected) {
                      sessionStorage.setItem(WIZARD_STORAGE_KEY, '2');
                      connectLinkedIn();
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Accept & Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                You can review terms any time at <a className="underline" href="/terms" target="_blank" rel="noreferrer">Terms</a>.
              </p>
            </div>
          )}

          {/* Step 2: Photo */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Take or upload a photo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the front camera or upload a selfie. You can retake anytime.
                </p>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPickFile} />

              {selfieCamera ? (
                <div className="space-y-3">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border/60 bg-black">
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
                    <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={stopSelfieCamera}>
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button type="button" variant="hero" className="flex-1 h-11 rounded-xl" onClick={captureSelfie}>
                      <Camera className="w-4 h-4 mr-2" /> Capture
                    </Button>
                  </div>
                </div>
              ) : selfieDataUrl ? (
                <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border/60 bg-secondary/30">
                  <img src={selfieDataUrl} alt="Your photo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="rounded-2xl border-2 border-dashed border-accent/40 bg-secondary/30 p-5 text-left hover:border-accent transition-colors"
                    onClick={startSelfieCamera}
                    type="button"
                  >
                    <Camera className="w-6 h-6 text-accent mb-3" />
                    <div className="text-sm font-semibold">Take photo</div>
                    <div className="text-xs text-muted-foreground mt-1">Mobile: camera · Laptop: webcam</div>
                  </button>
                  <button
                    className="rounded-2xl border-2 border-dashed border-accent/40 bg-secondary/30 p-5 text-left hover:border-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="w-6 h-6 text-accent mb-3" />
                    <div className="text-sm font-semibold">Upload</div>
                    <div className="text-xs text-muted-foreground mt-1">From gallery/files</div>
                  </button>
                </div>
              )}

              {selfieDataUrl && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={() => { stopSelfieCamera(); setSelfieDataUrl(null); }}
                  >
                    Retake
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload another
                  </Button>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button variant="hero" className="flex-1 h-11 rounded-xl" disabled={!canGoStep2} onClick={() => setStep(3)}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Survey + details */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Quick survey</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Rate each question from 1 to 5 stars, then enter your details.
                </p>
              </div>

              <div className="space-y-4">
                {SURVEY_QUESTIONS.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                    <p className="text-sm font-medium">{q.label}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {([1, 2, 3, 4, 5] as const).map((n) => {
                        const value = (survey[q.id] ?? 0) as Rating;
                        const filled = n <= value;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSurvey((prev) => ({ ...prev, [q.id]: n }))}
                            className="p-1 rounded-md hover:bg-accent/10 transition-colors"
                            aria-label={`${q.label}: ${n} star`}
                          >
                            <Star className={filled ? 'w-6 h-6 text-accent fill-accent' : 'w-6 h-6 text-muted-foreground'} />
                          </button>
                        );
                      })}
                      <span className="text-xs text-muted-foreground ml-2">
                        {(survey[q.id] ?? 0) === 0 ? 'Select rating' : `${survey[q.id]}/5`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Name</Label>
                  <Input id="fullName" className="h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company name</Label>
                  <Input id="company" className="h-11" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  {email.length > 0 && !isValidEmail(email) && (
                    <p className="text-xs text-destructive">Please enter a valid email.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button variant="hero" className="flex-1 h-11 rounded-xl" disabled={!canGoStep3} onClick={() => setStep(4)}>
                  Generate images <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Generate + select image */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Select your image</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We’ll generate 4 AI-enhanced images. Pick 1.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {generatedImages.map((img, i) => {
                  const isSelected = selectedImageIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={[
                        'relative overflow-hidden rounded-2xl border bg-secondary/20 aspect-square transition-all',
                        isSelected ? 'border-accent ring-2 ring-accent/40' : 'border-border/60 hover:border-accent/50',
                      ].join(' ')}
                      onClick={() => img.dataUrl && setSelectedImageIndex(i)}
                      disabled={!img.dataUrl || isGenerating}
                      aria-label={`Select image ${i + 1}`}
                    >
                      {img.dataUrl ? (
                        <img src={img.dataUrl} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin mb-2" />
                              <span className="text-xs">Generating…</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs">Not ready</span>
                              {img.error && <span className="text-[10px] text-destructive mt-1 px-2 text-center">{img.error}</span>}
                            </>
                          )}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={generateFourImages}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating
                    </>
                  ) : (
                    'Regenerate'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="hero"
                  className="flex-1 h-11 rounded-xl"
                  disabled={!canGoStep4}
                  onClick={() => setStep(5)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </div>
          )}

          {/* Step 5: Pick caption */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Pick your caption</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose 1 of 4 descriptions, then preview your post.
                </p>
              </div>

              <div className="space-y-3">
                {CAPTION_OPTIONS.map((cap, idx) => {
                  const selected = selectedCaptionIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={[
                        'w-full text-left rounded-2xl border p-4 transition-colors',
                        selected ? 'border-accent bg-accent/5' : 'border-border/60 bg-secondary/20 hover:border-accent/40',
                      ].join(' ')}
                      onClick={() => setSelectedCaptionIndex(idx)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm whitespace-pre-line">{cap}</p>
                        {selected && (
                          <span className="shrink-0 w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 h-11 rounded-xl"
                  disabled={!canGoStep4 || !canGoStep5}
                  onClick={() => setStep(6)}
                >
                  Preview post <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Full LinkedIn preview + post */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Preview</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how it will look on LinkedIn.
                </p>
              </div>

              <div className="rounded-2xl bg-white text-black border border-border/60 overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                    {linkedinPicture ? (
                      <img src={linkedinPicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                        in
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{linkedinName || fullName || 'Your Name'}</p>
                    <p className="text-xs text-neutral-500">Posting to LinkedIn</p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <p className="text-sm whitespace-pre-line">{selectedCaption || 'Select a caption to preview.'}</p>
                </div>

                {/* Hero banner */}
                <div className="w-full aspect-[16/9] bg-neutral-100">
                  {selectedImageIndex !== null && generatedImages[selectedImageIndex]?.dataUrl ? (
                    <img
                      src={generatedImages[selectedImageIndex]!.dataUrl!}
                      alt="Hero"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                      No hero image selected
                    </div>
                  )}
                </div>

                {/* 3 images below */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {EXTRA_POST_IMAGES.map((src, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-neutral-100">
                        <img src={src} alt={`Extra ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {linkedinError && (
                <p className="text-xs text-destructive">{linkedinError}</p>
              )}

              {linkedinPosting && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {linkedinProgress || 'Posting…'}
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={() => setStep(5)} disabled={linkedinPosting}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 h-11 rounded-xl"
                  disabled={!canGoStep4 || !canGoStep5 || linkedinPosting}
                  onClick={publish}
                >
                  {linkedinPosting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting
                    </>
                  ) : (
                    <>
                      Post <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">LinkedIn</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {linkedinConnected === null
                        ? 'Checking…'
                        : linkedinConnected
                          ? `Connected${linkedinName ? ` as ${linkedinName}` : ''}`
                          : 'Not connected'}
                    </p>
                  </div>
                  {!linkedinConnected && linkedinConnected !== null && (
                    <Button type="button" variant="outline" className="rounded-xl" onClick={connectLinkedIn}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                  <p className="text-sm font-semibold">Actions</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={async () => {
                        try {
                          await copyToClipboard(selectedCaption);
                          toast({ title: 'Copied', description: 'Caption copied to clipboard.' });
                        } catch {
                          toast({
                            title: 'Copy not available',
                            description: 'On mobile HTTP (LAN) browsers, copy is often blocked. You can long-press the caption and copy manually.',
                          });
                        }
                      }}
                      disabled={!canGoStep5}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={async () => {
                        if (selectedImageIndex === null) return;
                        const selected = generatedImages[selectedImageIndex]?.dataUrl;
                        if (selected) await downloadDataUrl(selected, `eventsnap-selected-${Date.now()}.jpg`);
                        await Promise.all(
                          EXTRA_POST_IMAGES.map((url, i) => downloadUrl(url, `eventsnap-red-hat-${i + 1}.jpg`))
                        );
                      }}
                      disabled={!canGoStep4}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <Textarea
                    value={selectedCaption}
                    readOnly
                    className="min-h-[90px] resize-none bg-secondary/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Done */}
          {step === 7 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-full gradient-accent flex items-center justify-center text-white">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Thanks{fullName ? `, ${fullName}` : ''}!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your LinkedIn post has been published.
                </p>
              </div>
              {linkedinPostUrl && (
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => window.open(linkedinPostUrl!, '_blank', 'noopener,noreferrer')}
                >
                  View post
                </Button>
              )}
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setStep(5)}>
                  Back to preview
                </Button>
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={startOver}>
                  Start again
                </Button>
              </div>
            </div>
          )}

          {/* Reset (inside card) */}
          <div className="mt-6 flex justify-center">
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={startOver}
              type="button"
            >
              Reset flow
            </button>
          </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

