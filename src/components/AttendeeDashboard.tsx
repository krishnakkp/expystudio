'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Calendar, Download, QrCode, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import supabase from '@/util/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import Link from 'next/link';

interface Photo {
  id: string;
  image_url: string;
  created_at: string;
  event_name: string | null;
  background_name: string | null;
}

interface EventParticipation {
  event_id: string;
  event_name: string;
  event_date: string | null;
  photo_count: number;
}

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      const { data: photosData } = await (supabase as any)
        .from('generated_photos')
        .select(`
          id,
          image_url,
          created_at,
          events ( name ),
          event_backgrounds ( name )
        `)
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      const mappedPhotos: Photo[] = (photosData ?? []).map((p: any) => ({
        id: p.id,
        image_url: p.image_url,
        created_at: p.created_at,
        event_name: p.events?.name ?? null,
        background_name: p.event_backgrounds?.name ?? null,
      }));
      setPhotos(mappedPhotos);

      const eventMap = new Map<string, EventParticipation>();
      for (const p of photosData ?? []) {
        if (!p.events) continue;
        const eid = p.event_id;
        if (eventMap.has(eid)) {
          eventMap.get(eid)!.photo_count++;
        } else {
          eventMap.set(eid, {
            event_id: eid,
            event_name: p.events.name,
            event_date: p.created_at,
            photo_count: 1,
          });
        }
      }
      setEvents(Array.from(eventMap.values()));
      setLoading(false);
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick action */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
            <QrCode className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ready for your next event?</h3>
            <p className="text-sm text-muted-foreground">Scan a QR code to generate AI-powered photos</p>
          </div>
        </div>
        <Button variant="hero" asChild>
          <Link href="/#demo">
            <Sparkles className="w-4 h-4 mr-2" />
            Try the Demo
          </Link>
        </Button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'My Photos', value: photos.length, icon: Camera },
          { label: 'Events Attended', value: events.length, icon: Calendar },
          { label: 'Latest Event', value: events.length > 0 ? events[0].event_name : '—', icon: Calendar, isText: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-soft p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div className={cn(stat.isText ? 'text-lg' : 'text-3xl', 'font-bold text-foreground truncate')}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Events list */}
      {events.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">My Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, i) => (
              <motion.div
                key={event.event_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="gradient-glass rounded-2xl border border-border/50 shadow-soft p-5 group hover:shadow-card transition-shadow duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{event.event_name}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {event.photo_count} photo{event.photo_count !== 1 ? 's' : ''} generated
                    </p>
                    {event.event_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Photo gallery */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">My Photos</h3>
        {photos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-card py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-accent/40" />
            </div>
            <h4 className="text-lg font-semibold text-foreground">No photos yet</h4>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              Scan a QR code at an event to generate your AI-powered photos.
            </p>
            <Button variant="hero" className="mt-6" asChild>
              <Link href="/#demo">
                <QrCode className="w-4 h-4 mr-2" />
                Try the Demo
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="gradient-glass rounded-2xl border border-border/50 shadow-soft overflow-hidden group hover:shadow-card transition-shadow duration-200"
              >
                <div className="relative aspect-square">
                  <img
                    src={photo.image_url}
                    alt={photo.background_name ?? 'Generated photo'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                    <a
                      href={photo.image_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Button size="sm" className="gradient-accent text-accent-foreground shadow-glow">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground truncate">
                    {photo.background_name ?? 'Photo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {photo.event_name ?? 'Event'} &middot;{' '}
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
