import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createServerClient();
    
    // 1. Sign out of Supabase (This automatically clears the session cookies)
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase signout error:', error.message);
    }
  } catch (error) {
    console.error('[GET /api/auth/logout] Unexpected error:', error);
  }

  // 2. Force a redirect back to the login page
  // We use NextResponse.redirect to ensure the browser navigates away from the protected areas
  return NextResponse.redirect(new URL('/login', request.url));
}