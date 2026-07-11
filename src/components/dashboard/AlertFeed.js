/**
 * components/dashboard/AlertFeed.js
 *
 * Independent async Server Component — calls GET /api/alerts (API 5)
 * directly, separately from the page's main API 4 call. Wrapped in its
 * own <Suspense> by the page, so a slow alerts query streams in without
 * blocking the vitals/provider cards above it. Catches its own errors so
 * one failing widget doesn't crash the whole dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { AlertFeedItem } from './AlertFeedItem';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorCard } from '@/components/shared/ErrorCard';

export async function AlertFeed() {
  const { ok, body } = await serverApiFetch('/api/alerts?status=PENDING&limit=5');

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-900">
          Live Alert Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ok ? (
          <ErrorCard message={body?.message ?? 'Could not load alerts.'} />
        ) : body.data.alerts.length === 0 ? (
          <EmptyState
            title="No pending alerts"
            description="Trigger a scenario from the Simulation Cockpit to see the system respond here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {body.data.alerts.map((alert) => (
              <AlertFeedItem key={alert.id} {...alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}