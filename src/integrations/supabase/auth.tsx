'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import supabase from '@/util/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Role = 'organizer' | 'attendee';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: Role | null;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'linkedin_oidc') => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchRole(userId: string): Promise<Role> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return (data?.role as Role) ?? 'attendee';
}

/** Creates a profile row if one doesn't exist yet (handles both email and OAuth sign-ups). */
async function ensureProfile(user: User): Promise<void> {
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const role = user.user_metadata?.role ?? 'attendee';

  // Insert if new; update full_name (but not role) if it was previously null
  const { data: existing } = await (supabase as any)
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    await (supabase as any).from('profiles').insert({
      id: user.id,
      full_name: fullName,
      role,
    });
  } else if (!existing.full_name && fullName) {
    await (supabase as any)
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    role: null,
  });

  useEffect(() => {
    // Bootstrap: load existing session + role from storage
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const role = session?.user ? await fetchRole(session.user.id).catch(() => 'attendee' as Role) : null;
        setState({ user: session?.user ?? null, session, loading: false, role });
      } catch (err) {
        console.error('[Auth] init error:', err);
        setState({ user: null, session: null, loading: false, role: null });
      }
    };
    init();

    // Keep in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user && event === 'SIGNED_IN') {
            await ensureProfile(session.user).catch((err) =>
              console.error('[Auth] ensureProfile error (non-fatal):', err),
            );
          }
          const role = session?.user
            ? await fetchRole(session.user.id).catch(() => 'attendee' as Role)
            : null;
          setState({ user: session?.user ?? null, session, loading: false, role });
        } catch (err) {
          console.error('[Auth] onAuthStateChange error:', err);
          // Still update auth state so loading doesn't stay true forever
          setState({ user: session?.user ?? null, session, loading: false, role: null });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    // Create profile immediately so role is available even before email confirmation
    if (!error && data.user) {
      await (supabase as any).from('profiles').insert({
        id: data.user.id,
        full_name: metadata?.full_name as string ?? null,
        role: metadata?.role as string ?? 'attendee',
      });
    }
    return { error };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Always clear local state to ensure the UI reflects signed-out status
    setState({ user: null, session: null, loading: false, role: null });
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    const role = session?.user ? await fetchRole(session.user.id).catch(() => 'attendee' as Role) : null;
    setState({ user: session?.user ?? null, session, loading: false, role });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signInWithMagicLink,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
