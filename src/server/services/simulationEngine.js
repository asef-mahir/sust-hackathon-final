import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

function createSeededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return function next() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomAmountBetween(rng, min, max) {
  return Math.round(min + rng() * (max - min));
}

function generateHiddenShortageScenario({ targetProviderId, rng, intensity = 1.0 }) {
  const transactionCount = Math.floor(5 * intensity);
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 30_000, 180_000); 
    transactions.push({
      providerId: targetProviderId,
      type: 'CASH_IN', 
      amount: randomAmountBetween(rng, 3000 * intensity, 9000 * intensity),
      timestamp: new Date(Date.now() - (5 * 60_000 - cumulativeOffsetMs)),
    });
  }
  return transactions;
}

// NEW SCENARIO: Drains the physical drawer using randomized, high-volume cash-outs
function generatePhysicalCashShortageScenario({ targetProviderId, rng, intensity = 1.0 }) {
  const transactionCount = Math.floor(6 * intensity);
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 30_000, 150_000); 
    transactions.push({
      providerId: targetProviderId,
      type: 'CASH_OUT', // CASH_OUT depletes the physical cash drawer
      // Wide randomization bypasses the "Amount Clustering" fraud check
      amount: randomAmountBetween(rng, 10000 * intensity, 20000 * intensity),
      timestamp: new Date(Date.now() - (8 * 60_000 - cumulativeOffsetMs)),
    });
  }
  return transactions;
}

function generateHighVelocityScenario({ targetProviderId, rng, intensity = 1.0 }) {
  const transactionCount = Math.max(6, Math.floor(6 * intensity));
  const clusterBaseAmount = randomAmountBetween(rng, 4800, 5200);
  const transactions = [];
  let cumulativeOffsetMs = 0;

  const SYNTHETIC_ACCOUNTS = ['CUST-SIM-999', 'CUST-SIM-999', 'CUST-SIM-999', 'CUST-SIM-999', 'CUST-SIM-888', 'CUST-SIM-888'];

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 60_000, 150_000);
    transactions.push({
      providerId: targetProviderId,
      type: 'CASH_OUT',
      amount: Math.round(clusterBaseAmount * (0.96 + rng() * 0.08)),
      timestamp: new Date(Date.now() - (12 * 60_000 - cumulativeOffsetMs)),
      syntheticAccountId: SYNTHETIC_ACCOUNTS[i % SYNTHETIC_ACCOUNTS.length] ?? null, 
    });
  }
  return transactions;
}

function generateDataInconsistencyScenario({ targetProviderId, rng, intensity = 1.0 }) {
  const transactionCount = Math.max(3, Math.floor(3 * intensity));
  const transactions = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < transactionCount; i += 1) {
    cumulativeOffsetMs += randomAmountBetween(rng, 30_000, 90_000); 
    transactions.push({
      providerId: targetProviderId,
      type: rng() > 0.5 ? 'CASH_IN' : 'CASH_OUT',
      amount: randomAmountBetween(rng, 1000, 5000),
      isLate: i === 0,          
      isConflicting: i === 1,   
      timestamp: new Date(Date.now() - (10 * 60_000 - cumulativeOffsetMs)),
    });
  }
  return transactions;
}

const SCENARIO_GENERATORS = {
  HIDDEN_SHORTAGE: generateHiddenShortageScenario,
  PHYSICAL_CASH_EXHAUSTION: generatePhysicalCashShortageScenario, // ADDED
  HIGH_VELOCITY: generateHighVelocityScenario,
  DATA_INCONSISTENCY: generateDataInconsistencyScenario,
};

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

export async function runSimulationScenario({
  scenarioType,
  agentId,
  targetProviderId,
  seed = Date.now(),
  intensity = 1.0,
}) {
  const generator = SCENARIO_GENERATORS[scenarioType];
  if (!generator) {
    throw new Error(`Unsupported scenario type: "${scenarioType}". Supported: ${Object.keys(SCENARIO_GENERATORS).join(', ')}`);
  }

  const rng = createSeededRandom(seed);
  const syntheticTransactions = generator({ agentId, targetProviderId, rng, intensity });

  const result = await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const providerBalanceRow = await tx.providerBalance.findUnique({
      where: { agentId_providerId: { agentId, providerId: targetProviderId } },
    });
    
    if (!providerBalanceRow) {
      throw new Error(`ProviderBalance not found for agent ${agentId} / provider ${targetProviderId}.`);
    }

    let runningPhysicalCash = agent.physicalCash;
    let runningProviderBalance = providerBalanceRow.balance;

    const transactionsToInsert = syntheticTransactions.map((txnInput) => {
      const updated = applyBalanceEffect(
        { physicalCash: runningPhysicalCash, providerBalance: runningProviderBalance },
        txnInput
      );
      runningPhysicalCash = updated.physicalCash;
      runningProviderBalance = updated.providerBalance;

      return {
        agentId,
        providerId: txnInput.providerId,
        type: txnInput.type,
        amount: txnInput.amount,
        isLate: txnInput.isLate ?? false,
        isConflicting: txnInput.isConflicting ?? false,
        timestamp: txnInput.timestamp ?? new Date(),
        syntheticAccountId: txnInput.syntheticAccountId ?? null,
      };
    });

    await tx.transaction.createMany({
      data: transactionsToInsert,
    });

    await tx.agent.update({
      where: { id: agentId },
      data: { physicalCash: runningPhysicalCash },
    });

    await tx.providerBalance.update({
      where: { agentId_providerId: { agentId, providerId: targetProviderId } },
      data: { balance: runningProviderBalance },
    });

    return {
      transactionsCreated: syntheticTransactions.length,
      physicalCashAfter: runningPhysicalCash.toString(),
      providerBalancesAfter: [{ providerId: targetProviderId, balanceAfter: runningProviderBalance.toString() }],
    };
  }, {
    maxWait: 10000, 
    timeout: 20000,
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

export function listAvailableScenarios() {
  return [
    {
      id: 'HIDDEN_SHORTAGE',
      label: 'Hidden Provider Shortage (E-Money)',
      description: 'Injects a burst of cash-in transactions against one provider, draining that provider\'s electronic balance.',
    },
    {
      id: 'PHYSICAL_CASH_EXHAUSTION',
      label: 'Physical Cash Exhaustion',
      description: 'Injects high-value cash-out transactions, draining the agent\'s physical cash drawer to trigger a dual-vector liquidity warning.',
    },
    {
      id: 'HIGH_VELOCITY',
      label: 'Liquidity Pressure + Unusual Activity',
      description: 'Injects a tight cluster of near-identical cash-out amounts within a short window, exercising structural velocity and amount-clustering rules against the 24-hour moving average.',
    },
    {
      id: 'DATA_INCONSISTENCY',
      label: 'Data Integrity Failure',
      description: 'Injects isolated conflicting and delayed transaction feeds to evaluate system fallback states, rule reconciliation, and safety checks under high uncertainty.',
    },
  ];
}