'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/integrations/supabase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Auth() {
  const { user, role, signInWithEmail, signUpWithEmail, signInWithOAuth, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !authLoading && role !== null) {
      router.replace(role === 'organizer' ? '/dashboard' : '/');
    }
  }, [user, authLoading, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, { role: isOrganizer ? 'organizer' : 'attendee' });
        if (error) throw error;
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account before signing in.',
        });
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await signInWithOAuth('google');
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message || 'Failed to sign in with Google.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await signInWithOAuth('linkedin_oidc');
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message || 'Failed to sign in with LinkedIn.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 gradient-hero">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-11 h-11 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
            <Camera className="w-5 h-5 text-accent-foreground" />
          </div>
        </Link>

        {/* Glass card */}
        <div className="gradient-glass rounded-2xl border border-border/50 shadow-card p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isSignUp
                ? 'Sign up to start creating event memories'
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary transition-colors"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary transition-colors"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot password */}
            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                  onClick={() =>
                    toast({
                      title: 'Password Reset',
                      description: 'Password reset functionality coming soon.',
                    })
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Organizer toggle (sign up only) */}
            {isSignUp && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50 cursor-pointer"
                onClick={() => setIsOrganizer(!isOrganizer)}
              >
                <Checkbox
                  id="isOrganizer"
                  checked={isOrganizer}
                  onCheckedChange={(v) => setIsOrganizer(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="isOrganizer" className="text-sm font-medium text-foreground cursor-pointer">
                    I'm an event organizer
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get access to event management and analytics
                  </p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
              disabled={isSubmitting || !email || !password}
            >
              {isSubmitting
                ? isSignUp ? 'Creating account…' : 'Signing in…'
                : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 gradient-glass text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Social login */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-border/60 bg-background/40 hover:bg-background/80 transition-all font-medium group"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-border/60 bg-background/40 hover:bg-background/80 transition-all font-medium group"
              onClick={handleLinkedInSignIn}
              disabled={isSubmitting}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Continue with LinkedIn
            </Button>
          </div>

          {/* Toggle sign up / sign in */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
