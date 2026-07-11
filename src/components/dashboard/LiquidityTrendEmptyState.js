/**
 * components/dashboard/LiquidityTrendEmptyState.js
 *
 * Deliberate empty state rather than a fabricated chart. No endpoint
 * currently returns historical liquidity snapshots — only point-in-time
 * state. Faking a trend line here would mean inventing numbers that don't
 * exist, which the engineering standards this app was built under
 * explicitly rule out. This is what an honest "not yet available" looks
 * like on a fintech-grade dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendingUp } from 'lucide-react';

export function LiquidityTrendEmptyState() {
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-900">
          Liquidity Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="Historical trend not yet available"
          description="This requires periodic liquidity snapshots, which aren't captured yet. Current state is shown in the cards above — trend tracking is a planned follow-up, not a missing feature we're hiding."
        />
      </CardContent>
    </Card>
  );
}