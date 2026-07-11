/**
 * app/analytics/page.js
 *
 * PAGE 6 — Analytics (route: "/analytics")
 *
 * Server Component. Reuses API 4 (dashboard) for provider balances +
 * top risk areas, the new /api/analytics/areas for the fuller area
 * comparison table. Forecasting section is an honest empty state — see
 * the gap check before this page was built.
 */

import { serverApiFetch } from '@/lib/serverApiFetch';
import { ProviderComparisonChart } from '@/components/analytics/ProviderComparisonChart';
import { AreaComparisonTable } from '@/components/analytics/AreaComparisonTable';
import { ForecastingEmptyState } from '@/components/analytics/ForecastingEmptyState';
import { RiskBoard } from '@/components/dashboard/RiskBoard';
import { ErrorCard } from '@/components/shared/ErrorCard';

export default async function AnalyticsPage() {
  const [dashboardResult, areasResult] = await Promise.all([
    serverApiFetch('/api/dashboard'),
    serverApiFetch('/api/analytics/areas'),
  ]);

  if (!dashboardResult.ok) {
    return (
      <div>
        <PageHeader />
        <div className="mt-6">
          <ErrorCard message={dashboardResult.body?.message ?? 'Could not load analytics.'} />
        </div>
      </div>
    );
  }

  const { providerBalances, topRiskAreas } = dashboardResult.body.data;
  const areas = areasResult.ok ? areasResult.body.data.areas : [];

  return (
    <div>
      <PageHeader />

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderComparisonChart providerBalances={providerBalances} />
        <RiskBoard topRiskAreas={topRiskAreas} />
      </section>

      <section className="mt-4">
        <AreaComparisonTable areas={areas} />
      </section>

      <section className="mt-4">
        <ForecastingEmptyState />
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-white/10 pb-4">
      <h1 className="text-lg font-semibold text-white">Analytics</h1>
      <p className="text-xs text-white/40">Network-wide comparison and trends</p>
    </header>
  );
}
