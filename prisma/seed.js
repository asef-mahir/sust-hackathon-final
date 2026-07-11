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
  // Delete in correct dependency order
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

  console.log('🌱 Seeding Reference Areas...');
  const zindabazar = await prisma.area.create({ data: { name: 'Sylhet_Zindabazar' } });
  const bandarbazar = await prisma.area.create({ data: { name: 'Sylhet_Bandarbazar' } });
  const subidbazar = await prisma.area.create({ data: { name: 'Sylhet_Subidbazar' } });

  console.log('🌱 Seeding MFS Providers...');
  const bkash = await prisma.provider.create({ data: { code: 'BKASH', name: 'bKash Limited' } });
  const nagad = await prisma.provider.create({ data: { code: 'NAGAD', name: 'Nagad MFS' } });
  const rocket = await prisma.provider.create({ data: { code: 'ROCKET', name: 'DBBL Rocket' } });

  console.log('🌱 Seeding Agent Network...');
  const agentNormal = await prisma.agent.create({
    data: {
      name: 'Zindabazar Digital Telecom',
      outletCode: 'OUTLET-77102',
      areaId: zindabazar.id,
      physicalCash: 150000.00,
    },
  });

  // Target agent for our demo scenarios (Warning Status)
  const agentVulnerable = await prisma.agent.create({
    data: {
      name: 'Mizan MFS Point',
      outletCode: 'OUTLET-102',
      areaId: zindabazar.id,
      physicalCash: 120000.00, 
      riskStatus: 'WARNING'
    },
  });

  const agentBusy = await prisma.agent.create({
    data: {
      name: 'Bandarbazar Enterprise',
      outletCode: 'OUTLET-99213',
      areaId: bandarbazar.id,
      physicalCash: 250000.00, 
    },
  });

  const agentLowCash = await prisma.agent.create({
    data: {
      name: 'Chowdhury Traders',
      outletCode: 'OUTLET-44811',
      areaId: subidbazar.id,
      physicalCash: 15000.00, // Very low physical cash
    },
  });

  console.log('🌱 Mapping Auth Users to Prisma Owners...');
  await prisma.owner.createMany({
    data: [
      { id: opsId, name: 'Rahat Ahmed (Ops)', role: 'OPS' },
      { id: riskId, name: 'Nadia Chowdhury (Risk)', role: 'RISK' },
      { id: agentId, name: 'Sohrab Hossain (Agent)', role: 'AGENT', managedAgentId: agentVulnerable.id }, 
    ],
  });

  console.log('🌱 Instantiating Provider E-Money Balances with Safe Thresholds...');
  await prisma.providerBalance.createMany({
    data: [
      // Normal Agent
      { agentId: agentNormal.id, providerId: bkash.id, balance: 50000.00, minimumThreshold: 10000 },
      { agentId: agentNormal.id, providerId: nagad.id, balance: 60000.00, minimumThreshold: 10000 },
      { agentId: agentNormal.id, providerId: rocket.id, balance: 40000.00, minimumThreshold: 10000 },
      
      // Vulnerable Agent (Scenario A: Hidden Shortage - bKash balance is 8,000 but threshold is 15,000)
      { agentId: agentVulnerable.id, providerId: bkash.id, balance: 8000.00, minimumThreshold: 15000 }, 
      { agentId: agentVulnerable.id, providerId: nagad.id, balance: 80000.00, minimumThreshold: 15000 },  
      { agentId: agentVulnerable.id, providerId: rocket.id, balance: 60000.00, minimumThreshold: 15000 }, 
      
      // Busy Agent
      { agentId: agentBusy.id, providerId: bkash.id, balance: 150000.00, minimumThreshold: 50000 }, 
      { agentId: agentBusy.id, providerId: nagad.id, balance: 120000.00, minimumThreshold: 50000 },  
      { agentId: agentBusy.id, providerId: rocket.id, balance: 90000.00, minimumThreshold: 50000 }, 

      // Low Cash Agent
      { agentId: agentLowCash.id, providerId: bkash.id, balance: 75000.00, minimumThreshold: 5000 }, 
      { agentId: agentLowCash.id, providerId: nagad.id, balance: 85000.00, minimumThreshold: 5000 },  
      { agentId: agentLowCash.id, providerId: rocket.id, balance: 40000.00, minimumThreshold: 5000 }, 
    ],
  });

  console.log('🌱 Generating Baseline Transactions & Anomalies...');
  const now = new Date();
  
  // Normal baseline transactions
  const txData = [
    { agentId: agentNormal.id, providerId: bkash.id, type: 'CASH_IN', amount: 5000.00, syntheticAccountId: 'CUST-SIM-101', timestamp: new Date(now.getTime() - 45 * 60000) },
    { agentId: agentNormal.id, providerId: nagad.id, type: 'CASH_OUT', amount: 2500.00, syntheticAccountId: 'CUST-SIM-102', timestamp: new Date(now.getTime() - 30 * 60000) },
    { agentId: agentVulnerable.id, providerId: rocket.id, type: 'CASH_IN', amount: 10000.00, syntheticAccountId: 'CUST-SIM-104', timestamp: new Date(now.getTime() - 20 * 60000) },
    { agentId: agentBusy.id, providerId: nagad.id, type: 'CASH_OUT', amount: 8000.00, syntheticAccountId: 'CUST-SIM-105', timestamp: new Date(now.getTime() - 15 * 60000) },
    
    // Injecting a Liquidity Refill (Agent bringing physical cash from Bank)
    { agentId: agentBusy.id, providerId: bkash.id, type: 'LIQUIDITY_REFILL', amount: 50000.00, timestamp: new Date(now.getTime() - 10 * 60000) },
    { agentId: agentLowCash.id, providerId: rocket.id, type: 'CASH_IN', amount: 2000.00, syntheticAccountId: 'CUST-SIM-106', timestamp: new Date(now.getTime() - 5 * 60000) },
  ];

  // SCENARIO B: High Velocity Anomaly Injection
  // Multiple rapid cash-outs from a small group of synthetic accounts for the same amount
  const anomalyAccountId1 = 'CUST-SIM-999';
  const anomalyAccountId2 = 'CUST-SIM-888';
  
  for (let i = 1; i <= 4; i++) {
    txData.push({
      agentId: agentVulnerable.id,
      providerId: nagad.id,
      type: 'CASH_OUT',
      amount: 24500.00, // Just under typical limits
      syntheticAccountId: i % 2 === 0 ? anomalyAccountId1 : anomalyAccountId2,
      timestamp: new Date(now.getTime() - (5 - i) * 60000), // Spaced 1 minute apart
    });
  }

  await prisma.transaction.createMany({ data: txData });

  console.log('🌱 Seeding Demonstration Alerts (Coordination Workflow)...');
  
  // Create an active alert for Scenario A (Hidden Shortage)
  const shortageAlert = await prisma.alert.create({
    data: {
      agentId: agentVulnerable.id,
      providerId: bkash.id,
      scenarioType: 'HIDDEN_SHORTAGE',
      source: 'RULE_BASED',
      confidence: 'HIGH',
      confidenceReason: 'bKash e-money (8,000) is well below the historical safe threshold (15,000) for this time of day.',
      evidence: {
        totalPhysicalCash: 120000.00,
        providerBalances: { BKASH: 8000.00, NAGAD: 80000.00, ROCKET: 60000.00 },
        projectedShortageTime: new Date(now.getTime() + 45 * 60000).toISOString() // Predicts out of balance in 45 mins
      },
      explanations: {
        bangla: "বর্তমান লেনদেনের ধারা অনুযায়ী বিকেল ৫টা ২০ মিনিটের মধ্যে আপনার নগদ টাকা শেষ হয়ে যেতে পারে। নিরাপদে সেবা চালু রাখতে কমপক্ষে ২০,০০০ টাকা অতিরিক্ত নগদ ব্যবস্থা করার পরামর্শ দেওয়া হচ্ছে।"
      },
      status: 'PENDING',
    }
  });

  // Create an active alert for Scenario B (High Velocity)
  const velocityAlert = await prisma.alert.create({
    data: {
      agentId: agentVulnerable.id,
      providerId: nagad.id,
      scenarioType: 'HIGH_VELOCITY',
      source: 'HYBRID',
      confidence: 'MEDIUM',
      confidenceReason: '4 identical large transactions within 5 minutes from only 2 accounts.',
      evidence: {
        transactionCount: 4,
        timeWindowMinutes: 5,
        totalVolume: 98000.00,
        uniqueAccounts: 2,
        pattern: "Repeated split amounts"
      },
      explanations: {
        bangla: "গত ১২ মিনিটে স্বাভাবিকের তুলনায় অনেক বেশি ক্যাশ-আউট হয়েছে। কয়েকটি লেনদেনের পরিমাণ প্রায় একই এবং অল্প কয়েকটি অ্যাকাউন্ট থেকে বারবার অনুরোধ এসেছে। এটি ঈদ-পূর্ব স্বাভাবিক চাহিদাও হতে পারে, তবে বড় অঙ্কের নগদ পুনরায় সরবরাহের আগে লেনদেনগুলো পর্যালোচনা করা প্রয়োজন।"
      },
      status: 'ACKNOWLEDGED',
      ownerId: riskId,
      assignedAt: new Date(now.getTime() - 2 * 60000)
    }
  });

  // Seed Audit Trail (Alert Events) to show case coordination
  await prisma.alertEvent.createMany({
    data: [
      {
        alertId: velocityAlert.id,
        fromStatus: 'PENDING',
        toStatus: 'ACKNOWLEDGED',
        actorId: opsId,
        note: 'Escalating to Risk team due to suspicious high-value repeating cash-outs.',
        timestamp: new Date(now.getTime() - 3 * 60000)
      },
      {
        alertId: velocityAlert.id,
        actorId: riskId,
        note: 'Reviewing synthetic account velocity patterns.',
        timestamp: new Date(now.getTime() - 1 * 60000)
      }
    ]
  });

  console.log(`
  ✨ Database & Auth Successfully Seeded! ✨
  --------------------------------------------------
  Agents     : 4 Active Shops 
  Thresholds : Added minimum safe operating limits
  Anomalies  : Injected Scenario B velocity burst 
  Alerts     : Pre-seeded Scenario A & B active alerts
  Auth Ready : 3 Accounts provisioned
  --------------------------------------------------
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