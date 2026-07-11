import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const querySchema = z.object({
  scenarioType: z.enum(['HIDDEN_SHORTAGE', 'HIGH_VELOCITY']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

export async function GET(request) {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return errorResponse('Invalid query parameters.', 400, parsed.error.flatten());
    }

    const { scenarioType, cursor, limit } = parsed.data;
    const take = limit ?? DEFAULT_LIMIT;

    const runs = await prisma.simulationRun.findMany({
      where: { ...(scenarioType && { scenarioType }) },
      take: take + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, outletCode: true } },
        triggeredBy: { select: { id: true, name: true, role: true } },
      },
    });

    const hasNextPage = runs.length > take;
    const pageItems = hasNextPage ? runs.slice(0, take) : runs;
    const nextCursor = hasNextPage ? pageItems[pageItems.length - 1].id : null;

    return successResponse(
      {
        runs: pageItems,
        pagination: { nextCursor, hasNextPage, count: pageItems.length },
      },
      'Simulation history retrieved.'
    );
  } catch (error) {
    console.error('[GET /api/simulation/history]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}