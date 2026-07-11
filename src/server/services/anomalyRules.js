import { prisma } from '../../lib/prisma';

const HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD = 0.10;
const HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE = 0.05;
const MIN_HEALTHY_TOTAL_LIQUIDITY = 20000;
const TARGET_SURVIVAL_HOURS = 4;
const VELOCITY_WINDOW_MINUTES = 15;
const VELOCITY_TRANSACTION_COUNT_THRESHOLD = 5;
const AMOUNT_CLUSTER_TOLERANCE = 0.08;

const CONFIDENCE_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function downgradeConfidence(level) {
  if (level === 'HIGH') return 'MEDIUM';
  return 'LOW';
}

// NEW RULE: Immediately flag any negative balances
async function negativeBalanceRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { balances: { include: { provider: true } } },
  });

  if (!agent) return null;

  const negativeProviders = agent.balances.filter(b => b.balance.toNumber() < 0);

  if (negativeProviders.length > 0) {
    return {
      scenarioType: 'NEGATIVE_BALANCE',
      agentId,
      providerId: negativeProviders[0].providerId, // Attach to the first negative provider
      confidence: 'HIGH',
      confidenceReason: `Critical negative balance detected in ${negativeProviders.map(p => p.provider.name).join(', ')}.`,
      targetStakeholder: 'OPERATIONS_TEAM',
      recommendedAction: 'Halt automated operations and manually reconcile ledger immediately.',
      evidence: {
        negativeBalances: negativeProviders.map(p => ({
          providerName: p.provider.name,
          providerCode: p.provider.code,
          balance: p.balance.toNumber()
        }))
      }
    };
  }

  return null;
}

async function hiddenShortageRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { balances: { include: { provider: true } } },
  });

  if (!agent) throw new Error(`Agent not found: ${agentId}`);

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
    where: { agentId, providerId: thinnest.providerId, type: 'CASH_OUT', timestamp: { gte: twoHoursAgo } }
  });
  
  const hourlyBurnRate = recentCashOuts.reduce((sum, t) => sum + t.amount.toNumber(), 0) / 2;
  const safeBalance = Math.max(0, thinnest.balance);
  const hoursUntilDepletion = hourlyBurnRate > 0 ? (safeBalance / hourlyBurnRate) : null;

  const requiredTopUp =
    hourlyBurnRate > 0
      ? Math.max(0, Math.round(hourlyBurnRate * TARGET_SURVIVAL_HOURS - safeBalance))
      : null;

  const baseConfidence = thinnest.share < HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE ? 'HIGH' : 'MEDIUM';

  const recommendedAction = requiredTopUp
    ? `Arrange approximately ৳${requiredTopUp.toLocaleString('en-US')} in additional ${thinnest.providerCode} liquidity within the next ${TARGET_SURVIVAL_HOURS} hours to avoid service disruption.`
    : 'Contact agent to arrange immediate physical cash support or provider-specific rebalancing.';

  const displayShare = Math.max(0, thinnest.share);

  return {
    scenarioType: 'HIDDEN_SHORTAGE',
    agentId,
    providerId: thinnest.providerId,
    confidence: baseConfidence,
    confidenceReason: `${thinnest.providerCode} holds ${(displayShare * 100).toFixed(1)}% of total liquidity. ${hoursUntilDepletion ? `At current velocity, balance will deplete in ~${(hoursUntilDepletion * 60).toFixed(0)} minutes.` : ''}`,
    targetStakeholder: 'AREA_MANAGER',
    recommendedAction,
    evidence: {
      totalLiquidity,
      physicalCash,
      providerBalances,
      thinProvider: {
        providerId: thinnest.providerId,
        providerCode: thinnest.providerCode,
        balance: thinnest.balance,
        shareOfTotal: thinnest.share,
      },
      hourlyBurnRate,
      projectedDepletionMinutes: hoursUntilDepletion ? Math.round(hoursUntilDepletion * 60) : null,
      requiredTopUp,
      targetSurvivalHours: TARGET_SURVIVAL_HOURS,
      thresholdBreached: 'HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD',
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
    _sum: { amount: true }
  });
  
  const hourlyAvgVolume = (baseline._sum.amount ? baseline._sum.amount.toNumber() : 0) / 24;
  const projectedHourlyPace = currentWindowVolume * (60 / VELOCITY_WINDOW_MINUTES);
  
  let baseConfidence = 'LOW';
  let volumeContext = '';

  if (hourlyAvgVolume > 0) {
    const surgeRatio = projectedHourlyPace / hourlyAvgVolume;
    if (surgeRatio > 3 && isClustered) baseConfidence = 'HIGH';
    else if (surgeRatio > 1.5 || isClustered) baseConfidence = 'MEDIUM';
    volumeContext = ` This pace is ${surgeRatio.toFixed(1)}x higher than the agent's 24-hour historical average.`;
  } else {
    baseConfidence = isClustered ? 'HIGH' : 'MEDIUM';
  }

  return {
    scenarioType: 'HIGH_VELOCITY',
    agentId,
    providerId: flaggedProviderId,
    confidence: baseConfidence,
    confidenceReason: isClustered
      ? `${flaggedTransactions.length} transactions in ${VELOCITY_WINDOW_MINUTES} mins are highly clustered around ৳${mean.toFixed(2)}.${volumeContext}`
      : `High transaction volume (${flaggedTransactions.length}) detected within ${VELOCITY_WINDOW_MINUTES} minutes.${volumeContext}`,
    targetStakeholder: 'RISK_ANALYST',
    recommendedAction: 'Review transaction patterns; do not block agent without manual confirmation.',
    evidence: {
      windowMinutes: VELOCITY_WINDOW_MINUTES,
      transactionCount: flaggedTransactions.length,
      isAmountClustered: isClustered,
      meanAmount: mean,
      hourlyAvgVolume,
      projectedHourlyPace,
      contributingTransactionIds: flaggedTransactions.map((t) => t.id),
      contributingTransactions: flaggedTransactions.map((t) => ({
        id: t.id,
        amount: t.amount.toNumber(),
        timestamp: t.timestamp.toISOString(),
        syntheticAccountId: t.syntheticAccountId,
      })),
    },
  };
}

async function dataIntegrityRule(agentId) {
  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60_000);
  const recentTransactions = await prisma.transaction.findMany({
    where: { agentId, timestamp: { gte: windowStart } }
  });

  const conflictingTxns = recentTransactions.filter(t => t.isLate || t.isConflicting);
  
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
        issueTypes: conflictingTxns.map(t => t.isLate ? 'LATE_SYNC' : 'CONFLICTING_BALANCE')
      }
    }
  }
  return null;
}

// Ensure negativeBalanceRule is processed first
const ANOMALY_RULES = [negativeBalanceRule, hiddenShortageRule, velocityRule, dataIntegrityRule];

export async function evaluateAgentAnomalies(agentId) {
  const results = await Promise.all(ANOMALY_RULES.map((rule) => rule(agentId)));
  return results.filter((finding) => finding !== null);
}

export { negativeBalanceRule, hiddenShortageRule, velocityRule, dataIntegrityRule, downgradeConfidence };