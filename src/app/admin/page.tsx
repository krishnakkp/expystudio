'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Camera, Calendar, Shield, Loader2, MapPin,
  TrendingUp, BarChart3, ImageIcon, Activity, Clock,
} from 'lucide-react';
import supabase from '@/util/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalOrganizers: number;
  totalAttendees: number;
  totalEvents: number;
  activeEvents: number;
  totalPhotos: number;
  photosLast7Days: number;
  totalLocations: number;
}

interface RecentEvent {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  organizer_name: string | null;
  photo_count: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface DailyCount {
  date: string;
  photos: number;
  signups: number;
}

interface LocationStat {
  name: string;
  count: number;
}

// ─── Localhost Guard ────────────────────────────────────────────────────────

function useLocalhostGuard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    const host = window.location.hostname;
    setAllowed(host === 'localhost' || host === '127.0.0.1');
  }, []);
  return allowed;
}

// ─── Chart colors ───────────────────────────────────────────────────────────

const COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--accent) / 0.7)',
  'hsl(var(--accent) / 0.5)',
  'hsl(var(--accent) / 0.3)',
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const allowed = useLocalhostGuard();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);

  useEffect(() => {
    if (allowed !== true) return;

    async function load() {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [profilesRes, eventsRes, photosRes, locationsRes] = await Promise.all([
          (supabase as any).from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }),
          (supabase as any).from('events').select('id, name, is_active, organizer_id, created_at').order('created_at', { ascending: false }),
          (supabase as any).from('generated_photos').select('id, user_id, event_id, created_at, status, event_backgrounds ( name )').eq('status', 'completed').order('created_at', { ascending: false }),
          (supabase as any).from('event_backgrounds').select('id, event_id, name'),
        ]);

        const profiles = profilesRes.data ?? [];
        const events = eventsRes.data ?? [];
        const photos = photosRes.data ?? [];
        const locations = locationsRes.data ?? [];

        // ── Stats ───────────────────────────────────────────────────
        const totalUsers = profiles.length;
        const totalOrganizers = profiles.filter((p: any) => p.role === 'organizer').length;
        const totalAttendees = profiles.filter((p: any) => p.role === 'attendee').length;
        const totalEvents = events.length;
        const activeEvents = events.filter((e: any) => e.is_active).length;
        const totalPhotos = photos.length;
        const totalLocations = locations.length;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const photosLast7Days = photos.filter(
          (p: any) => new Date(p.created_at) >= sevenDaysAgo
        ).length;

        setStats({
          totalUsers, totalOrganizers, totalAttendees,
          totalEvents, activeEvents, totalPhotos,
          photosLast7Days, totalLocations,
        });

        // ── Recent events with photo counts ─────────────────────────
        const photoCountByEvent = new Map<string, number>();
        for (const p of photos) {
          photoCountByEvent.set(p.event_id, (photoCountByEvent.get(p.event_id) ?? 0) + 1);
        }

        const profileMap = new Map(profiles.map((p: any) => [p.id, p.full_name]));
        setRecentEvents(
          events.slice(0, 10).map((e: any) => ({
            id: e.id,
            name: e.name,
            is_active: e.is_active,
            created_at: e.created_at,
            organizer_name: profileMap.get(e.organizer_id) ?? 'Unknown',
            photo_count: photoCountByEvent.get(e.id) ?? 0,
          }))
        );

        // ── Recent users ────────────────────────────────────────────
        setRecentUsers(
          profiles.slice(0, 10).map((p: any) => ({
            id: p.id,
            full_name: p.full_name,
            role: p.role,
            created_at: p.created_at,
          }))
        );

        // ── Daily activity (last 14 days) ───────────────────────────
        const dailyMap = new Map<string, { photos: number; signups: number }>();
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dailyMap.set(d.toISOString().slice(0, 10), { photos: 0, signups: 0 });
        }
        for (const p of photos) {
          const day = p.created_at.slice(0, 10);
          if (dailyMap.has(day)) dailyMap.get(day)!.photos++;
        }
        for (const u of profiles) {
          const day = u.created_at?.slice(0, 10);
          if (day && dailyMap.has(day)) dailyMap.get(day)!.signups++;
        }
        setDailyCounts(
          Array.from(dailyMap.entries()).map(([date, val]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ...val,
          }))
        );

        // ── Location stats ──────────────────────────────────────────
        const locMap = new Map<string, number>();
        for (const p of photos) {
          const name = p.event_backgrounds?.name ?? 'Unknown';
          locMap.set(name, (locMap.get(name) ?? 0) + 1);
        }
        setLocationStats(
          Array.from(locMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
        );
      } catch (err) {
        console.error('[Admin] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [allowed]);

  // ── Access denied ─────────────────────────────────────────────────────────

  if (allowed === null) return null; // still checking

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible via localhost.</p>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // ── Stat cards config ─────────────────────────────────────────────────────

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, subtitle: `${stats?.totalOrganizers ?? 0} organizers · ${stats?.totalAttendees ?? 0} attendees` },
    { label: 'Total Events', value: stats?.totalEvents ?? 0, icon: Calendar, subtitle: `${stats?.activeEvents ?? 0} active` },
    { label: 'Photos Generated', value: stats?.totalPhotos ?? 0, icon: Camera, subtitle: `${stats?.photosLast7Days ?? 0} in last 7 days` },
    { label: 'Locations', value: stats?.totalLocations ?? 0, icon: MapPin, subtitle: 'across all events' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform overview — localhost only</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => {
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
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily activity chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Daily Activity</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Photos & sign-ups — last 14 days</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '0.875rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="photos" name="Photos" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signups" name="Sign-ups" stroke="hsl(var(--accent) / 0.4)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Photos by location */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Photos by Location</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Top locations across all events</p>
            {locationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={locationStats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '0.875rem' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" name="Photos" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-8 h-8 text-accent/40 mb-3" />
                <p className="text-muted-foreground text-sm">No location data yet.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tables row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent events */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Recent Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Event</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Organizer</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Photos</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No events yet</td></tr>
                  ) : (
                    recentEvents.map((event) => (
                      <tr key={event.id} className="border-b border-border/30 last:border-0 hover:bg-accent/5 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-foreground truncate max-w-[160px]">{event.name}</td>
                        <td className="py-2.5 px-2 text-muted-foreground truncate max-w-[120px]">{event.organizer_name}</td>
                        <td className="py-2.5 px-2 text-center text-foreground">{event.photo_count}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            event.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {event.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent users */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="gradient-glass rounded-2xl border border-border/50 shadow-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Recent Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Role</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length === 0 ? (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No users yet</td></tr>
                  ) : (
                    recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-accent/5 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-foreground truncate max-w-[160px]">
                          {user.full_name || 'Anonymous'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'organizer'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
