'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type Role } from '@/integrations/supabase/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Where to redirect unauthenticated users (default: "/login") */
  redirectTo?: string;
  /** If set, only users with this role can access the route */
  requiredRole?: Role;
}

/**
 * Wraps any route that requires authentication.
 * While the auth state is loading, a centered spinner is displayed.
 * If the user is not logged in, they are redirected to `redirectTo`.
 * If requiredRole is set, users without that role are redirected to `/dashboard`.
 */
export function ProtectedRoute({ children, redirectTo = '/login', requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
    if (!loading && user && requiredRole && role !== null && role !== requiredRole) {
      router.replace('/dashboard');
    }
  }, [user, role, loading, redirectTo, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
