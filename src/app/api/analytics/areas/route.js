/**
 * app/api/analytics/areas/route.js
 *
 * GET /api/analytics/areas
 *
 * Prerequisite for Page 6's "Area Comparison" — API 4's topRiskAreas only
 * returns the top 5 by alert count. This returns every area with real
 * aggregated liquidity + alert figures, for a fuller comparison table.
 */

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

export async function GET() {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const areas = await prisma.area.findMany({
      select: {
        id: true,
        name: true,
        agents: {
          select: {
            physicalCash: true,
            balances: { select: { balance: true } },
            alerts: { where: { status: { in: OPEN_ALERT_STATUSES } }, select: { id: true } },
          },
        },
      },
    });

    const comparison = areas.map((area) => {
      const agentCount = area.agents.length;
      const totalCash = area.agents.reduce(
        (sum, agent) => sum + agent.physicalCash.toNumber(),
        0
      );
      const totalProviderBalance = area.agents.reduce(
        (sum, agent) =>
          sum + agent.balances.reduce((s, b) => s + b.balance.toNumber(), 0),
        0
      );
      const openAlertCount = area.agents.reduce(
        (sum, agent) => sum + agent.alerts.length,
        0
      );

      return {
        areaId: area.id,
        areaName: area.name,
        agentCount,
        totalLiquidity: (totalCash + totalProviderBalance).toFixed(2),
        openAlertCount,
      };
    });

    return successResponse({ areas: comparison }, 'Area comparison retrieved.');
  } catch (error) {
    console.error('[GET /api/analytics/areas]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
