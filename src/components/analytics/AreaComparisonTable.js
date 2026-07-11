/**
 * components/analytics/AreaComparisonTable.js
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * @param {{ areas: { areaId: string, areaName: string, agentCount: number, totalLiquidity: string, openAlertCount: number }[] }} props
 */
export function AreaComparisonTable({ areas }) {
  return (
    <Card className="bg-surface border-white/10">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white/80">Area Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <EmptyState title="No areas configured yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="py-2 font-medium">Area</th>
                <th className="py-2 font-medium">Agents</th>
                <th className="py-2 font-medium">Total Liquidity</th>
                <th className="py-2 font-medium">Open Alerts</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.areaId} className="border-b border-white/5 text-white/70">
                  <td className="py-2">{area.areaName}</td>
                  <td className="ls-numeric py-2">{area.agentCount}</td>
                  <td className="ls-numeric py-2">
                    {formatCurrency(area.totalLiquidity, { compact: true })}
                  </td>
                  <td className="ls-numeric py-2">{area.openAlertCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
