'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Download,
  Eye,
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
  `Great insights and meaningful conversations at the Dell Technologies Forum, with a clear focus on innovation and business transformation.\n\nThe discussions highlighted how technology continues to shape enterprise resilience and growth.\n\n#DellTechnologiesForum #DellTechForum #DellTechWorld`,
  `An engaging experience at Dell Technologies Forum, bringing together leaders to explore the future of digital transformation.\n\nStrong emphasis on practical solutions and scalable innovation across industries.\n\n#DellTechnologies #DellTechnologiesForum2026 #DellTechForum`,
  `Dell Technologies Forum delivered valuable perspectives on navigating today's evolving tech landscape.\n\nThe sessions reinforced the importance of aligning technology with strategic business priorities.\n\n#DellTechWorld #DellTechnologiesForum #DellTechnologiesForum2026`,
  `Insightful sessions at Dell Technologies Forum showcasing how organizations are leveraging emerging technologies for competitive advantage.\n\nA strong platform for collaboration, learning, and forward-looking ideas.\n\n#DellTechForum #DellTechnologies #DellTechWorld`,
];

const EXTRA_POST_IMAGE_CANDIDATES = [
  ['/dell/1.jpeg', '/dell/1.jpg', '/dell/1.JPG'],
  ['/dell/2.jpeg', '/dell/2.jpg', '/dell/2.JPG'],
  ['/dell/3.jpeg', '/dell/3.jpg', '/dell/3.JPG'],
] as const;
const EXTRA_POST_IMAGES = EXTRA_POST_IMAGE_CANDIDATES.map((paths) => paths[0]) as readonly string[];
const WIZARD_STORAGE_KEY = 'eventstudio_postwizard_resume_step';
const SURVEY_CREATE_ENDPOINT =
  process.env.NEXT_PUBLIC_SURVEY_CREATE_URL?.trim() || 'https://expy.crafttechhub.com/survey/create';
const SURVEY_EVENT_ID = process.env.NEXT_PUBLIC_SURVEY_EVENT_ID?.trim() || '';
const AI_VARIANTS_TO_GENERATE = 4;

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

