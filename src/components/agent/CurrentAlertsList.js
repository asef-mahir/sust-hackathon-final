/**
 * components/agent/CurrentAlertsList.js
 *
 * Reuses StatusPill and RiskBadge (already shared) rather than
 * AlertFeedItem — that component expects a nested `agent` object for
 * display, which is redundant here since this list is already scoped to
 * one agent. Links through to /alerts/[id], which AGENT-role users are
 * authorized to view for their own outlet's alerts (API 6's self-scoping).
 */

import Link from 'next/link';
import { StatusPill } from '@/components/shared/StatusPill';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { EmptyState } from '@/components/shared/EmptyState';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
};

/**
 * @param {{ alerts: Object[] }} props - Agent.alerts from API 3
 */
export function CurrentAlertsList({ alerts }) {
  if (alerts.length === 0) {
    return <EmptyState title="No active alerts for your outlet right now." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          href={`/alerts/${alert.id}`}
          className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-800">
              {SCENARIO_LABELS[alert.scenarioType] ?? alert.scenarioType}
            </span>
            <StatusPill status={alert.status} />
          </div>
          <RiskBadge confidence={alert.confidence} />
        </Link>
      ))}
    </div>
  );
}
