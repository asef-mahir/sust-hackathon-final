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
            evidence: true,      // FIXED: Missing database field included
            explanations: true,  // FIXED: Missing database field included
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

    // -------------------------------------------------------------------------
    // Dynamic Predictive Cash Forecast Generation (Operational Component Data)
    // -------------------------------------------------------------------------
    let forecast = null;
    const hiddenShortageAlert = agent.alerts.find(a => a.scenarioType === 'HIDDEN_SHORTAGE');
    
    if (hiddenShortageAlert && hiddenShortageAlert.evidence) {
      const evidenceData = typeof hiddenShortageAlert.evidence === 'string'
        ? JSON.parse(hiddenShortageAlert.evidence)
        : hiddenShortageAlert.evidence;

      if (evidenceData.projectedDepletionMinutes) {
        const criticalTime = new Date(
          new Date(hiddenShortageAlert.createdAt).getTime() + 
          evidenceData.projectedDepletionMinutes * 60 * 1000
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Target target threshold buffer rule
        const requiredAmount = Math.max(
          20000,
          Math.round((evidenceData.hourlyBurnRate || 0) * (evidenceData.projectedDepletionMinutes / 60) * 1.5)
        );

        forecast = {
          criticalTime,
          requiredAmount,
          hourlyBurnRate: Math.round(evidenceData.hourlyBurnRate || 0),
          minutesRemaining: evidenceData.projectedDepletionMinutes
        };
      }
    }

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
          forecast, // Formatted dynamic predictive data for front-end view card
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