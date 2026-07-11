/**
 * components/analytics/ForecastingEmptyState.js
 *
 * Covers Risk Trend, Liquidity Forecast, AND Forecast Accuracy in one
 * honest section rather than three separate fake-looking empty cards.
 * None of these have a data source anywhere in this build: no historical
 * snapshot system, no forecastService was ever built. Same principle as
 * the Dashboard's Liquidity Trend empty state — don't fabricate numbers.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LineChart } from 'lucide-react';

export function ForecastingEmptyState() {
  return (
    <Card className="bg-surface border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-800">
          Risk Trend &amp; Forecasting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="Forecasting not yet available"
          description="Risk trend, liquidity forecast, and forecast accuracy all require historical snapshots and a forecasting model — neither exists yet in this build. What's shown elsewhere on this page is real, current-state data; this section is an honest placeholder for planned future work, not a hidden gap."
        />
      </CardContent>
    </Card>
  );
}
