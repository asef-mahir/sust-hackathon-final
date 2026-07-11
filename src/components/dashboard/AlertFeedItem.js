/**
 * components/dashboard/AlertFeedItem.js
 *
 * One row in the dashboard's live alert ticker. Links through to Page 4
 * (Alert Details) — this component itself does no data fetching or
 * mutation, purely presentational + a Link.
 */

import Link from 'next/link';
import { RiskBadge } from '@/components/shared/RiskBadge';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
};

/**
 * @param {{ id: string, scenarioType: string, status: string, confidence: string, agent: { name: string, outletCode: string }, createdAt: string }} props
 */
export function AlertFeedItem({ id, scenarioType, status, confidence, agent, createdAt }) {
  return (
    <Link
      href={`/alerts/${id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100"
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-900">
          {SCENARIO_LABELS[scenarioType] ?? scenarioType}
        </p>
        <p className="truncate text-xs text-slate-500">
          {agent?.outletCode ?? 'Unknown outlet'} · {status}
        </p>
      </div>
      <RiskBadge confidence={confidence} />
    </Link>
  );
}