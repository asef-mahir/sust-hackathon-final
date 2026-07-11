import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * @typedef {'HIDDEN_SHORTAGE' | 'HIGH_VELOCITY' | 'DATA_INCONSISTENCY'} SupportedScenarioType
 */

/**
 * @typedef {Object} SyntheticTransactionInput
 * @property {string} providerId
 * @property {'CASH_IN' | 'CASH_OUT'} type
 * @property {number} amount
 * @property {boolean} [isLate]
 * @property {boolean} [isConflicting]
 * @property {Date} [timestamp]
 */

/**
 * @typedef {Object} SimulationResult
 * @property {SupportedScenarioType} scenarioType
 * @property {string} agentId
 * @property {number} transactionsCreated
 * @property {{ providerId: string, balanceAfter: string }[]} providerBalancesAfter
 * @property {string} physicalCashAfter - Decimal serialized as string
 * @property {string} generatedAt - ISO timestamp
 */

/**
 * Deterministic-but-jittered pseudo-random generator wrapper.
 *
 * @param {number} seed
 * @returns {() => number} function returning a float in [0, 1)
 */
function createSeededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return function next() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/**
 * Picks a random integer amount within [min, max], inclusive.
 */
function randomAmountBetween(rng, min, max) {
  return Math.round(min + rng() * (max - min));
}

/**
 * Scenario A — Hidden Provider Shortage.
 * Drains the agent's electronic balance via CASH_IN transactions.
 */
function generateHiddenShortageScenario({ targetProviderId, rng }) {
  const transactionCount = 5;
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 30_000, 180_000); 
    transactions.push({
      providerId: targetProviderId,
      type: 'CASH_IN', // Correct MFS Domain Logic: CASH_IN reduces the agent's e-money position
      amount: randomAmountBetween(rng, 3000, 9000),
      timestamp: new Date(Date.now() - (5 * 60_000 - cumulativeOffsetMs)),
    });
  }

  return transactions;
}

/**
 * Scenario B — High Velocity / Unusual Activity.
 * Induces heavy physical cash drain via tightly-clustered amounts.
 */
function generateHighVelocityScenario({ targetProviderId, rng }) {
  const transactionCount = 6;
  const clusterBaseAmount = randomAmountBetween(rng, 4800, 5200);
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 60_000, 150_000); 
    transactions.push({
      providerId: targetProviderId,
      type: 'CASH_OUT', // CASH_OUT depletes physical cash drawer
      amount: Math.round(clusterBaseAmount * (0.96 + rng() * 0.08)),
      timestamp: new Date(Date.now() - (12 * 60_000 - cumulativeOffsetMs)),
    });
  }

  return transactions;
}

/**
 * Scenario C — Cross-provider or Data Inconsistency.
 * Simulates systemic issues with missing, late, or conflicting network data feeds.
 */
function generateDataInconsistencyScenario({ targetProviderId, rng }) {
  const transactionCount = 3;
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 30_000, 90_000); 
    transactions.push({
      providerId: targetProviderId,
      type: rng() > 0.5 ? 'CASH_IN' : 'CASH_OUT',
      amount: randomAmountBetween(rng, 1000, 5000),
      isLate: i === 0,          // Simulate out-of-order latency sync
      isConflicting: i === 1,   // Simulate ledger mismatch anomalies
      timestamp: new Date(Date.now() - (10 * 60_000 - cumulativeOffsetMs)),
    });
  }

  return transactions;
}

const SCENARIO_GENERATORS = {
  HIDDEN_SHORTAGE: generateHiddenShortageScenario,
  HIGH_VELOCITY: generateHighVelocityScenario,
  DATA_INCONSISTENCY: generateDataInconsistencyScenario,
};

/**
 * Applies a single transaction's balance effect to running totals.
 */
function applyBalanceEffect(current, txn) {
  const amount = new Prisma.Decimal(txn.amount);

  if (txn.type === 'CASH_OUT') {
    return {
      physicalCash: current.physicalCash.minus(amount),
      providerBalance: current.providerBalance.plus(amount),
    };
  }

  if (txn.type === 'CASH_IN') {
    return {
      physicalCash: current.physicalCash.plus(amount),
      providerBalance: current.providerBalance.minus(amount),
    };
  }

  throw new Error(`Unknown transaction type: ${txn.type}`);
}

