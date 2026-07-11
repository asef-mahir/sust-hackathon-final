import { Suspense } from 'react';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { formatCurrency } from '@/lib/formatCurrency';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ProviderCard } from '@/components/dashboard/ProviderCard';
import { RiskBoard } from '@/components/dashboard/RiskBoard';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LiquidityTrendEmptyState } from '@/components/dashboard/LiquidityTrendEmptyState';
import { ErrorCard } from '@/components/shared/ErrorCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertTriangle, ShieldAlert, Wallet, ArrowLeftRight } from 'lucide-react';

function SectionSkeleton() {
  return <Skeleton className="h-48 w-full rounded-lg bg-white/5" />;
}

export default async function DashboardPage() {
  const { ok, body } = await serverApiFetch('/api/dashboard');

  if (!ok) {
    return (
      <div>
        <DashboardHeader />
        <div className="mt-6">
          <ErrorCard
            message={body?.message ?? 'Could not load dashboard data. Please refresh.'}
          />
        </div>
      </div>
    );
  }

  const {
    totalAgents,
    activeAlerts,
    criticalAlerts,
    cashAvailability,
    providerBalances,
    topRiskAreas,
    todaysTransactions,
  } = body.data;

  // Network-wide provider share, derived here from real totals returned
  // by API 4 — arithmetic on real data, not a new data source.
  const networkTotal = providerBalances.reduce(
    (sum, p) => sum + parseFloat(p.totalBalance),
    0
  );
  const providersWithShare = providerBalances.map((p) => ({
    ...p,
    shareOfTotal: networkTotal > 0 ? parseFloat(p.totalBalance) / networkTotal : 0,
  }));

  return (
    <div>
      <DashboardHeader />

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total Agents" value={String(totalAgents)} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Active Alerts"
          value={String(activeAlerts)}
          tone="brass"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Critical Alerts"
          value={String(criticalAlerts)}
          tone="critical"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Cash Availability"
          value={formatCurrency(cashAvailability, { compact: true })}
          tone="healthy"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Today's Transactions"
          value={String(todaysTransactions)}
          icon={<ArrowLeftRight className="h-5 w-5" />}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div>
            <h2 className="mb-2 text-sm font-medium text-white/60">
              Provider Distribution
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {providersWithShare.map((p) => (
                <ProviderCard key={p.providerId} {...p} />
              ))}
            </div>
          </div>

          <RiskBoard topRiskAreas={topRiskAreas} />

          <LiquidityTrendEmptyState />
        </div>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<SectionSkeleton />}>
            <AlertFeed />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
      </section>
    </div>
  );
}