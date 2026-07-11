import { createBrowserClient } from '@supabase/ssr';

// We export it as `createClient` so your SignOutButton import works perfectly
export const createClient = () => 
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );