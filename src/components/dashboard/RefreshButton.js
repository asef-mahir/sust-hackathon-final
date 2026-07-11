'use client';

/**
 * components/dashboard/RefreshButton.js
 *
 * The only client component on this page. Manual refresh instead of
 * polling, consistent with the route-API-only / router.refresh() pattern
 * already established for mutations elsewhere in the app.
 */

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="border-slate-200 text-slate-700 hover:bg-slate-50"
    >
      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Refreshing…' : 'Refresh'}
    </Button>
  );
}