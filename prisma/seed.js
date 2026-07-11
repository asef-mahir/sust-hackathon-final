const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const AREAS = [
  { name: 'Dhaka North', prefix: 'DHN' },
  { name: 'Dhaka South', prefix: 'DHS' },
  { name: 'Chattogram', prefix: 'CTG' },
  { name: 'Sylhet', prefix: 'SYL' },
  { name: 'Khulna', prefix: 'KHL' },
  { name: 'Rajshahi', prefix: 'RAJ' },
];

const PROVIDERS = [
  { code: 'BKASH', name: 'bKash' },
  { code: 'NAGAD', name: 'Nagad' },
  { code: 'ROCKET', name: 'Rocket' },
];

const OWNERS = [
  { id: 'owner_rahim', name: 'Abdur Rahim', role: 'RISK_ANALYST' },
  { id: 'owner_nusrat', name: 'Nusrat Jahan', role: 'RISK_ANALYST' },
  { id: 'owner_karim', name: 'Karim Uddin', role: 'OPS_MANAGER' },
  { id: 'owner_admin', name: 'System Admin', role: 'ADMIN' },
];

const AGENT_NAMES = [
  'Rahman Mobile Banking', 'City Corner Store', 'Green Valley Enterprise',
  'Al-Amin Telecom', 'Sultana Variety Store', 'Faruk Electronics',
  'Nabila Fashion House', 'Bismillah Store', 'Hasan Traders',
  'Momtaz General Store', 'Karim Mobile Recharge', 'Jamuna Enterprise',
  'Padma Store', 'Meghna Trading', 'Sonar Bangla Shop',
  'Amin Bazar Store', 'Chayanir Enterprise', 'Utshob Store',
];

const SCENARIO_EVIDENCE = {
  HIDDEN_SHORTAGE: () => {
    const declaredBalance = randomInt(50_000, 400_000);
    const shortagePercent = randomInt(15, 60);
    const actualBalance = Math.round(declaredBalance * (1 - shortagePercent / 100));
    return {
      declaredBalance,
      actualBalance,
      shortageAmount: declaredBalance - actualBalance,
      shortagePercent,
    };
  },
  HIGH_VELOCITY: () => ({
    transactionCount: randomInt(25, 80),
    windowMinutes: randomInt(10, 45),
    totalAmount: randomInt(200_000, 1_200_000),
    averageAgentVelocity: randomInt(3, 8),
  }),
  DATA_INCONSISTENCY: () => {
    const reportedBalance = randomInt(30_000, 350_000);
    const discrepancy = randomInt(5_000, 60_000);
    return {
      reportedBalance,
      calculatedBalance: reportedBalance - discrepancy,
      discrepancy,
      lastSyncAt: randomDate(3).toISOString(),
    };
  },
  COORDINATED_CLOSURE: () => ({
    nearbyAgentIds: [],
    closureWindowMinutes: randomInt(5, 30),
    radiusKm: randomFloat(0.5, 3, 1),
  }),
};

const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDate(daysAgo) {
  const now = Date.now();
  const past = now - randomInt(0, daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past);
}

function weightedRiskStatus() {
  const roll = Math.random();
  if (roll < 0.7) return 'SAFE';
  if (roll < 0.9) return 'WARNING';
  return 'CRITICAL';
}

async function clearData() {
  await prisma.alertEvent.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.providerBalance.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.area.deleteMany();
}

async function seedOwners() {
  await prisma.owner.createMany({ data: OWNERS });
  return OWNERS;
}

async function seedAreas() {
  const areas = [];
  for (const area of AREAS) {
    const created = await prisma.area.create({ data: { name: area.name } });
    areas.push({ ...created, prefix: area.prefix });
  }
  return areas;
}

async function seedProviders() {
  const providers = [];
  for (const provider of PROVIDERS) {
    const created = await prisma.provider.create({ data: provider });
    providers.push(created);
  }
  return providers;
}

