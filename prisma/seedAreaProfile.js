const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAllAreaProfiles() {
  const areas = await prisma.area.findMany({ include: { agents: { include: { transactions: true } } } });

  for (const area of areas) {
    let totalCashIn = 0;
    let totalCashOut = 0;

    // Sum up all transactions for all agents in this area
    area.agents.forEach(agent => {
      agent.transactions.forEach(t => {
        if (t.type === 'CASH_IN') totalCashIn += Number(t.amount);
        if (t.type === 'CASH_OUT') totalCashOut += Number(t.amount);
      });
    });

    const ratio = totalCashOut > 0 ? (totalCashIn / totalCashOut) : 1;
    let profile = 'BALANCED';
    if (ratio > 1.5) profile = 'CASH_IN_DOMINANT';
    if (ratio < 0.66) profile = 'CASH_OUT_DOMINANT';

    await prisma.area.update({ where: { id: area.id }, data: { profile } });
    console.log(`Updated ${area.name} to ${profile} (Ratio: ${ratio.toFixed(2)})`);
  }
}

updateAllAreaProfiles();