
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async (cookieStorePromise: ReturnType<typeof cookies>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  if (!supabaseKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');

  const cookieStore = await cookieStorePromise;
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
