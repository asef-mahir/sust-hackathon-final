'use client';

/**
 * components/analytics/ProviderComparisonChart.js
 *
 * Recharts is in the finalized stack but hadn't been used yet — every
 * prior "chart" was actually the custom LiquidityGauge or a plain div
 * bar (RiskBoard). This is genuinely a comparison-across-categories case,
 * where a real bar chart earns its place over a custom component.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/**
 * @param {{ providerBalances: { providerCode: string, providerName: string, totalBalance: string }[] }} props
 */
export function ProviderComparisonChart({ providerBalances }) {
  const data = providerBalances.map((p) => ({
    name: p.providerName,
    balance: parseFloat(p.totalBalance),
  }));

  return (
    <Card className="bg-surface border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-800">
          Provider Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#16262B', border: '1px solid rgba(255,255,255,0.1)' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="balance" fill="#C8963E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
