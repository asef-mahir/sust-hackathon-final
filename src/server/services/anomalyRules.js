import { prisma } from '../../lib/prisma';

const HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD = 0.10;
const HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE = 0.05;
const MIN_HEALTHY_TOTAL_LIQUIDITY = 20000;
const MIN_PHYSICAL_CASH_THRESHOLD = 5000;
const TARGET_SURVIVAL_HOURS = 4;
const VELOCITY_WINDOW_MINUTES = 15;
const VELOCITY_TRANSACTION_COUNT_THRESHOLD = 5;
const AMOUNT_CLUSTER_TOLERANCE = 0.08;

export function downgradeConfidence(level) {
  if (level === 'HIGH') return 'MEDIUM';
  return 'LOW';
}

async function negativeBalanceRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { balances: { include: { provider: true } } },
  });

  if (!agent) return null;

  const negativeProviders = agent.balances.filter((b) => b.balance.toNumber() < 0);

  if (negativeProviders.length > 0) {
    return {
      scenarioType: 'NEGATIVE_BALANCE',
      agentId,
      providerId: negativeProviders[0].providerId,
      confidence: 'HIGH',
      confidenceReason: `Critical negative balance detected in ${negativeProviders.map((p) => p.provider.name).join(', ')}.`,
      targetStakeholder: 'OPERATIONS_TEAM',
      recommendedAction: 'Halt automated operations and manually reconcile ledger immediately.',
      evidence: {
        negativeBalances: negativeProviders.map((p) => ({
          providerName: p.provider.name,
          providerCode: p.provider.code,
          balance: p.balance.toNumber(),
        })),
      },
    };
  }
  return null;
}

async function dataIntegrityRule(agentId) {
  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60_000);
  const recentTransactions = await prisma.transaction.findMany({
    where: { agentId, timestamp: { gte: windowStart } },
  });

  const conflictingTxns = recentTransactions.filter((t) => t.isLate || t.isConflicting);

  if (conflictingTxns.length >= 2) {
    return {
      scenarioType: 'DATA_INCONSISTENCY',
      agentId,
      providerId: conflictingTxns[0].providerId,
      confidence: 'HIGH',
      confidenceReason: `${conflictingTxns.length} conflicting or delayed records found in recent data feeds.`,
      targetStakeholder: 'OPERATIONS_TEAM',
      recommendedAction: 'Verify agent balance manually. Do not make automated liquidity decisions based on current data.',
      evidence: {
        inconsistentCount: conflictingTxns.length,
        timeWindow: VELOCITY_WINDOW_MINUTES,
        issueTypes: conflictingTxns.map((t) => (t.isLate ? 'LATE_SYNC' : 'CONFLICTING_BALANCE')),
      },
    };
  }
  return null;
}

async function coordinatedClosureRule(agentId) {
  const windowStart = new Date(Date.now() - 30 * 60_000); // 30 mins
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { balances: true },
  });

  if (!agent) return null;

  const depletedBalances = agent.balances.filter((b) => b.balance.toNumber() < 100);
  if (depletedBalances.length >= 2) {
    const massiveCashOuts = await prisma.transaction.count({
      where: {
        agentId,
        type: 'CASH_OUT',
        timestamp: { gte: windowStart },
        amount: { gte: 10000 },
      },
    });

    if (massiveCashOuts >= 2) {
      return {
        scenarioType: 'COORDINATED_CLOSURE',
        agentId,
        providerId: depletedBalances[0].providerId,
        confidence: 'HIGH',
        confidenceReason: 'Multiple provider balances simultaneously depleted via high-value cash-outs.',
        targetStakeholder: 'RISK_ANALYST',
        recommendedAction: 'Contact agent immediately to verify intent. Suspend auto-replenishment.',
        evidence: {
          depletedCount: depletedBalances.length,
          massiveCashOutCount: massiveCashOuts,
        },
      };
    }
  }
  return null;
}

