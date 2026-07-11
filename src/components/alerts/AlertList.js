'use client';

/**
 * components/alerts/AlertList.js
 *
 * Receives its first (filtered) page pre-rendered from the server, then
 * manages further pages itself via plain browser fetch. Reads current
 * filters from the URL so "Load more" fetches the next page of the SAME
 * filtered view, not an unfiltered one.
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AlertListItem } from './AlertListItem';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * @param {{ initialAlerts: Object[], initialNextCursor: string | null }} props
 */
export function AlertList({ initialAlerts, initialNextCursor }) {
  const searchParams = useSearchParams();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('cursor', nextCursor);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setAlerts((prev) => [...prev, ...result.data.alerts]);
        setNextCursor(result.data.pagination.nextCursor);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts match these filters"
        description="Try widening your filters, or trigger a scenario from the Simulation Cockpit."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <AlertListItem key={alert.id} {...alert} />
      ))}

      {nextCursor ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="mt-2 self-center border-slate-200 text-slate-600"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading…
            </>
          ) : (
            'Load more'
          )}
        </Button>
      ) : null}
    </div>
  );
}
