import { prisma } from '../../lib/prisma';

const HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD = 0.10;
const HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE = 0.05;
const MIN_HEALTHY_TOTAL_LIQUIDITY = 20000;
const VELOCITY_WINDOW_MINUTES = 15;
const VELOCITY_TRANSACTION_COUNT_THRESHOLD = 5;
const AMOUNT_CLUSTER_TOLERANCE = 0.08;

const CONFIDENCE_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function downgradeConfidence(level) {
  if (level === 'HIGH') return 'MEDIUM';
  return 'LOW';
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

  // Predictive element: Calculate burn rate over the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentCashOuts = await prisma.transaction.findMany({
    where: { agentId, providerId: thinnest.providerId, type: 'CASH_OUT', timestamp: { gte: twoHoursAgo } }
  });
  
  const hourlyBurnRate = recentCashOuts.reduce((sum, t) => sum + t.amount.toNumber(), 0) / 2;
  const hoursUntilDepletion = hourlyBurnRate > 0 ? (thinnest.balance / hourlyBurnRate) : null;

  const baseConfidence = thinnest.share < HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE ? 'HIGH' : 'MEDIUM';

  return {
    scenarioType: 'HIDDEN_SHORTAGE',
    agentId,
    providerId: thinnest.providerId,
    confidence: baseConfidence,
    confidenceReason: `${thinnest.providerCode} holds ${(thinnest.share * 100).toFixed(1)}% of total liquidity. ${hoursUntilDepletion ? `At current velocity, balance will deplete in ~${(hoursUntilDepletion * 60).toFixed(0)} minutes.` : ''}`,
    targetStakeholder: 'AREA_MANAGER',
    recommendedAction: 'Contact agent to arrange immediate physical cash support or provider-specific rebalancing.',
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
  const isClustered = amounts.every((a) => Math.abs(a - mean) / mean <= AMOUNT_CLUSTER_TOLERANCE);

  // False-positive check: We can add historical baseline logic here.
  // For the hackathon, we assume clustered amounts are higher risk than just volume.
  let baseConfidence = isClustered ? 'HIGH' : 'MEDIUM';

  return {
    scenarioType: 'HIGH_VELOCITY',
    agentId,
    providerId: flaggedProviderId,
    confidence: baseConfidence,
    confidenceReason: isClustered
      ? `${flaggedTransactions.length} transactions in ${VELOCITY_WINDOW_MINUTES} mins are highly clustered around ${mean.toFixed(2)}.`
      : `High transaction volume (${flaggedTransactions.length}) detected within ${VELOCITY_WINDOW_MINUTES} minutes.`,
    targetStakeholder: 'RISK_ANALYST',
    recommendedAction: 'Review transaction patterns; do not block agent without manual confirmation.',
    evidence: {
      windowMinutes: VELOCITY_WINDOW_MINUTES,
      transactionCount: flaggedTransactions.length,
      isAmountClustered: isClustered,
      meanAmount: mean,
      contributingTransactionIds: flaggedTransactions.map((t) => t.id),
      // Per-transaction detail (time/amount/synthetic account) so the Risk
      // dashboard's cluster scatter plot and synthetic account watchlist
      // can render directly from stored evidence, with no extra API needed.
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
  // Scenario C: Catch missing, late, or conflicting data feeds across providers
  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60_000);
  const recentTransactions = await prisma.transaction.findMany({
    where: { agentId, timestamp: { gte: windowStart } }
  });

  const conflictingTxns = recentTransactions.filter(t => t.isLate || t.isConflicting);
  
  if (conflictingTxns.length >= 2) {
    return {
      scenarioType: 'DATA_INCONSISTENCY',
      agentId,
      providerId: conflictingTxns[0].providerId, // Tag the first affected provider
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

const ANOMALY_RULES = [hiddenShortageRule, velocityRule, dataIntegrityRule];

export async function evaluateAgentAnomalies(agentId) {
  const results = await Promise.all(ANOMALY_RULES.map((rule) => rule(agentId)));
  return results.filter((finding) => finding !== null);
}

export { hiddenShortageRule, velocityRule, dataIntegrityRule, downgradeConfidence };