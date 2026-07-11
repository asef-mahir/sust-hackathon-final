/**
 * components/dashboard/RecentActivity.js
 *
 * Independent async Server Component — calls GET /api/simulation/history
 * (API 7). Chosen as the "Recent Activity" data source instead of a
 * transaction table, since no transaction-list endpoint exists yet (see
 * the gap flagged before this page was built) — this is real data, not a
 * substitute fabrication.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorCard } from '@/components/shared/ErrorCard';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
};

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export async function RecentActivity() {
  const { ok, body } = await serverApiFetch('/api/simulation/history?limit=5');

  return (
    <Card className="bg-surface border-white/10">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white/80">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ok ? (
          <ErrorCard message={body?.message ?? 'Could not load recent activity.'} />
        ) : body.data.runs.length === 0 ? (
          <EmptyState
            title="No simulations run yet"
            description="Activity from the Simulation Cockpit will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {body.data.runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0"
              >
                <div>
                  <span className="text-white/80">
                    {SCENARIO_LABELS[run.scenarioType] ?? run.scenarioType}
                  </span>
                  <span className="ml-2 text-xs text-white/40">
                    {run.agent?.outletCode} · {run.triggeredBy?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="ls-numeric">{run.alertsCreated} alerts</span>
                  <span>{formatRelativeTime(run.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
