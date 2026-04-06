'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Camera, MapPin, TrendingUp, BarChart3, Loader2, ImageIcon } from 'lucide-react';
import supabase from '@/util/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  totalPhotos: number;
  avgPhotosPerUser: number;
  locationsUsed: number;
  mostPopularLocation: string;
  recentPhotos: number;
  dailyCounts: { date: string; count: number }[];
  locationBreakdown: { name: string; count: number }[];
}

export default function EventAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Get the organizer's active event
        const { data: events } = await (supabase as any)
          .from('events')
          .select('id, name')
          .eq('organizer_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (!events || events.length === 0) { setLoading(false); return; }

        const event = events[0];
        setEventName(event.name);

        // Fetch all completed photos for this event with their background info
        const { data: photos } = await (supabase as any)
          .from('generated_photos')
          .select(`
            id,
            user_id,
            created_at,
            event_backgrounds ( name )
          `)
          .eq('event_id', event.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: true });

        const allPhotos = photos ?? [];

        // Compute metrics
        const uniqueUsers = new Set(allPhotos.map((p: any) => p.user_id));
        const totalUsers = uniqueUsers.size;
        const totalPhotos = allPhotos.length;
        const avgPhotosPerUser = totalUsers > 0 ? Math.round((totalPhotos / totalUsers) * 10) / 10 : 0;

        // Location breakdown
        const locationMap = new Map<string, number>();
        for (const p of allPhotos) {
          const name = p.event_backgrounds?.name ?? 'Unknown';
          locationMap.set(name, (locationMap.get(name) ?? 0) + 1);
        }
        const locationBreakdown = Array.from(locationMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const locationsUsed = locationBreakdown.length;
        const mostPopularLocation = locationBreakdown.length > 0 ? locationBreakdown[0].name : '—';

        // Recent photos (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentPhotos = allPhotos.filter(
          (p: any) => new Date(p.created_at) >= sevenDaysAgo
        ).length;

        // Daily photo counts (last 14 days)
        const dailyMap = new Map<string, number>();
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dailyMap.set(d.toISOString().slice(0, 10), 0);
        }
        for (const p of allPhotos) {
          const day = p.created_at.slice(0, 10);
          if (dailyMap.has(day)) {
            dailyMap.set(day, dailyMap.get(day)! + 1);
          }
        }
        const dailyCounts = Array.from(dailyMap.entries()).map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
        }));

        setData({
          totalUsers,
          totalPhotos,
          avgPhotosPerUser,
          locationsUsed,
          mostPopularLocation,
          recentPhotos,
          dailyCounts,
          locationBreakdown,
        });
      } catch (err) {
        console.error('[EventAnalytics] Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground mt-1">
            No active event found. Set up an event first to see analytics.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Attendees', value: data.totalUsers.toString(), subtitle: 'unique users', icon: Users },
    { label: 'Photos Generated', value: data.totalPhotos.toString(), subtitle: `${data.recentPhotos} in last 7 days`, icon: Camera },
    { label: 'Avg. per Attendee', value: data.avgPhotosPerUser.toString(), subtitle: 'photos per user', icon: BarChart3 },
    { label: 'Locations Used', value: data.locationsUsed.toString(), subtitle: `Top: ${data.mostPopularLocation}`, icon: MapPin },
    { label: 'Last 7 Days', value: data.recentPhotos.toString(), subtitle: 'photos generated', icon: TrendingUp },
    { label: 'Top Location', value: data.mostPopularLocation, subtitle: data.locationBreakdown[0] ? `${data.locationBreakdown[0].count} photos` : '', icon: ImageIcon, isText: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Engagement and usage metrics for <span className="font-medium text-foreground">{eventName}</span>.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="gradient-glass rounded-2xl border border-border/50 shadow-soft p-5 hover:shadow-card transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
              </div>
              <div className={`${stat.isText ? 'text-lg' : 'text-3xl'} font-bold text-foreground truncate`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Photos over time chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-1">Photos Over Time</h3>
        <p className="text-sm text-muted-foreground mb-6">Last 14 days</p>
        {data.totalPhotos > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.dailyCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
              />
              <Bar dataKey="count" name="Photos" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-8 h-8 text-accent/40 mb-3" />
            <p className="text-muted-foreground text-sm">No photo data yet. Charts will appear once attendees start generating photos.</p>
          </div>
        )}
      </motion.div>

      {/* Location breakdown chart */}
      {data.locationBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-1">Photos by Location</h3>
          <p className="text-sm text-muted-foreground mb-6">Breakdown across event locations</p>
          <ResponsiveContainer width="100%" height={Math.max(180, data.locationBreakdown.length * 52)}>
            <BarChart data={data.locationBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
              />
              <Bar dataKey="count" name="Photos" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
