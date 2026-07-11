import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const TOP_RISK_AREAS_LIMIT = 5;

export async function GET() {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalAgents,
      activeAlertsCount,
      criticalAlertsCount,
      cashAggregate,
      providerBalanceGroups,
      providers,
      openAlertsWithArea,
      todaysTransactionsCount,
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.alert.count({ where: { status: { in: OPEN_ALERT_STATUSES } } }),
      prisma.alert.count({
        where: { status: { in: OPEN_ALERT_STATUSES }, confidence: 'HIGH' },
      }),
      prisma.agent.aggregate({ _sum: { physicalCash: true } }),
      prisma.providerBalance.groupBy({
        by: ['providerId'],
        _sum: { balance: true },
      }),
      prisma.provider.findMany(),
      prisma.alert.findMany({
        where: { status: { in: OPEN_ALERT_STATUSES } },
        select: {
          agent: { select: { areaId: true, area: { select: { name: true } } } },
        },
      }),
      prisma.transaction.count({ where: { timestamp: { gte: startOfToday } } }),
    ]);

    const providerById = new Map(providers.map((p) => [p.id, p]));
    const providerBalances = providerBalanceGroups.map((group) => {
      const provider = providerById.get(group.providerId);
      return {
        providerId: group.providerId,
        providerCode: provider?.code ?? 'UNKNOWN',
        providerName: provider?.name ?? 'Unknown',
        totalBalance: (group._sum.balance ?? 0).toString(),
      };
    });

    // Area-level alert counts computed in JS: Prisma can't groupBy on a
    // field one relation away (Alert -> Agent -> Area) in a single query,
    // and at hackathon data volumes this in-memory reduce is negligible
    // cost versus the complexity of a raw SQL query for the same result.
    const areaCounts = new Map();
    for (const row of openAlertsWithArea) {
      const areaId = row.agent?.areaId;
      if (!areaId) continue;
      const existing = areaCounts.get(areaId) ?? {
        areaId,
        areaName: row.agent.area?.name ?? 'Unknown',
        alertCount: 0,
      };
      existing.alertCount += 1;
      areaCounts.set(areaId, existing);
    }
    const topRiskAreas = Array.from(areaCounts.values())
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, TOP_RISK_AREAS_LIMIT);

    return successResponse(
      {
        totalAgents,
        activeAlerts: activeAlertsCount,
        criticalAlerts: criticalAlertsCount,
        cashAvailability: (cashAggregate._sum.physicalCash ?? 0).toString(),
        providerBalances,
        topRiskAreas,
        todaysTransactions: todaysTransactionsCount,
      },
      'Dashboard summary retrieved.'
    );
  } catch (error) {
    console.error('[GET /api/dashboard]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}