/**
 * Runs a named scenario against a specific agent: generates transactions,
 * writes them, and updates Agent.physicalCash + the affected
 * ProviderBalance rows inside one Prisma transaction.
 * 
 * @param {Object} params
 * @param {SupportedScenarioType} params.scenarioType
 * @param {string} params.agentId
 * @param {string} params.targetProviderId
 * @param {number} [params.seed]
 * @returns {Promise<SimulationResult>}
 */
export async function runSimulationScenario({
  scenarioType,
  agentId,
  targetProviderId,
  seed = Date.now(),
}) {
  const generator = SCENARIO_GENERATORS[scenarioType];
  if (!generator) {
    throw new Error(
      `Unsupported scenario type: "${scenarioType}". Supported: ${Object.keys(
        SCENARIO_GENERATORS
      ).join(', ')}`
    );
  }

  const rng = createSeededRandom(seed);
  const syntheticTransactions = generator({ agentId, targetProviderId, rng });

  const result = await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const providerBalanceRow = await tx.providerBalance.findUnique({
      where: {
        agentId_providerId: { agentId, providerId: targetProviderId },
      },
    });
    if (!providerBalanceRow) {
      throw new Error(
        `ProviderBalance not found for agent ${agentId} / provider ${targetProviderId}.`
      );
    }

    let runningPhysicalCash = agent.physicalCash;
    let runningProviderBalance = providerBalanceRow.balance;

    for (const txnInput of syntheticTransactions) {
      const updated = applyBalanceEffect(
        {
          physicalCash: runningPhysicalCash,
          providerBalance: runningProviderBalance,
        },
        txnInput
      );
      runningPhysicalCash = updated.physicalCash;
      runningProviderBalance = updated.providerBalance;

      await tx.transaction.create({
        data: {
          agentId,
          providerId: txnInput.providerId,
          type: txnInput.type,
          amount: txnInput.amount,
          isLate: txnInput.isLate ?? false,
          isConflicting: txnInput.isConflicting ?? false,
          timestamp: txnInput.timestamp ?? new Date(),
        },
      });
    }

    await tx.agent.update({
      where: { id: agentId },
      data: { physicalCash: runningPhysicalCash },
    });

    await tx.providerBalance.update({
      where: {
        agentId_providerId: { agentId, providerId: targetProviderId },
      },
      data: { balance: runningProviderBalance },
    });

    return {
      transactionsCreated: syntheticTransactions.length,
      physicalCashAfter: runningPhysicalCash.toString(),
      providerBalancesAfter: [
        {
          providerId: targetProviderId,
          balanceAfter: runningProviderBalance.toString(),
        },
      ],
    };
  });

  return {
    scenarioType,
    agentId,
    transactionsCreated: result.transactionsCreated,
    providerBalancesAfter: result.providerBalancesAfter,
    physicalCashAfter: result.physicalCashAfter,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Returns metadata for all currently supported scenarios.
 */
export function listAvailableScenarios() {
  return [
    {
      id: 'HIDDEN_SHORTAGE',
      label: 'Hidden Provider Shortage',
      description:
        'Injects a burst of cash-in transactions against one provider, ' +
        'draining that provider\'s electronic balance while total agent ' +
        'physical cash reserves remain healthy.',
    },
    {
      id: 'HIGH_VELOCITY',
      label: 'Liquidity Pressure + Unusual Activity',
      description:
        'Injects a tight cluster of near-identical cash-out amounts within ' +
        'a short window, exercising structural velocity and amount-clustering rules.',
    },
    {
      id: 'DATA_INCONSISTENCY',
      label: 'Data Integrity Failure',
      description:
        'Injects isolated conflicting and delayed transaction feeds to evaluate ' +
        'system fallback states, rule reconciliation, and safety checks under high uncertainty.',
    },
  ];
}