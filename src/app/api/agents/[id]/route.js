import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/** Statuses considered "active" for the activeAlerts summary. */
const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const { id: agentId } = await params;
    if (!agentId) {
      return errorResponse('Agent id is required.', 400);
    }

    // Security checkpoint: Agents can only view their own designated shop
    if (auth.owner.role === 'AGENT' && auth.owner.managedAgentId !== agentId) {
      return errorResponse('You are not authorized to view this agent.', 403);
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        balances: { include: { provider: true } },
        alerts: {
          where: { status: { in: OPEN_ALERT_STATUSES } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            scenarioType: true,
            status: true,
            confidence: true,
            providerId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!agent) {
      return errorResponse(`Agent not found: ${agentId}`, 404);
    }

    const physicalCashNumber = agent.physicalCash.toNumber();
    const providerBalancesRaw = agent.balances.map((b) => ({
      providerId: b.providerId,
      providerCode: b.provider.code,
      providerName: b.provider.name,
      balance: b.balance,
      balanceNumber: b.balance.toNumber(),
    }));

    const totalLiquidityNumber =
      physicalCashNumber +
      providerBalancesRaw.reduce((sum, p) => sum + p.balanceNumber, 0);

    const providerBalances = providerBalancesRaw.map((p) => ({
      providerId: p.providerId,
      providerCode: p.providerCode,
      providerName: p.providerName,
      balance: p.balance.toString(),
      shareOfTotal:
        totalLiquidityNumber > 0
          ? Number((p.balanceNumber / totalLiquidityNumber).toFixed(4))
          : 0,
    }));

    return successResponse(
      {
        agent: {
          id: agent.id,
          name: agent.name,
          outletCode: agent.outletCode,
          areaId: agent.areaId,
          latitude: agent.latitude,
          longitude: agent.longitude,
          physicalCash: agent.physicalCash.toString(),
          riskStatus: agent.riskStatus,
        },
        liquidity: {
          totalLiquidity: totalLiquidityNumber.toFixed(2),
          providerBalances,
        },
        activeAlerts: agent.alerts,
      },
      'Agent status retrieved.'
    );
  } catch (error) {
    console.error('[GET /api/agents/[id]]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}