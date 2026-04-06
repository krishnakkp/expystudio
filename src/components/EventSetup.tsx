'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Save, Trash2, Copy, Check, MapPin, Loader2, RotateCcw, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/util/supabase/client';
import QRCode from 'react-qr-code';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_EVENT_BUCKET || 'event-backgrounds';

interface LocationRow {
  id: number;
  label: string;
  locationDesc: string;
  locationImage: File | null;
  locationImagePreview: string | null;
  existingImageUrl: string | null;
}

const defaultLocations: LocationRow[] = [
  { id: 1, label: 'Entrance', locationDesc: '', locationImage: null, locationImagePreview: null, existingImageUrl: null },
  { id: 2, label: 'Main Stage', locationDesc: '', locationImage: null, locationImagePreview: null, existingImageUrl: null },
  { id: 3, label: 'Exhibition Booths', locationDesc: '', locationImage: null, locationImagePreview: null, existingImageUrl: null },
  { id: 4, label: 'Registration Desk', locationDesc: '', locationImage: null, locationImagePreview: null, existingImageUrl: null },
];

export default function EventSetup() {
  const [locations, setLocations] = useState<LocationRow[]>(defaultLocations);
  const [isSaving, setIsSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasSavedBackgrounds, setHasSavedBackgrounds] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        let { data: events } = await (supabase as any)
          .from('events')
          .select('id')
          .eq('organizer_id', user.id)
          .eq('is_active', true)
          .limit(1);

        let evtId: string;

        if (events && events.length > 0) {
          evtId = events[0].id;
        } else {
          const { data: newEvent, error } = await (supabase as any)
            .from('events')
            .insert({ organizer_id: user.id, name: 'My Event', is_active: true })
            .select('id')
            .single();
          if (error || !newEvent) {
            toast({ title: 'Error', description: 'Could not create event: ' + (error?.message ?? 'unknown'), variant: 'destructive' });
            setLoading(false);
            return;
          }
          evtId = newEvent.id;
        }

        setEventId(evtId);

        const { data: bgs } = await (supabase as any)
          .from('event_backgrounds')
          .select('name, location_desc, image_url')
          .eq('event_id', evtId);

        if (bgs && bgs.length > 0) {
          const hasImages = bgs.some((bg: any) => bg.image_url);
          if (hasImages) setHasSavedBackgrounds(true);
          setLocations(prev =>
            prev.map((loc) => {
              const existing = bgs.find((bg: any) => bg.name === loc.label);
              if (existing) {
                return {
                  ...loc,
                  locationDesc: existing.location_desc ?? '',
                  existingImageUrl: existing.image_url ?? null,
                  locationImagePreview: existing.image_url ?? null,
                };
              }
              return loc;
            })
          );
        }
      } catch (err: any) {
        toast({ title: 'Error loading event', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDescChange = (id: number, value: string) => {
    setLocations(prev =>
      prev.map(loc => (loc.id === id ? { ...loc, locationDesc: value } : loc))
    );
  };

  const handleImageUpload = (id: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setLocations(prev =>
      prev.map(loc =>
        loc.id === id ? { ...loc, locationImage: file, locationImagePreview: preview, existingImageUrl: null } : loc
      )
    );
  };

  const handleRemoveImage = (id: number) => {
    setLocations(prev =>
      prev.map(loc =>
        loc.id === id ? { ...loc, locationImage: null, locationImagePreview: null, existingImageUrl: null } : loc
      )
    );
  };

  const handleSave = async () => {
    if (!eventId) {
      toast({ title: 'No event found', description: 'Could not find or create an event. Please refresh and try again.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      const sb = supabase as any;

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        let imageUrl = loc.existingImageUrl;

        if (loc.locationImage) {
          const filePath = `events/${eventId}/${i}.jpg`;
          let uploadResult;
          try {
            uploadResult = await supabase.storage
              .from(BUCKET)
              .upload(filePath, loc.locationImage, { upsert: true, contentType: loc.locationImage.type });
          } catch (uploadException: any) {
            throw new Error(`Storage upload threw for ${loc.label}: ${uploadException.message ?? uploadException}`);
          }

          if (uploadResult.error) {
            throw new Error(`Upload failed for ${loc.label}: ${uploadResult.error.message}`);
          }

          const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        if (!imageUrl && !loc.locationDesc) continue;

        const { data: existing, error: selectErr } = await sb
          .from('event_backgrounds')
          .select('id')
          .eq('event_id', eventId)
          .eq('name', loc.label)
          .limit(1);

        if (selectErr) throw new Error(`Query failed for ${loc.label}: ${selectErr.message}`);

        if (existing && existing.length > 0) {
          const { error } = await sb
            .from('event_backgrounds')
            .update({ location_desc: loc.locationDesc, image_url: imageUrl })
            .eq('id', existing[0].id);
          if (error) throw new Error(`Update failed for ${loc.label}: ${error.message}`);
        } else {
          const { error } = await sb
            .from('event_backgrounds')
            .insert({
              event_id: eventId,
              name: loc.label,
              location_desc: loc.locationDesc,
              image_url: imageUrl,
            });
          if (error) throw new Error(`Insert failed for ${loc.label}: ${error.message}`);
        }
      }

      setLocations(prev =>
        prev.map(loc => ({
          ...loc,
          locationImage: null,
        }))
      );

      setHasSavedBackgrounds(true);
      toast({ title: 'Saved', description: 'Event locations and backgrounds have been saved.' });
    } catch (err: any) {
      console.error('[EventSetup] Save error:', err);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const eventUrl = eventId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?event_id=${eventId}` : '';

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [eventUrl]);

  const handleDownloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const padding = 40;
    const size = 600;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;
    const ctx = canvas.getContext('2d')!;
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      const link = document.createElement('a');
      link.download = 'eventsnap-qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const handleReset = async () => {
    if (!eventId) return;
    setIsResetting(true);

    try {
      const sb = supabase as any;

      // Delete all files in the event's storage folder
      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(`events/${eventId}`);

      if (files && files.length > 0) {
        const paths = files.map(f => `events/${eventId}/${f.name}`);
        const { error: removeErr } = await supabase.storage
          .from(BUCKET)
          .remove(paths);
        if (removeErr) console.error('Storage removal error:', removeErr);
      }

      // Delete all event_backgrounds rows for this event
      const { error: deleteErr } = await sb
        .from('event_backgrounds')
        .delete()
        .eq('event_id', eventId);

      if (deleteErr) throw new Error(`Failed to delete backgrounds: ${deleteErr.message}`);

      // Reset local state
      setLocations(defaultLocations);
      setHasSavedBackgrounds(false);
      setShowResetConfirm(false);

      toast({ title: 'Reset complete', description: 'All images and descriptions have been removed. You can now set up a new configuration.' });
    } catch (err: any) {
      console.error('[EventSetup] Reset error:', err);
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Event Setup</h2>
        <p className="text-muted-foreground mt-1">
          Configure the 4 event locations with descriptions and background photos.
        </p>
      </div>

      {/* Location cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc, i) => (
          <motion.div
            key={loc.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-soft p-5 hover:shadow-card transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center">
                <MapPin className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{loc.label}</h3>
                <span className="text-xs text-muted-foreground">Location {loc.id}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor={`desc-${loc.id}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Description
                </Label>
                <Input
                  id={`desc-${loc.id}`}
                  placeholder="e.g. Main entrance with banner"
                  value={loc.locationDesc}
                  onChange={(e) => handleDescChange(loc.id, e.target.value)}
                  className="bg-background/60 border-border/60 focus:border-accent transition-colors"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Background Photo
                </Label>
                {loc.locationImagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50">
                    <img
                      src={loc.locationImagePreview}
                      alt={`${loc.label} preview`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      onClick={() => handleRemoveImage(loc.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Label
                    htmlFor={`upload-${loc.id}`}
                    className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border/60 hover:border-accent/60 bg-background/30 cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
                    <span className="text-sm text-muted-foreground">Upload photo</span>
                    <input
                      id={`upload-${loc.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(loc.id, file);
                      }}
                    />
                  </Label>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between">
        {hasSavedBackgrounds ? (
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            disabled={isResetting || isSaving}
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Configuration
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !eventId}
          className="gradient-accent text-accent-foreground shadow-glow hover:opacity-90 transition-opacity gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowResetConfirm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-card p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Reset Configuration?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete all uploaded images from storage and remove all location descriptions. The QR code will stop working until you save a new configuration.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Code Section */}
      {eventId && hasSavedBackgrounds && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="gradient-glass rounded-2xl border border-border/50 shadow-card p-8"
        >
          <h3 className="text-lg font-semibold text-foreground mb-1">Event QR Code</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Share this QR code at your event. Attendees scan it to start their photo experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div ref={qrRef} className="bg-white p-5 rounded-2xl shadow-soft">
              <QRCode value={eventUrl} size={180} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground break-all max-w-xs font-mono bg-background/60 rounded-lg p-3 border border-border/50">
                {eventUrl}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border/60 bg-card/50 hover:bg-card"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy link'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border/60 bg-card/50 hover:bg-card"
                  onClick={handleDownloadQR}
                >
                  <Download className="w-4 h-4" />
                  Save QR as PNG
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
