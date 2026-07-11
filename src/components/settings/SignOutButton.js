'use client';

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
    
    // Clear the Supabase session
    await supabase.auth.signOut();
    
    // Redirect to login and force Next.js Server Components to re-evaluate
    router.push('/login');
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="border-slate-200 text-slate-700 hover:bg-slate-100"
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