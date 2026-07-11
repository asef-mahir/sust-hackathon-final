/**
 * app/api/providers/route.js
 *
 * GET /api/providers
 *
 * Simple list endpoint — prerequisite for the Simulation Cockpit's target
 * selector. Only 3 rows ever (bKash, Nagad, Rocket), no pagination needed.
 */

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const providers = await prisma.provider.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    return successResponse({ providers }, 'Providers retrieved.');
  } catch (error) {
    console.error('[GET /api/providers]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
