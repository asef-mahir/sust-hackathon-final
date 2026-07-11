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

function lowerConfidence(a, b) {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

async function hiddenShortageRule(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { balances: { include: { provider: true } } },
  });

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const physicalCash = agent.physicalCash.toNumber();
  const providerBalances = agent.balances.map((b) => ({
    providerId: b.providerId,
    providerCode: b.provider.code,
    balance: b.balance.toNumber(),
  }));

  const totalLiquidity = physicalCash + providerBalances.reduce((sum, p) => sum + p.balance, 0);

  if (totalLiquidity < MIN_HEALTHY_TOTAL_LIQUIDITY || totalLiquidity === 0) {
    return null;
  }

  let thinnest = null;
  for (const p of providerBalances) {
    const share = p.balance / totalLiquidity;
    if (share < HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD) {
      if (!thinnest || share < thinnest.share) {
        thinnest = { ...p, share };
      }
    }
  }

  if (!thinnest) {
    return null;
  }

  const baseConfidence = thinnest.share < HIDDEN_SHORTAGE_HIGH_CONFIDENCE_SHARE ? 'HIGH' : 'MEDIUM';

  return {
    scenarioType: 'HIDDEN_SHORTAGE',
    agentId,
    providerId: thinnest.providerId,
    confidence: baseConfidence,
    confidenceReason: `${thinnest.providerCode} holds ${(thinnest.share * 100).toFixed(1)}% of total liquidity (threshold: ${(HIDDEN_SHORTAGE_PROVIDER_SHARE_THRESHOLD * 100).toFixed(0)}%), while total liquidity (${totalLiquidity.toFixed(2)}) remains above the healthy floor (${MIN_HEALTHY_TOTAL_LIQUIDITY}).`,
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

  if (recentTransactions.length === 0) {
    return null;
  }

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

  if (!flaggedProviderId) {
    return null;
  }

  const amounts = flaggedTransactions.map((t) => t.amount.toNumber());
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const isClustered = amounts.every(
    (a) => Math.abs(a - mean) / mean <= AMOUNT_CLUSTER_TOLERANCE
  );

  let baseConfidence = isClustered ? 'HIGH' : 'MEDIUM';

  const hasQuestionableData = flaggedTransactions.some(
    (t) => t.isLate || t.isConflicting
  );
  if (hasQuestionableData) {
    baseConfidence = downgradeConfidence(baseConfidence);
  }

  return {
    scenarioType: 'HIGH_VELOCITY',
    agentId,
    providerId: flaggedProviderId,
    confidence: baseConfidence,
    confidenceReason: isClustered
      ? `${flaggedTransactions.length} transactions within ${VELOCITY_WINDOW_MINUTES} minutes, amounts clustered within ${(AMOUNT_CLUSTER_TOLERANCE * 100).toFixed(0)}% of the mean.`
      : `${flaggedTransactions.length} transactions within ${VELOCITY_WINDOW_MINUTES} minutes exceeded the velocity threshold (${VELOCITY_TRANSACTION_COUNT_THRESHOLD}).`,
    evidence: {
      windowMinutes: VELOCITY_WINDOW_MINUTES,
      transactionCount: flaggedTransactions.length,
      thresholdBreached: 'VELOCITY_TRANSACTION_COUNT_THRESHOLD',
      isAmountClustered: isClustered,
      meanAmount: mean,
      dataQualityIssue: hasQuestionableData,
      contributingTransactionIds: flaggedTransactions.map((t) => t.id),
    },
  };
}

const ANOMALY_RULES = [hiddenShortageRule, velocityRule];

export async function evaluateAgentAnomalies(agentId) {
  const results = await Promise.all(ANOMALY_RULES.map((rule) => rule(agentId)));
  return results.filter((finding) => finding !== null);
}

export { hiddenShortageRule, velocityRule, downgradeConfidence, lowerConfidence };