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
  // Skeleton color already matches the light theme
  return <Skeleton className="h-48 w-full rounded-xl bg-slate-200" />;
}

export default async function OpsDashboardPage() {
  const { ok, body } = await serverApiFetch('/api/dashboard');

  if (!ok) {
    return (
      <div className="space-y-6 text-slate-900">
        <DashboardHeader title="Operations Command Center" />
        <ErrorCard
          message={body?.message ?? 'Could not load dashboard data. Please refresh.'}
        />
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

  // Network-wide provider share, derived from real totals returned by the API
  const networkTotal = providerBalances.reduce(
    (sum, p) => sum + parseFloat(p.totalBalance),
    0
  );
  
  const providersWithShare = providerBalances.map((p) => ({
    ...p,
    shareOfTotal: networkTotal > 0 ? parseFloat(p.totalBalance) / networkTotal : 0,
  }));

  return (
    // Added text-slate-900 here to ensure all default text is dark
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-900">
      
      <DashboardHeader title="Operations Command Center" />

      {/* Top Stats Row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total Agents" value={String(totalAgents)} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Active Alerts"
          value={String(activeAlerts)}
          tone="warning" 
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
          label="Today's Txns"
          value={String(todaysTransactions)}
          icon={<ArrowLeftRight className="h-5 w-5" />}
        />
      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Column (Wider for Analytics & Trends) */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          
          {/* Provider Distribution */}
          <div>
            {/* Updated heading to text-slate-700 for better contrast on white */}
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Provider Distribution
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {providersWithShare.map((p) => (
                <ProviderCard key={p.providerId} {...p} />
              ))}
            </div>
          </div>

          {/* Risk Board */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Network Risk Overview
            </h2>
            <RiskBoard topRiskAreas={topRiskAreas} />
          </div>

          {/* Trend Chart */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Liquidity Trends
            </h2>
            <LiquidityTrendEmptyState />
          </div>
        </div>

        {/* Right Column (Narrower for Feeds & Activity) */}
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-col">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Live Alert Feed
            </h2>
            <Suspense fallback={<SectionSkeleton />}>
              <AlertFeed />
            </Suspense>
          </div>

          <div className="flex flex-col">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Activity
            </h2>
            <Suspense fallback={<SectionSkeleton />}>
              <RecentActivity />
            </Suspense>
          </div>
          
        </div>
      </section>
    </div>
  );
}