async function physicalCashExhaustionRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { area: true }, // NEW: Fetch geographic context
  });

  if (!agent) return null;

  const physicalCash = agent.physicalCash.toNumber();
  if (physicalCash > MIN_PHYSICAL_CASH_THRESHOLD) return null;

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentCashOuts = await prisma.transaction.aggregate({
    where: { agentId, type: 'CASH_OUT', timestamp: { gte: twoHoursAgo } },
    _sum: { amount: true },
  });

  const hourlyBurnRate = (recentCashOuts._sum.amount?.toNumber() || 0) / 2;

  if (hourlyBurnRate > 0 && physicalCash < hourlyBurnRate) {
    // NEW: DYNAMIC CONFIDENCE BASED ON AREA
    let dynamicConfidence = 'MEDIUM';
    let contextNote = '';

    if (agent.area.profile === 'CASH_IN_DOMINANT') {
      dynamicConfidence = 'HIGH'; 
      contextNote = ` Highly unusual for a ${agent.area.profile} area. Possible theft or off-ledger diversion.`;
    } else if (agent.area.profile === 'CASH_OUT_DOMINANT') {
      dynamicConfidence = 'LOW'; 
      contextNote = ` Standard operational depletion for a ${agent.area.profile} area.`;
    }

    return {
      scenarioType: 'PHYSICAL_CASH_EXHAUSTION',
      agentId,
      providerId: null, 
      confidence: dynamicConfidence,
      confidenceReason: `Physical cash (৳${physicalCash.toLocaleString()}) has fallen below the hourly burn rate of ৳${hourlyBurnRate.toLocaleString()}.${contextNote}`,
      targetStakeholder: dynamicConfidence === 'HIGH' ? 'RISK_ANALYST' : 'AREA_MANAGER',
      recommendedAction: dynamicConfidence === 'HIGH' 
        ? 'Contact agent immediately to verify cash drawer status.' 
        : 'Dispatch cash runner or instruct agent to visit nearest bank branch for immediate cash withdrawal.',
      evidence: {
        physicalCash,
        hourlyBurnRate,
        threshold: MIN_PHYSICAL_CASH_THRESHOLD,
        areaProfile: agent.area.profile
      },
    };
  }
  return null;
}

async function hiddenShortageRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { 
      balances: { include: { provider: true } },
      area: true // NEW: Fetch geographic context
    },
  });

  if (!agent) return null;

  const physicalCash = agent.physicalCash.toNumber();
  const providerBalances = agent.balances.map((b) => ({
    providerId: b.providerId,
    providerCode: b.provider.code,
    balance: b.balance.toNumber(),
  }));

  const totalLiquidity = physicalCash + providerBalances.reduce((sum, p) => sum + p.balance, 0);
  if (totalLiquidity < MIN_HEALTHY_TOTAL_LIQUIDITY || totalLiquidity === 0) return null;

  let thinnest = null;
  for (const p of providerBalances) {
    const share = p.balance / totalLiquidity;
    if (share < HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD) {
      if (!thinnest || share < thinnest.share) {
        thinnest = { ...p, share };
      }
    }
  }

  if (!thinnest) return null;

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentCashOuts = await prisma.transaction.findMany({
    where: { agentId, providerId: thinnest.providerId, type: 'CASH_OUT', timestamp: { gte: twoHoursAgo } },
  });

  const hourlyBurnRate = recentCashOuts.reduce((sum, t) => sum + t.amount.toNumber(), 0) / 2;
  const safeBalance = Math.max(0, thinnest.balance);
  const hoursUntilDepletion = hourlyBurnRate > 0 ? safeBalance / hourlyBurnRate : null;
  const requiredTopUp = hourlyBurnRate > 0 ? Math.max(0, Math.round(hourlyBurnRate * TARGET_SURVIVAL_HOURS - safeBalance)) : null;
  
  // NEW: DYNAMIC CONFIDENCE BASED ON AREA
  let dynamicConfidence = thinnest.share < HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE ? 'HIGH' : 'MEDIUM';
  let contextNote = '';

  if (agent.area.profile === 'CASH_OUT_DOMINANT' && hourlyBurnRate > 0) {
    dynamicConfidence = 'HIGH'; 
    contextNote = ` Anomaly: Sudden digital depletion in a typically ${agent.area.profile} area.`;
  }

  const recommendedAction = requiredTopUp
    ? `Arrange approximately ৳${requiredTopUp.toLocaleString('en-US')} in additional ${thinnest.providerCode} liquidity within the next ${TARGET_SURVIVAL_HOURS} hours.`
    : 'Contact agent to arrange provider-specific rebalancing.';

  return {
    scenarioType: 'HIDDEN_SHORTAGE',
    agentId,
    providerId: thinnest.providerId,
    confidence: dynamicConfidence,
    confidenceReason: `${thinnest.providerCode} holds ${(thinnest.share * 100).toFixed(1)}% of total liquidity.${contextNote}`,
    targetStakeholder: dynamicConfidence === 'HIGH' ? 'RISK_ANALYST' : 'AREA_MANAGER',
    recommendedAction,
    evidence: {
      totalLiquidity,
      physicalCash,
      providerBalances,
      thinProvider: thinnest,
      hourlyBurnRate,
      projectedDepletionMinutes: hoursUntilDepletion ? Math.round(hoursUntilDepletion * 60) : null,
      requiredTopUp,
      areaProfile: agent.area.profile
    },
  };
}

