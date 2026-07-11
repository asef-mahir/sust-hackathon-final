const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  }
);

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function createAuthUser(email, password, name) {
  console.log(`Creating/Fetching Supabase Auth user: ${email}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name: name }
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      const existingUsers = await supabase.auth.admin.listUsers();
      const user = existingUsers.data.users.find(u => u.email === email);
      return user.id;
    }
    throw error;
  }
  return data.user.id;
}

async function main() {
  console.log('🧹 Cleaning existing Prisma database records...');
  await prisma.simulationRun.deleteMany({});
  await prisma.alertEvent.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.providerBalance.deleteMany({});
  await prisma.owner.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.area.deleteMany({});

  console.log('🔐 Generating Supabase Auth Credentials...');
  const opsId = await createAuthUser('ops@finstream.com', 'demo12345', 'Rahat Ahmed');
  const riskId = await createAuthUser('risk@finstream.com', 'demo12345', 'Nadia Chowdhury');
  const agentId = await createAuthUser('agent@finstream.com', 'demo12345', 'Sohrab Hossain');

  console.log('🌱 Seeding Reference Areas with Diverse Profiles...');
  // UPDATED: Diverse Area Profiles for testing dynamic rule engine thresholds
  const zindabazar = await prisma.area.create({ data: { name: 'Sylhet_Zindabazar', profile: 'BALANCED' } });
  const bandarbazar = await prisma.area.create({ data: { name: 'Sylhet_Bandarbazar', profile: 'CASH_IN_DOMINANT' } });
  const subidbazar = await prisma.area.create({ data: { name: 'Sylhet_Subidbazar', profile: 'CASH_OUT_DOMINANT' } });

  console.log('🌱 Seeding MFS Providers...');
  const bkash = await prisma.provider.create({ data: { code: 'BKASH', name: 'bKash Limited' } });
  const nagad = await prisma.provider.create({ data: { code: 'NAGAD', name: 'Nagad MFS' } });
  const rocket = await prisma.provider.create({ data: { code: 'ROCKET', name: 'DBBL Rocket' } });

  console.log('🌱 Seeding Agent Network...');
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'Zindabazar Digital Telecom',
        outletCode: 'OUTLET-77102',
        areaId: zindabazar.id, // BALANCED
        physicalCash: 150000.00,
        riskStatus: 'SAFE'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Mizan MFS Point (Demo Target)',
        outletCode: 'OUTLET-102',
        areaId: zindabazar.id, // BALANCED
        physicalCash: 120000.00,
        riskStatus: 'SAFE'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Bandarbazar Enterprise',
        outletCode: 'OUTLET-99213',
        areaId: bandarbazar.id, // CASH_IN_DOMINANT
        physicalCash: 250000.00,
        riskStatus: 'SAFE'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Chowdhury Traders',
        outletCode: 'OUTLET-44811',
        areaId: subidbazar.id, // CASH_OUT_DOMINANT
        physicalCash: 15000.00,
        riskStatus: 'SAFE'
      }
    })
  ]);

  const [agentNormal, agentVulnerable, agentBusy, agentLowCash] = agents;

  console.log('🌱 Mapping Auth Users to Prisma Owners...');
  await prisma.owner.createMany({
    data: [
      { id: opsId, name: 'Rahat Ahmed (Ops)', role: 'OPS' },
      { id: riskId, name: 'Nadia Chowdhury (Risk)', role: 'RISK' },
      { id: agentId, name: 'Sohrab Hossain (Agent)', role: 'AGENT', managedAgentId: agentVulnerable.id },
    ],
  });

  console.log('🌱 Setting Exact Final Balances for Demo Predictability...');
  await prisma.providerBalance.createMany({
    data: [
      { agentId: agentNormal.id, providerId: bkash.id, balance: 50000.00, minimumThreshold: 10000 },
      { agentId: agentNormal.id, providerId: nagad.id, balance: 60000.00, minimumThreshold: 10000 },
      { agentId: agentNormal.id, providerId: rocket.id, balance: 40000.00, minimumThreshold: 10000 },

      { agentId: agentVulnerable.id, providerId: bkash.id, balance: 8000.00, minimumThreshold: 15000 },
      { agentId: agentVulnerable.id, providerId: nagad.id, balance: 80000.00, minimumThreshold: 15000 },
      { agentId: agentVulnerable.id, providerId: rocket.id, balance: 60000.00, minimumThreshold: 15000 },

      { agentId: agentBusy.id, providerId: bkash.id, balance: 150000.00, minimumThreshold: 50000 },
      { agentId: agentBusy.id, providerId: nagad.id, balance: 120000.00, minimumThreshold: 50000 },
      { agentId: agentBusy.id, providerId: rocket.id, balance: 90000.00, minimumThreshold: 50000 },

      { agentId: agentLowCash.id, providerId: bkash.id, balance: 75000.00, minimumThreshold: 5000 },
      { agentId: agentLowCash.id, providerId: nagad.id, balance: 85000.00, minimumThreshold: 5000 },
      { agentId: agentLowCash.id, providerId: rocket.id, balance: 40000.00, minimumThreshold: 5000 },
    ],
  });

  console.log('⏳ Generating 2,400 Historical Transactions Contextually...');
  const txData = [];
  const providers = [bkash, nagad, rocket];
  const now = new Date().getTime();
  
  const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
  const fifteenMinutesAgo = now - 15 * 60 * 1000;

  agents.forEach(agent => {
    // UPDATED: Determine realistic Cash-In probability based on the Agent's Area Profile
    let cashInProbability = 0.50; // Default BALANCED
    if (agent.areaId === bandarbazar.id) cashInProbability = 0.75; // CASH_IN_DOMINANT
    if (agent.areaId === subidbazar.id) cashInProbability = 0.25;  // CASH_OUT_DOMINANT

    for (let i = 0; i < 600; i++) {
      const provider = providers[Math.floor(Math.random() * providers.length)];
      
      // Transaction type respects the geographic profile
      const type = Math.random() < cashInProbability ? 'CASH_IN' : 'CASH_OUT'; 
      const amount = randomBetween(500, 8000); 
      
      const randomTimestamp = new Date(randomBetween(fortyEightHoursAgo, fifteenMinutesAgo));

      txData.push({
        agentId: agent.id,
        providerId: provider.id,
        type: type,
        amount: amount,
        syntheticAccountId: `CUST-SIM-${randomBetween(1000, 9999)}`,
        timestamp: randomTimestamp
      });
    }
  });

  console.log('💾 Writing transactions to database...');
  const chunkSize = 1000;
  for (let i = 0; i < txData.length; i += chunkSize) {
    const chunk = txData.slice(i, i + chunkSize);
    await prisma.transaction.createMany({ data: chunk });
    console.log(`   Written chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(txData.length / chunkSize)}`);
  }

  console.log('🌱 Seeding Past Resolved Alerts...');
  const pastAlert = await prisma.alert.create({
    data: {
      agentId: agentBusy.id,
      providerId: nagad.id,
      scenarioType: 'DATA_INCONSISTENCY',
      source: 'RULE_BASED',
      confidence: 'LOW',
      confidenceReason: 'Delayed network sync detected 24 hours ago.',
      evidence: { delayed: true, count: 3 },
      explanations: {
        en: { reason: "Network timeout.", evidence: "3 late pings", nextStep: "Resolved." },
        bn: { reason: "নেটওয়ার্ক ত্রুটি।", evidence: "৩টি বিলম্বে প্রাপ্ত তথ্য", nextStep: "সমাধান করা হয়েছে।" },
        banglish: { reason: "Network error.", evidence: "3 late pings", nextStep: "Resolved." }
      },
      status: 'RESOLVED',
      ownerId: opsId,
      assignedAt: new Date(now - 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now - 23 * 60 * 60 * 1000)
    }
  });

  await prisma.alertEvent.create({
    data: {
      alertId: pastAlert.id,
      fromStatus: 'PENDING',
      toStatus: 'RESOLVED',
      actorId: opsId,
      note: 'Network restored. Balances reconciled manually.',
      timestamp: new Date(now - 23 * 60 * 60 * 1000)
    }
  });

  console.log(`
  ✨ Database & Auth Successfully Seeded! ✨
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });