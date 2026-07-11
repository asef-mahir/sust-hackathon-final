/**
 * app/api/settings/reset-demo-data/route.js
 *
 * POST /api/settings/reset-demo-data
 *
 * Destructive, OPS-only. Deletes all Transaction/Alert/AlertEvent/
 * SimulationRun rows and resets every Agent.physicalCash and
 * ProviderBalance.balance to fixed baseline values.
 *
 * IMPORTANT CAVEAT: this does NOT restore your original prisma/seed.js
 * values — no snapshot of the original seed state exists anywhere in
 * this system. BASELINE_CASH / BASELINE_PROVIDER_BALANCE below are
 * reasonable round demo numbers, not a true "undo." If your seed script
 * used different starting balances, either update these constants to
 * match, or treat this as "reset to a clean, predictable demo state"
 * rather than "restore exactly what I seeded."
 */

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const BASELINE_CASH = 50000;
const BASELINE_PROVIDER_BALANCE = 30000;

export async function POST() {
  try {
    const auth = await requireRole(['OPS']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    await prisma.$transaction([
      prisma.alertEvent.deleteMany({}),
      prisma.alert.deleteMany({}),
      prisma.simulationRun.deleteMany({}),
      prisma.transaction.deleteMany({}),
      prisma.providerBalance.updateMany({ data: { balance: BASELINE_PROVIDER_BALANCE } }),
      prisma.agent.updateMany({ data: { physicalCash: BASELINE_CASH, riskStatus: 'SAFE' } }),
    ]);

    return successResponse(
      { baselineCash: BASELINE_CASH, baselineProviderBalance: BASELINE_PROVIDER_BALANCE },
      'Demo data reset to baseline.'
    );
  } catch (error) {
    console.error('[POST /api/settings/reset-demo-data]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
