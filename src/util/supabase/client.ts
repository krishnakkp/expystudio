import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase public key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)',
      );
    }
    _client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Must match the server-side PKCE flow used in /auth/callback/route.ts.
        // Using 'implicit' here while the server does exchangeCodeForSession (PKCE)
        // causes two competing Navigator.locks acquisitions on the same storage key,
        // resulting in the 10 000ms lock timeout.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return _client;
}

// Proxy so callers can use `supabase.from(...)` etc. without changing call sites
const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return getClient()[prop as keyof SupabaseClient<Database>];
  },
});

export default supabase;
