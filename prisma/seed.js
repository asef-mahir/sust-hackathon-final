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
  await prisma.alertEvent.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.providerBalance.deleteMany({});
  
  // Notice we delete Owner BEFORE Agent because Owner now depends on Agent
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

  // This is the target agent for our demo scenarios
  const agentVulnerable = await prisma.agent.create({
    data: {
      name: 'Mizan MFS Point',
      outletCode: 'OUTLET-102',
      areaId: zindabazar.id,
      physicalCash: 120000.00, 
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
      // Linking Sohrab's account directly to the physical shop for the dashboard view
      { id: agentId, name: 'Sohrab Hossain (Agent)', role: 'AGENT', managedAgentId: agentVulnerable.id }, 
    ],
  });

  console.log('🌱 Instantiating Provider E-Money Balances...');
  await prisma.providerBalance.createMany({
    data: [
      // Normal Agent
      { agentId: agentNormal.id, providerId: bkash.id, balance: 50000.00 },
      { agentId: agentNormal.id, providerId: nagad.id, balance: 60000.00 },
      { agentId: agentNormal.id, providerId: rocket.id, balance: 40000.00 },
      
      // Vulnerable Agent (Prepped for Hidden Shortage demo)
      { agentId: agentVulnerable.id, providerId: bkash.id, balance: 8000.00 }, 
      { agentId: agentVulnerable.id, providerId: nagad.id, balance: 80000.00 },  
      { agentId: agentVulnerable.id, providerId: rocket.id, balance: 60000.00 }, 
      
      // Busy Agent
      { agentId: agentBusy.id, providerId: bkash.id, balance: 150000.00 }, 
      { agentId: agentBusy.id, providerId: nagad.id, balance: 120000.00 },  
      { agentId: agentBusy.id, providerId: rocket.id, balance: 90000.00 }, 

      // Low Cash Agent
      { agentId: agentLowCash.id, providerId: bkash.id, balance: 75000.00 }, 
      { agentId: agentLowCash.id, providerId: nagad.id, balance: 85000.00 },  
      { agentId: agentLowCash.id, providerId: rocket.id, balance: 40000.00 }, 
    ],
  });

  console.log('🌱 Generating Baseline Transactions...');
  const now = new Date();
  const txData = [
    { agentId: agentNormal.id, providerId: bkash.id, type: 'CASH_IN', amount: 5000.00, timestamp: new Date(now.getTime() - 45 * 60000) },
    { agentId: agentNormal.id, providerId: nagad.id, type: 'CASH_OUT', amount: 2500.00, timestamp: new Date(now.getTime() - 30 * 60000) },
    { agentId: agentVulnerable.id, providerId: bkash.id, type: 'CASH_OUT', amount: 1500.00, timestamp: new Date(now.getTime() - 25 * 60000) },
    { agentId: agentVulnerable.id, providerId: rocket.id, type: 'CASH_IN', amount: 10000.00, timestamp: new Date(now.getTime() - 20 * 60000) },
    { agentId: agentBusy.id, providerId: nagad.id, type: 'CASH_OUT', amount: 8000.00, timestamp: new Date(now.getTime() - 15 * 60000) },
    { agentId: agentBusy.id, providerId: bkash.id, type: 'CASH_OUT', amount: 12000.00, timestamp: new Date(now.getTime() - 10 * 60000) },
    { agentId: agentLowCash.id, providerId: rocket.id, type: 'CASH_IN', amount: 2000.00, timestamp: new Date(now.getTime() - 5 * 60000) },
    { agentId: agentVulnerable.id, providerId: nagad.id, type: 'CASH_IN', amount: 4500.00, timestamp: new Date(now.getTime() - 2 * 60000) },
  ];

  await prisma.transaction.createMany({ data: txData });

  console.log(`
  ✨ Database & Auth Successfully Seeded! ✨
  --------------------------------------------------
  Agents     : 4 Active Shops (Zindabazar, Bandarbazar, Subidbazar)
  History    : 8 Recent Transactions logged
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