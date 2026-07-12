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

    // 1. Fetch Agent & Active Alerts
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
            evidence: true,      
            explanations: true,  
          },
        },
      },
    });

    if (!agent) {
      return errorResponse(`Agent not found: ${agentId}`, 404);
    }

    // 2. Fetch Recent Transactions for Dashboard Graphs
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await prisma.transaction.findMany({
      where: { 
        agentId: agentId,
        timestamp: { gte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to recent 50 for the graph to keep the payload light
      select: {
        id: true,
        type: true,
        amount: true,
        timestamp: true,
        provider: { select: { code: true } }
      }
    });

    // Calculate Daily Stats for the Graph Header
    let totalCashIn = 0;
    let totalCashOut = 0;
    const chartDataFormatted = recentTransactions.map(tx => {
      const amt = tx.amount.toNumber();
      if (tx.type === 'CASH_IN') totalCashIn += amt;
      if (tx.type === 'CASH_OUT') totalCashOut += amt;
      
      return {
        timestamp: tx.timestamp,
        amount: amt,
        type: tx.type,
        providerCode: tx.provider.code
      };
    });

    // 3. Calculate Balances
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

    // 4. Determine Banner State (Negative Checks FIRST)
    let forecast = null;
    const negativeProviders = providerBalancesRaw.filter(p => p.balanceNumber < 0);

    if (negativeProviders.length > 0) {
      // Critical Error Override: Triggers the red UI banner on the frontend
      forecast = {
        isCriticalError: true,
        errorType: 'NEGATIVE_BALANCE',
        details: negativeProviders.map(p => ({
          name: p.providerName,
          amount: p.balanceNumber
        }))
      };
    } else {
      // Standard AI Forecast Generation (Only runs if balances are valid)
      const hiddenShortageAlert = agent.alerts.find(a => a.scenarioType === 'HIDDEN_SHORTAGE');
      
      if (hiddenShortageAlert && hiddenShortageAlert.evidence) {
        const evidenceData = typeof hiddenShortageAlert.evidence === 'string'
          ? JSON.parse(hiddenShortageAlert.evidence)
          : hiddenShortageAlert.evidence;

        // Fetch dynamic burn rate from evidence, fallback to a default (e.g. 4500) if missing
        const hourlyBurnRate = evidenceData.hourlyBurnRate || 4500;

        // --- NEW DYNAMIC PEAK TARGET LOGIC ---
        // Always format/derive against Bangladesh time (Asia/Dhaka)
        const dhakaNowString = new Date().toLocaleString("en-US", { timeZone: 'Asia/Dhaka' });
        const dhakaNow = new Date(dhakaNowString);
        const currentHour = dhakaNow.getHours();
        
        let targetDate = new Date(dhakaNow);
        let targetTimeLabel = '';

        if (currentHour < 10) {
          // Target is 10:00 AM today
          targetDate.setHours(10, 0, 0, 0);
          targetTimeLabel = '10:00 AM';
        } else if (currentHour < 16) {
          // Target is 4:00 PM today
          targetDate.setHours(16, 0, 0, 0);
          targetTimeLabel = '4:00 PM';
        } else {
          // Target is 10:00 AM tomorrow
          targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(10, 0, 0, 0);
          targetTimeLabel = '10:00 AM (Tomorrow)';
        }

        // Calculate time difference in hours
        const diffMs = targetDate.getTime() - dhakaNow.getTime();
        const hoursRemaining = diffMs / (1000 * 60 * 60);

        // Calculate dynamic amount based on hours remaining & round up to nearest 100 for clean numbers
        const exactRequiredAmount = hoursRemaining * hourlyBurnRate;
        const requiredAmount = Math.ceil(exactRequiredAmount / 100) * 100;

        forecast = {
          isCriticalError: false,
          criticalTime: targetTimeLabel,
          periodBn: 'দিন', // 10 AM and 4 PM are always daytime
          requiredAmount,
          hourlyBurnRate: Math.round(hourlyBurnRate),
          minutesRemaining: Math.floor(diffMs / (1000 * 60)),
          primaryRiskVector: evidenceData.primaryRiskVector || 'PROVIDER_BALANCE',
          providerCode: evidenceData.thinProvider?.providerCode || null
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
          forecast,
        },
        activeAlerts: agent.alerts,
        // Payload for the Agent's frontend charts
        chartData: {
          dailyStats: {
            totalCashIn,
            totalCashOut,
            netFlow: totalCashOut - totalCashIn // Positive means losing physical cash
          },
          recentTransactions: chartDataFormatted
        }
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