function getFriendlyGenerationError(raw: string) {
  const text = raw.toLowerCase();
  if (text.includes('413') || text.includes('request entity too large')) {
    return 'Image upload is too large. Please use a smaller photo or try again after compression.';
  }
  return raw;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 45000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
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

async function normalizeForAiRequest(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  // Keep payload very small for strict mobile/proxy upload limits.
  const TARGET_MAX_BYTES = 120 * 1024;
  let width = Math.max(1, Math.round(img.width * Math.min(1, 960 / Math.max(img.width, img.height))));
  let height = Math.max(1, Math.round(img.height * Math.min(1, 960 / Math.max(img.width, img.height))));
  let quality = 0.7;

  const render = (w: number, h: number, q: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', q);
  };

  let out = render(width, height, quality);
  let outSize = dataUrlToBlob(out).size;

  // Iteratively shrink dimensions + quality until under target size.
  for (let i = 0; i < 8 && outSize > TARGET_MAX_BYTES; i++) {
    quality = Math.max(0.4, quality - 0.06);
    width = Math.max(320, Math.round(width * 0.85));
    height = Math.max(320, Math.round(height * 0.85));
    out = render(width, height, quality);
    outSize = dataUrlToBlob(out).size;
  }

  return out;
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
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveySaved, setSurveySaved] = useState(false);

  // Step 4
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([
    { dataUrl: null },
    { dataUrl: null },
    { dataUrl: null },
    { dataUrl: null },
  ]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  // Step 5
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState<number | null>(null);
  const selectedCaption = selectedCaptionIndex === null ? '' : CAPTION_OPTIONS[selectedCaptionIndex];

  // LinkedIn
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinPicture, setLinkedinPicture] = useState<string | null>(null);
  const [linkedinPosting, setLinkedinPosting] = useState(false);
  const linkedinPublishLockRef = useRef(false);
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
    setSurveySubmitting(false);
    setSurveySaved(false);
    setIsGenerating(false);
    setGeneratedImages([{ dataUrl: null }, { dataUrl: null }, { dataUrl: null }, { dataUrl: null }]);
    setSelectedImageIndex(null);
    setPreviewImageIndex(null);
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

  useEffect(() => {
    setSurveySaved(false);
  }, [fullName, companyName, email, survey]);

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
    `Premium, slightly comical corporate poster at Dell Tech Forum Bangalore. Indian professional in sharp suit, confident corporate hero pose, wearing event badge.
Modern tech conference background, blue-toned lighting, LED screens, blurred crowd. Subtle humor via visuals: floating AI/cloud icons, rising graphs, dramatic spotlight, coffee cup, exaggerated networking in background.
Ultra-realistic, cinematic lighting, shallow depth, clean composition, not cluttered.
Minimal text:
Headline: "Built for the Big Stage"
Footer: "Dell Tech Forum | Bangalore"
4K, LinkedIn-style, premium aesthetic.`,
    `Premium, slightly comical corporate poster at Dell Tech Forum Bangalore. Indian professional in sharp suit, confident leadership pose, wearing event badge.
Modern tech conference background, blue-toned lighting, LED screens, blurred crowd. Subtle humor via visuals: floating AI/cloud icons, rising graphs, dramatic spotlight, coffee cup, exaggerated networking in background.
Ultra-realistic, cinematic lighting, shallow depth, clean composition, not cluttered.
Minimal text:
Headline: "Designed to Lead"
Footer: "Dell Tech Forum | Bangalore"
4K, LinkedIn-style, premium aesthetic.`,
    `Premium, slightly comical corporate poster at Dell Tech Forum Bangalore. Indian professional in sharp suit, poised networking pose, wearing event badge.
Modern tech conference background, blue-toned lighting, LED screens, blurred crowd. Subtle humor via visuals: floating AI/cloud icons, rising graphs, dramatic spotlight, coffee cup, exaggerated networking in background.
Ultra-realistic, cinematic lighting, shallow depth, clean composition, not cluttered.
Minimal text:
Headline: "Where Ideas Scale"
Footer: "Dell Tech Forum | Bangalore"
4K, LinkedIn-style, premium aesthetic.`,
    `Premium, slightly comical corporate poster at Dell Tech Forum Bangalore. Indian professional in sharp suit, composed premium portrait pose, wearing event badge.
Modern tech conference background, blue-toned lighting, LED screens, blurred crowd. Subtle humor via visuals: floating AI/cloud icons, rising graphs, dramatic spotlight, coffee cup, exaggerated networking in background.
Ultra-realistic, cinematic lighting, shallow depth, clean composition, not cluttered.
Minimal text:
Headline: "Future. Built In."
Footer: "Dell Tech Forum | Bangalore"
4K, LinkedIn-style, premium aesthetic.`,
  ]), []);

  

  const generateFourImages = useCallback(async () => {
    if (!selfieDataUrl) return;
    setIsGenerating(true);
    setGeneratedImages([{ dataUrl: null }, { dataUrl: null }, { dataUrl: null }, { dataUrl: null }]);
    setSelectedImageIndex(null);
    try {
      const aiSelfieDataUrl = await normalizeForAiRequest(selfieDataUrl);
      const selfieBlob = dataUrlToBlob(aiSelfieDataUrl);
      // Background-reference flow disabled intentionally (prompt-only generation).
      // const stageBackgrounds: { blob: Blob; filename: string }[] = [];
      // const stageBgCandidates = ['/dell/bg.jpg'];
      // for (const bgPath of stageBgCandidates) {
      //   try {
      //     const bgResp = await fetchWithTimeout(bgPath, { cache: 'no-store' }, 10000);
      //     if (bgResp.ok) {
      //       stageBackgrounds.push({
      //         blob: await bgResp.blob(),
      //         filename: bgPath.split('/').pop() || 'bg.jpg',
      //       });
      //     }
      //   } catch {
      //     // continue to next candidate
      //   }
      // }

      const aiPrompts = promptVariants.slice(0, AI_VARIANTS_TO_GENERATE);
      const aiResults: GeneratedImage[] = [];

      // Run sequentially for better reliability on mobile networks/devices.
      for (let promptIndex = 0; promptIndex < aiPrompts.length; promptIndex++) {
        const prompt = aiPrompts[promptIndex];
        const fullPrompt = `${prompt}\n\nUse the person from selfie.jpg as the subject. Keep identity, face, hair, and body proportions consistent. Do not create cartoon/art styles.`;

        let finalError = 'Generation failed';
        let generatedForPrompt: string | null = null;
        for (let attempt = 0; attempt < 2 && !generatedForPrompt; attempt++) {
          try {
            // Try Gemini first
            const form = new FormData();
            form.append('prompt', fullPrompt);
            form.append('image[]', selfieBlob, 'selfie.jpg');
            const geminiResp = await fetchWithTimeout('/api/generate-image-gemini', { method: 'POST', body: form }, 45000);
            if (geminiResp.ok) {
              const data = await geminiResp.json();
              const b64 = data?.data?.[0]?.b64_json as string | undefined;
              if (!b64) throw new Error('No image returned');
              generatedForPrompt = `data:image/png;base64,${stripDataUrlPrefix(b64)}`;
              break;
            }

            const geminiErrText = await geminiResp.text().catch(() => '');
            const geminiMsg = getFriendlyGenerationError(
              extractGeminiMessage(geminiErrText) || `Gemini HTTP ${geminiResp.status}`
            );

            // Fallback to OpenAI when Gemini fails
            const chatForm = new FormData();
            chatForm.append('model', 'gpt-image-1');
            chatForm.append('prompt', fullPrompt);
            chatForm.append('n', '1');
            chatForm.append('size', '1024x1024');
            chatForm.append('quality', 'high');
            chatForm.append('image[]', selfieBlob, 'selfie.jpg');
            const chatResp = await fetchWithTimeout('/api/generate-image', { method: 'POST', body: chatForm }, 45000);
            if (chatResp.ok) {
              const chatData = await chatResp.json();
              const chatB64 = chatData?.data?.[0]?.b64_json as string | undefined;
              if (!chatB64) throw new Error('No image returned');
              generatedForPrompt = `data:image/png;base64,${stripDataUrlPrefix(chatB64)}`;
              break;
            }

            const chatErrText = await chatResp.text().catch(() => '');
            const chatMsg = getFriendlyGenerationError(
              extractGeminiMessage(chatErrText) || `OpenAI HTTP ${chatResp.status}`
            );
            finalError = `${geminiMsg}; ${chatMsg}`;
          } catch (err) {
            finalError = getFriendlyGenerationError(getErrorMessage(err));
          }
          if (!generatedForPrompt && attempt === 0) {
            await new Promise((r) => setTimeout(r, 700));
          }
        }

        if (generatedForPrompt) {
          aiResults.push({ dataUrl: generatedForPrompt });
          setGeneratedImages((prev) => {
            const next = [...prev];
            next[promptIndex] = { dataUrl: generatedForPrompt };
            return next;
          });
        } else {
          const failed = { dataUrl: null, error: finalError };
          aiResults.push(failed);
          setGeneratedImages((prev) => {
            const next = [...prev];
            next[promptIndex] = failed;
            return next;
          });
        }
      }

      const next: GeneratedImage[] = Array.from({ length: 4 }).map((_, i) => {
        const aiResult = aiResults[i] ?? null;
        return aiResult?.dataUrl ? { dataUrl: aiResult.dataUrl } : { dataUrl: null, error: aiResult?.error || 'Generation failed' };
      });

      const okCount = next.filter((x) => Boolean(x.dataUrl)).length;
      const aiOkCount = aiResults.filter((x) => Boolean(x.dataUrl)).length;
      if (okCount > 0) {
        setGeneratedImages(next);
        const firstOk = next.findIndex((x) => Boolean(x.dataUrl));
        if (firstOk >= 0) setSelectedImageIndex(firstOk);
        if (aiOkCount === 0) {
          const firstErr = aiResults.find((x) => x.error)?.error;
          toast({
            title: 'AI generation unavailable',
            description:
              firstErr || 'Showing local variants because AI generation failed.',
            variant: 'destructive',
          });
        }
      } else {
        throw new Error('Could not generate image variants');
      }
    } catch (err: unknown) {
      setGeneratedImages([
        { dataUrl: null, error: getFriendlyGenerationError(getErrorMessage(err)) },
        { dataUrl: null, error: getFriendlyGenerationError(getErrorMessage(err)) },
        { dataUrl: null, error: getFriendlyGenerationError(getErrorMessage(err)) },
        { dataUrl: null, error: getFriendlyGenerationError(getErrorMessage(err)) },
      ]);
      toast({ title: 'AI error', description: getFriendlyGenerationError(getErrorMessage(err)), variant: 'destructive' });
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
    if (linkedinPosting || linkedinPublishLockRef.current) return;
    linkedinPublishLockRef.current = true;
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
        let uploaded = false;
        let lastError = `HTTP 500`;
        const pathCandidates = EXTRA_POST_IMAGE_CANDIDATES[i] ?? [EXTRA_POST_IMAGES[i]];
        for (const publicPath of pathCandidates) {
          const upResp = await fetch('/api/linkedin/upload-public-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicPath }),
          });
          if (!upResp.ok) {
            const { error } = await upResp.json().catch(() => ({ error: `HTTP ${upResp.status}` }));
            lastError = error;
            continue;
          }
          const { assetUrn } = await upResp.json();
          assetUrns.push(assetUrn);
          uploaded = true;
          break;
        }
        if (!uploaded) {
          throw new Error(lastError);
        }
      }

      setLinkedinProgress('Creating LinkedIn post…');
      const postPayload = JSON.stringify({ caption: selectedCaption, assetUrns });
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
        const { error } = await postResp.json().catch(() => ({ error: `HTTP ${postResp.status}` }));
        throw new Error(error);
      }
      const postData = await postResp.json();
      if (postData?.postUrl) setLinkedinPostUrl(postData.postUrl);

      setStep(7);
    } catch (err) {
      setLinkedinError(getErrorMessage(err));
      toast({ title: 'LinkedIn publish failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLinkedinPosting(false);
      setLinkedinProgress('');
      linkedinPublishLockRef.current = false;
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

  const submitSurveyAndContinue = useCallback(async () => {
    if (!canGoStep3 || surveySubmitting) return;
    if (surveySaved) {
      setStep(4);
      return;
    }

    setSurveySubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set('full_name', fullName.trim());
      body.set('email', email.trim());
      body.set('company_name', companyName.trim());
      body.set('q1_overall_satisfaction', String(survey.q1 ?? 0));
      body.set('q2_content_quality', String(survey.q2 ?? 0));
      body.set('q3_event_experience', String(survey.q3 ?? 0));
      body.set('q4_recommend_likelihood', String(survey.q4 ?? 0));
      body.set('q5_expectations_met', String(survey.q5 ?? 0));
      if (SURVEY_EVENT_ID) body.set('event_id', SURVEY_EVENT_ID);

      const resp = await fetch(SURVEY_CREATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString(),
      });

      const raw = await resp.text();
      let parsed: { status?: string; message?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!resp.ok || parsed?.status === 'error') {
        throw new Error(parsed?.message || `Survey API failed (${resp.status})`);
      }

      setSurveySaved(true);
      setStep(4);
    } catch (err) {
      toast({
        title: 'Survey submit failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSurveySubmitting(false);
    }
  }, [canGoStep3, surveySubmitting, surveySaved, fullName, email, companyName, survey, toast]);

  return (
    <div className="min-h-[100svh] w-full bg-[url('/event/bg-dark.png')] bg-cover bg-center bg-fixed flex items-stretch sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-6 overflow-hidden">
      <div className="w-full max-w-md">
        <Card className="relative overflow-hidden border text-white [&_.text-muted-foreground]:text-white/85 shadow-sm shadow-card border-border/40 rounded-none sm:rounded-3xl min-h-[100svh] p-6 bg-[#0076CE] flex flex-col justify-center [&_button[class*='inline-flex']]:[background-image:none] [&_button[class*='inline-flex']]:border [&_button[class*='inline-flex']]:bg-[#0672cb] [&_button[class*='inline-flex']]:border-white/70 [&_button[class*='inline-flex']]:text-white [&_button[class*='inline-flex']:hover]:bg-[#00468b] [&_button[class*='inline-flex']:hover]:border-white/85 [&_button[class*='inline-flex']:disabled]:!bg-[#40576e] [&_button[class*='inline-flex']:disabled]:!border-white/70 [&_button[class*='inline-flex']:disabled]:!text-white/85">
          <div className="relative z-10 w-full">
          {/* Branding (inside card) */}
          <div className="flex items-center justify-center mb-4">
            <img
              src="/event/dell.png"
              alt="Dell Technologies"
              className="h-8 w-auto drop-shadow"
            />
          </div>

          {/* Step 1: Consent */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-center text-white">
                  Forum 2026
                  
                </h1>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Accept consent and connect your LinkedIn account.
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
                  className={[
                    'w-full h-11 !border !border-white/70 !text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md disabled:opacity-100',
                    canGoStep1
                      ? '!bg-[#0672cb]/85 hover:!bg-[#00468b]/90'
                      : '!bg-[#40576e]/75 disabled:!text-white/85',
                  ].join(' ')}
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
              <p className="text-[12px] text-muted-foreground">
                You can review terms any time at <a className="underline" href="https://visuallystudios.com/privacy-policy/" target="_blank" rel="noreferrer">Terms</a>.
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
                    <Camera className="w-6 h-6 text-white mb-3" />
                    <div className="text-sm font-semibold">Take photo</div>
                    <div className="text-xs text-muted-foreground mt-1">Mobile: camera · Laptop: webcam</div>
                  </button>
                  <button
                    className="rounded-2xl border-2 border-dashed border-accent/40 bg-secondary/30 p-5 text-left hover:border-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="w-6 h-6 text-white mb-3" />
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
                <Button
                  variant="hero"
                  className="flex-1 h-11 rounded-xl"
                  disabled={!canGoStep2}
                  onClick={() => {
                    // Start generation earlier so Step 4 is faster.
                    if (!step4AutoTriggeredRef.current) {
                      step4AutoTriggeredRef.current = true;
                      void generateFourImages();
                    }
                    setStep(3);
                  }}
                >
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
                  <Input id="fullName" className="h-11 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company name</Label>
                  <Input id="company" className="h-11 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" className="h-11 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  {email.length > 0 && !isValidEmail(email) && (
                    <p className="text-xs text-destructive">Please enter a valid email.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="heroOutline" className="h-11 rounded-xl" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 h-11 rounded-xl"
                  disabled={!canGoStep3 || surveySubmitting}
                  onClick={submitSurveyAndContinue}
                >
                  {surveySubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Generate images <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
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
                  We’ll quickly prepare 4 enhanced images. Pick 1.
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
                      {img.dataUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageIndex(i);
                          }}
                          className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
                          aria-label={`Preview image ${i + 1}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {img.dataUrl ? (
                        <img src={img.dataUrl} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          {isGenerating && !img.error ? (
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
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/75 flex items-center justify-center text-white">
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
                          <span className="shrink-0 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white">
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
                <div className="w-full aspect-[16/9] bg-neutral-100 rounded-xl overflow-hidden">
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
                        <img
                          src={src}
                          alt={`Extra ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (!img.dataset.fallbackTried) {
                              img.dataset.fallbackTried = '1';
                              img.src = `/red-hat/${i + 1}.JPG`;
                              return;
                            }
                            img.onerror = null;
                            img.src = '/placeholder.svg';
                          }}
                        />
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

              <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
                <div className="p-4 border-b border-border/60">
                  <p className="text-sm font-semibold">Download images</p>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {generatedImages.map((img, i) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-secondary/10 p-2">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary/30">
                        {img.dataUrl ? (
                          <img src={img.dataUrl} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                            N/A
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2 h-7 px-2 rounded-md bg-black/65 border-white/20 text-white hover:bg-black/80"
                          disabled={!img.dataUrl}
                          onClick={async () => {
                            if (!img.dataUrl) return;
                            await downloadDataUrl(img.dataUrl, `expy-studio-image-${i + 1}-${Date.now()}.jpg`);
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  window.location.assign('https://www.linkedin.com/feed/');
                }}
              >
                Go to LinkedIn
              </Button>
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

          {previewImageIndex !== null && generatedImages[previewImageIndex]?.dataUrl && (
            <div
              className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
              onClick={() => setPreviewImageIndex(null)}
            >
              <button
                type="button"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/75 text-white flex items-center justify-center"
                onClick={() => setPreviewImageIndex(null)}
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={generatedImages[previewImageIndex]!.dataUrl!}
                alt={`Preview ${previewImageIndex + 1}`}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
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

