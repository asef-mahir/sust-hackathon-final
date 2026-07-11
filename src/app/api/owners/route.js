/**
 * app/api/owners/route.js
 *
 * GET /api/owners
 *
 * Prerequisite for the Escalate dialog on Page 4 — it needs to know who
 * can be handed an alert. Optional ?role= filter, since escalation
 * targets are typically the Risk team.
 */

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(request) {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') ?? undefined;

    const owners = await prisma.owner.findMany({
      where: { ...(role && { role }) },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    return successResponse({ owners }, 'Owners retrieved.');
  } catch (error) {
    console.error('[GET /api/owners]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
