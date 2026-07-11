'use client';

/**
 * components/simulation/SimulationHistoryTable.js
 *
 * Receives its first page pre-rendered from the server (fast initial
 * paint), then manages further pages itself via plain browser fetch —
 * cookies attach automatically same-origin, so this doesn't need the
 * RSC-only serverApiFetch helper.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
};

function formatDuration(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * @param {{ initialRuns: Object[], initialNextCursor: string | null }} props
 */
export function SimulationHistoryTable({ initialRuns, initialNextCursor }) {
  const [runs, setRuns] = useState(initialRuns);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);

    try {
      const response = await fetch(
        `/api/simulation/history?limit=10&cursor=${nextCursor}`
      );
      const result = await response.json();

      if (response.ok) {
        setRuns((prev) => [...prev, ...result.data.runs]);
        setNextCursor(result.data.pagination.nextCursor);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (runs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-white/40">
        No simulations run yet — use the scenario cards above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
            <th className="py-2 font-medium">Scenario</th>
            <th className="py-2 font-medium">Agent</th>
            <th className="py-2 font-medium">Triggered By</th>
            <th className="py-2 font-medium">Alerts</th>
            <th className="py-2 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-white/5 text-white/70">
              <td className="py-2">{SCENARIO_LABELS[run.scenarioType] ?? run.scenarioType}</td>
              <td className="py-2">{run.agent?.outletCode}</td>
              <td className="py-2">{run.triggeredBy?.name}</td>
              <td className="ls-numeric py-2">
                {run.alertsCreated} created
                {run.alertsSuppressed > 0 ? ` · ${run.alertsSuppressed} suppressed` : ''}
              </td>
              <td className="ls-numeric py-2">{formatDuration(run.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {nextCursor ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="mt-2 self-center border-white/10 text-white/60"
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
