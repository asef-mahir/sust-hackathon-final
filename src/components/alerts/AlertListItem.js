/**
 * components/alerts/AlertListItem.js
 *
 * One alert card in the Incident Command queue. Purely presentational,
 * links through to Page 4. Shape matches API 5's `alerts[]` entries
 * directly (agent/provider/owner already included by that endpoint).
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusPill } from '@/components/shared/StatusPill';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
};

function formatRelativeTime(isoString) {
  const diffMinutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.round(diffMinutes / 60)}h ago`;
}

/**
 * @param {Object} alert - one entry from GET /api/alerts
 */
export function AlertListItem(alert) {
  const { id, scenarioType, status, confidence, agent, provider, owner, createdAt } = alert;

  return (
    <Link href={`/alerts/${id}`}>
      <Card className="border-white/10 bg-surface transition-colors hover:bg-white/[0.04]">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">
                {SCENARIO_LABELS[scenarioType] ?? scenarioType}
              </p>
              <StatusPill status={status} />
            </div>
            <p className="mt-1 truncate text-xs text-white/40">
              {agent?.outletCode} · {provider?.name ?? 'Network-wide'} ·{' '}
              {owner ? `Owned by ${owner.name}` : 'Unassigned'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <RiskBadge confidence={confidence} />
            <span className="text-xs text-white/30">{formatRelativeTime(createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
