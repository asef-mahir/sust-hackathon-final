import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createServerClient = () => {
  const cookieStore = cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The request was a Server Component; mutate downstream cookies via middleware
          }
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // The request was a Server Component; mutate downstream cookies via middleware
          }
        },
      },
    }
  );
};