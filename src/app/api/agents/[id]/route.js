import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

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
            evidence: true,      
            explanations: true,  
          },
        },
      },
    });

    if (!agent) {
      return errorResponse(`Agent not found: ${agentId}`, 404);
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await prisma.transaction.findMany({
      where: { 
        agentId: agentId,
        timestamp: { gte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        timestamp: true,
        provider: { select: { code: true } }
      }
    });

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

    // 4. Determine Banner State
    let forecast = null;
    const negativeProviders = providerBalancesRaw.filter(p => p.balanceNumber < 0);

    if (negativeProviders.length > 0) {
      forecast = {
        isCriticalError: true,
        errorType: 'NEGATIVE_BALANCE',
        details: negativeProviders.map(p => ({
          name: p.providerName,
          amount: p.balanceNumber
        }))
      };
    } else {
      // ALWAYS calculate a forecast even if healthy
      const hiddenShortageAlert = agent.alerts.find(a => a.scenarioType === 'HIDDEN_SHORTAGE');
      
      let hourlyBurnRate = 0;
      let projectedDepletionMinutes = 0;
      let primaryRiskVector = 'PROVIDER_BALANCE';
      let providerCode = null;
      let isHealthy = true;

      if (hiddenShortageAlert && hiddenShortageAlert.evidence) {
        const evidenceData = typeof hiddenShortageAlert.evidence === 'string'
          ? JSON.parse(hiddenShortageAlert.evidence)
          : hiddenShortageAlert.evidence;
        hourlyBurnRate = evidenceData.hourlyBurnRate || 4500;
        projectedDepletionMinutes = evidenceData.projectedDepletionMinutes || 0;
        primaryRiskVector = evidenceData.primaryRiskVector || 'PROVIDER_BALANCE';
        providerCode = evidenceData.thinProvider?.providerCode || null;
        isHealthy = false;
      } else {
        // Safe baseline based on 24h activity
        hourlyBurnRate = (totalCashOut / 24) || 2000; 
        projectedDepletionMinutes = hourlyBurnRate > 0 ? Math.floor((totalLiquidityNumber / hourlyBurnRate) * 60) : 9999;
      }

      // --- DYNAMIC PEAK TARGET LOGIC ---
      const dhakaNowString = new Date().toLocaleString("en-US", { timeZone: 'Asia/Dhaka' });
      const dhakaNow = new Date(dhakaNowString);
      const currentHour = dhakaNow.getHours();
      
      let targetDate = new Date(dhakaNow);
      let targetTimeLabel = '';

      if (currentHour < 10) {
        targetDate.setHours(10, 0, 0, 0);
        targetTimeLabel = '10:00 AM';
      } else if (currentHour < 16) {
        targetDate.setHours(16, 0, 0, 0);
        targetTimeLabel = '4:00 PM';
      } else {
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(10, 0, 0, 0);
        targetTimeLabel = '10:00 AM (Tomorrow)';
      }

      const diffMs = targetDate.getTime() - dhakaNow.getTime();
      const hoursRemaining = diffMs / (1000 * 60 * 60);

      const exactRequiredAmount = hoursRemaining * hourlyBurnRate;
      const requiredAmount = Math.ceil(exactRequiredAmount / 100) * 100;

      forecast = {
        isCriticalError: false,
        isHealthy,
        criticalTime: targetTimeLabel,
        periodBn: 'দিন',
        requiredAmount: Math.max(0, requiredAmount),
        hourlyBurnRate: Math.round(hourlyBurnRate),
        minutesRemaining: projectedDepletionMinutes,
        primaryRiskVector,
        providerCode
      };
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
        chartData: {
          dailyStats: {
            totalCashIn,
            totalCashOut,
            netFlow: totalCashOut - totalCashIn
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