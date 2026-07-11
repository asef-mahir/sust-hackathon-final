'use client';

/**
 * components/settings/SignOutButton.js
 *
 * The real mechanism behind "Role Switch": sign out, then sign back in
 * as a different seeded demo account. A fake client-side role preview
 * was deliberately rejected — see the gap check before this page — since
 * the API layer enforces the real session role regardless of what the
 * UI shows, which would produce confusing 403s if they disagreed.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="border-white/10 text-white/70 hover:bg-white/5"
    >
      {isSigningOut ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-3.5 w-3.5" />
      )}
      Sign out
    </Button>
  );
}
