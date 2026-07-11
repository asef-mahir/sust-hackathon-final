/**
 * components/dashboard/RiskBoard.js
 *
 * Ranked list of the areas with the most open alerts — built from API 4's
 * `topRiskAreas` (areaName + alertCount only). This is deliberately NOT a
 * geographic heatmap: that would need area centroid coordinates, which no
 * current endpoint returns. A ranked board is the honest representation
 * of the data that actually exists.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * @param {{ topRiskAreas: { areaId: string, areaName: string, alertCount: number }[] }} props
 */
export function RiskBoard({ topRiskAreas }) {
  const maxCount = Math.max(1, ...topRiskAreas.map((a) => a.alertCount));

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-900">
          Top Risk Areas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topRiskAreas.length === 0 ? (
          <EmptyState
            title="No open alerts right now"
            description="Areas will appear here ranked by active alert count once something is flagged."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {topRiskAreas.map((area) => (
              <div key={area.areaId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-slate-700">
                  {area.areaName}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-critical"
                    style={{ width: `${(area.alertCount / maxCount) * 100}%` }}
                  />
                </div>
                <span className="ls-numeric w-6 text-right text-sm text-slate-500">
                  {area.alertCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}