/**
 * components/dashboard/ProviderCard.js
 *
 * One card per provider (bKash / Nagad / Rocket), showing network-wide
 * total balance for that provider plus the signature LiquidityGauge.
 * Data shape matches API 4's `providerBalances` entries directly.
 */

import { Card, CardContent } from '@/components/ui/card';
import { LiquidityGauge } from './LiquidityGauge';
import { formatCurrency } from '@/lib/formatCurrency';

const PROVIDER_ACCENTS = {
  BKASH: 'text-provider-a',
  NAGAD: 'text-provider-b',
  ROCKET: 'text-provider-c',
};

/**
 * @param {{ providerCode: string, providerName: string, totalBalance: string, shareOfTotal: number }} props
 */
export function ProviderCard({ providerCode, providerName, totalBalance, shareOfTotal }) {
  const accentClass = PROVIDER_ACCENTS[providerCode] ?? 'text-slate-900';

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${accentClass}`}>{providerName}</span>
          <span className="ls-numeric text-lg font-semibold text-slate-900">
            {formatCurrency(totalBalance, { compact: true })}
          </span>
        </div>
        <LiquidityGauge
          ratio={shareOfTotal ?? 0}
          label={`${((shareOfTotal ?? 0) * 100).toFixed(1)}% of network liquidity`}
        />
      </CardContent>
    </Card>
  );
}