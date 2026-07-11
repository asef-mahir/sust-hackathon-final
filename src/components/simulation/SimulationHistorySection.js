/**
 * components/simulation/SimulationHistorySection.js
 *
 * Independent async Server Component — own GET /api/simulation/history
 * call, own <Suspense> boundary at the page level, own error handling.
 * Hands its first page to SimulationHistoryTable (client) for further
 * pagination.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { ErrorCard } from '@/components/shared/ErrorCard';
import { SimulationHistoryTable } from './SimulationHistoryTable';

export async function SimulationHistorySection() {
  const { ok, body } = await serverApiFetch('/api/simulation/history?limit=10');

  return (
    <Card className="bg-surface border-white/10">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white/80">
          Execution History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ok ? (
          <ErrorCard message={body?.message ?? 'Could not load simulation history.'} />
        ) : (
          <SimulationHistoryTable
            initialRuns={body.data.runs}
            initialNextCursor={body.data.pagination.nextCursor}
          />
        )}
      </CardContent>
    </Card>
  );
}
