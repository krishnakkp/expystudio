'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/integrations/supabase/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, BarChart3, Camera, Home, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import EventSetup from '@/components/EventSetup';
import EventAnalytics from '@/components/EventAnalytics';
import AttendeeDashboard from '@/components/AttendeeDashboard';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';

const organizerTabs = [
  { id: 'setup', label: 'Event Setup', icon: Settings },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

type OrganizerTabId = (typeof organizerTabs)[number]['id'];

function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState<OrganizerTabId>('setup');

  return (
    <>
      <div className="flex gap-1 mb-8 bg-card/80 backdrop-blur-sm p-1.5 rounded-xl w-fit border border-border/50 shadow-soft">
        {organizerTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'gradient-accent text-accent-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'setup' && <EventSetup />}
      {activeTab === 'analytics' && <EventAnalytics />}
    </>
  );
}

function DashboardContent() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const isOrganizer = role === 'organizer';

  return (
    <div className="min-h-screen gradient-hero">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center">
                <Camera className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground hidden sm:inline">EventSnap AI</span>
            </Link>
            <div className="h-6 w-px bg-border/60" />
            <h1 className="text-sm font-semibold text-foreground">
              {isOrganizer ? 'Organizer Dashboard' : 'My Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isOrganizer && (
              <Button variant="outline" size="sm" asChild className="border-border/60 bg-card/50 hover:bg-card">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Main Site</span>
                </Link>
              </Button>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border/50">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:inline max-w-[150px] truncate">
                {user?.user_metadata?.full_name || user?.email}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive h-9 w-9"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome section */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2"
        >
          <h2 className="text-3xl font-bold text-foreground">
            Welcome back
            {user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isOrganizer
              ? 'Manage your events, set up locations, and track engagement.'
              : 'View your photos and events.'}
          </p>
        </motion.div>
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        {isOrganizer ? <OrganizerDashboard /> : <AttendeeDashboard />}
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
