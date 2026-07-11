/**
 * components/alerts/AlertSummaryHeader.js
 *
 * Top-of-page summary: the "what happened, how severe, who owns it" the
 * whole app's UI storytelling principle asks every page to answer
 * immediately.
 */

import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusPill } from '@/components/shared/StatusPill';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Provider Shortage',
  HIGH_VELOCITY: 'High Velocity / Unusual Activity',
};

/**
 * @param {{ alert: Object }} props
 */
export function AlertSummaryHeader({ alert }) {
  return (
    <header className="border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-white">
          {SCENARIO_LABELS[alert.scenarioType] ?? alert.scenarioType}
        </h1>
        <StatusPill status={alert.status} />
        <RiskBadge confidence={alert.confidence} />
      </div>
      <p className="mt-1 text-sm text-white/50">
        {alert.agent?.outletCode} ({alert.agent?.name})
        {alert.provider ? ` · ${alert.provider.name}` : ' · Network-wide'}
        {alert.owner ? ` · Owned by ${alert.owner.name}` : ' · Unassigned'}
      </p>
      <p className="mt-1 text-xs text-white/30">
        Opened {new Date(alert.createdAt).toLocaleString()}
      </p>
    </header>
  );
}