async function seedAgents(areas) {
  const agents = [];
  let nameIndex = 0;
  for (const area of areas) {
    for (let i = 1; i <= 3; i++) {
      const outletCode = `${area.prefix}-${String(i).padStart(4, '0')}`;
      const agent = await prisma.agent.create({
        data: {
          name: AGENT_NAMES[nameIndex % AGENT_NAMES.length],
          outletCode,
          areaId: area.id,
          latitude: randomFloat(20.5, 26.5, 6),
          longitude: randomFloat(88.0, 92.5, 6),
          physicalCash: randomInt(10_000, 300_000),
          riskStatus: weightedRiskStatus(),
        },
      });
      agents.push(agent);
      nameIndex++;
    }
  }
  return agents;
}

async function seedProviderBalances(agents, providers) {
  for (const agent of agents) {
    for (const provider of providers) {
      await prisma.providerBalance.create({
        data: {
          agentId: agent.id,
          providerId: provider.id,
          balance: randomInt(5_000, 500_000),
        },
      });
    }
  }
}

async function seedTransactions(agents, providers) {
  for (const agent of agents) {
    const count = randomInt(15, 40);
    for (let i = 0; i < count; i++) {
      const provider = randomItem(providers);
      await prisma.transaction.create({
        data: {
          agentId: agent.id,
          providerId: provider.id,
          type: randomItem(['CASH_IN', 'CASH_OUT']),
          amount: randomInt(500, 50_000),
          isLate: Math.random() < 0.08,
          isConflicting: Math.random() < 0.05,
          timestamp: randomDate(14),
        },
      });
    }
  }
}

async function seedAlerts(agents, providers, owners) {
  const scenarioTypes = Object.keys(SCENARIO_EVIDENCE);
  const flaggedAgents = agents.filter((a) => a.riskStatus !== 'SAFE');

  for (const agent of flaggedAgents) {
    const alertCount = agent.riskStatus === 'CRITICAL' ? randomInt(2, 3) : 1;
    for (let i = 0; i < alertCount; i++) {
      const scenarioType = randomItem(scenarioTypes);
      const status = randomItem(ALERT_STATUSES);
      const isAssigned = status !== 'PENDING';
      const owner = isAssigned ? randomItem(owners) : null;
      const createdAt = randomDate(10);

      const alert = await prisma.alert.create({
        data: {
          agentId: agent.id,
          providerId: Math.random() < 0.8 ? randomItem(providers).id : null,
          scenarioType,
          source: Math.random() < 0.6 ? 'RULE_BASED' : 'HYBRID',
          evidence: SCENARIO_EVIDENCE[scenarioType](),
          explanations:
            Math.random() < 0.5
              ? {
                  summary: `Pattern consistent with ${scenarioType.toLowerCase().replace('_', ' ')} for outlet ${agent.outletCode}.`,
                  riskFactors: ['balance_variance', 'transaction_timing'],
                }
              : null,
          confidence: randomItem(CONFIDENCE_LEVELS),
          confidenceReason: Math.random() < 0.5 ? 'Derived from historical variance model.' : null,
          status,
          ownerId: owner ? owner.id : null,
          assignedAt: owner ? createdAt : null,
          createdAt,
          resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' ? randomDate(3) : null,
        },
      });

      if (isAssigned) {
        await prisma.alertEvent.create({
          data: {
            alertId: alert.id,
            fromStatus: 'PENDING',
            toStatus: 'ACKNOWLEDGED',
            actorId: owner.id,
            note: 'Acknowledged, reviewing field data.',
            timestamp: createdAt,
          },
        });

        if (status === 'IN_PROGRESS' || status === 'RESOLVED' || status === 'DISMISSED') {
          await prisma.alertEvent.create({
            data: {
              alertId: alert.id,
              fromStatus: 'ACKNOWLEDGED',
              toStatus: status,
              actorId: owner.id,
              note:
                status === 'RESOLVED'
                  ? 'Confirmed with agent, discrepancy resolved.'
                  : status === 'DISMISSED'
                  ? 'False positive, no action needed.'
                  : 'Field visit scheduled.',
              timestamp: randomDate(5),
            },
          });
        }
      }
    }
  }
}

async function main() {
  await clearData();

  const owners = await seedOwners();
  const areas = await seedAreas();
  const providers = await seedProviders();
  const agents = await seedAgents(areas);

  await seedProviderBalances(agents, providers);
  await seedTransactions(agents, providers);
  await seedAlerts(agents, providers, owners);

  console.log(`Seeded ${areas.length} areas, ${providers.length} providers, ${agents.length} agents, ${owners.length} owners.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