async function velocityRule(agentId) {
  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60_000);
  const recentTransactions = await prisma.transaction.findMany({
    where: { agentId, timestamp: { gte: windowStart } },
    orderBy: { timestamp: 'asc' },
  });

  if (recentTransactions.length === 0) return null;

  const byProvider = new Map();
  for (const txn of recentTransactions) {
    const list = byProvider.get(txn.providerId) ?? [];
    list.push(txn);
    byProvider.set(txn.providerId, list);
  }

  let flaggedProviderId = null;
  let flaggedTransactions = [];
  for (const [providerId, txns] of byProvider.entries()) {
    if (txns.length >= VELOCITY_TRANSACTION_COUNT_THRESHOLD) {
      flaggedProviderId = providerId;
      flaggedTransactions = txns;
      break;
    }
  }

  if (!flaggedProviderId) return null;

  const amounts = flaggedTransactions.map((t) => t.amount.toNumber());
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const currentWindowVolume = amounts.reduce((sum, a) => sum + a, 0);
  const isClustered = amounts.every((a) => Math.abs(a - mean) / mean <= AMOUNT_CLUSTER_TOLERANCE);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const baseline = await prisma.transaction.aggregate({
    where: { agentId, providerId: flaggedProviderId, timestamp: { gte: oneDayAgo, lt: windowStart } },
    _sum: { amount: true },
  });

  const hourlyAvgVolume = (baseline._sum.amount ? baseline._sum.amount.toNumber() : 0) / 24;
  const projectedHourlyPace = currentWindowVolume * (60 / VELOCITY_WINDOW_MINUTES);
  
  const surgeRatio = hourlyAvgVolume > 0 ? projectedHourlyPace / hourlyAvgVolume : 0;

  if (!isClustered && surgeRatio <= 2.0) {
    return null; 
  }

  const baseConfidence = isClustered && surgeRatio > 3 ? 'HIGH' : 'MEDIUM';
  const volumeContext = hourlyAvgVolume > 0 ? ` This pace is ${surgeRatio.toFixed(1)}x higher than the agent's 24-hour historical average.` : '';

  return {
    scenarioType: 'HIGH_VELOCITY',
    agentId,
    providerId: flaggedProviderId,
    confidence: baseConfidence,
    confidenceReason: isClustered
      ? `${flaggedTransactions.length} transactions in ${VELOCITY_WINDOW_MINUTES} mins are highly clustered around ৳${mean.toFixed(2)}.${volumeContext}`
      : `High transaction volume detected within ${VELOCITY_WINDOW_MINUTES} minutes.${volumeContext}`,
    targetStakeholder: 'RISK_ANALYST',
    recommendedAction: 'Review transaction patterns; do not block agent without manual confirmation.',
    evidence: {
      transactionCount: flaggedTransactions.length,
      isAmountClustered: isClustered,
      meanAmount: mean,
      surgeRatio,
    },
  };
}

const ANOMALY_RULES = [
  negativeBalanceRule,
  dataIntegrityRule,
  coordinatedClosureRule,
  physicalCashExhaustionRule,
  hiddenShortageRule,
  velocityRule,
];

const SCENARIO_PRIORITY = [
  'NEGATIVE_BALANCE',
  'DATA_INCONSISTENCY',
  'COORDINATED_CLOSURE',
  'PHYSICAL_CASH_EXHAUSTION',
  'HIDDEN_SHORTAGE',
  'HIGH_VELOCITY'
];

export async function evaluateAgentAnomalies(agentId) {
  const results = await Promise.all(ANOMALY_RULES.map((rule) => rule(agentId)));
  const validFindings = results.filter((finding) => finding !== null);

  if (validFindings.length > 1) {
    validFindings.sort((a, b) => SCENARIO_PRIORITY.indexOf(a.scenarioType) - SCENARIO_PRIORITY.indexOf(b.scenarioType));
    return [validFindings[0]];
  }

  return validFindings;
}

export {
  negativeBalanceRule,
  dataIntegrityRule,
  coordinatedClosureRule,
  physicalCashExhaustionRule,
  hiddenShortageRule,
  velocityRule
};