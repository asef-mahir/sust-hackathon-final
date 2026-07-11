import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const querySchema = z.object({
  status: z
    .enum(['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'])
    .optional(),
  providerId: z.string().optional(),
  areaId: z.string().optional(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export async function GET(request) {
  try {
    // Security checkpoint: Only central command roles can view the global feed
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return errorResponse('Invalid query parameters.', 400, parsed.error.flatten());
    }

    const { status, providerId, areaId, confidence, cursor, limit, sortOrder } =
      parsed.data;
    const take = limit ?? DEFAULT_LIMIT;

    const where = {
      ...(status && { status }),
      ...(providerId && { providerId }),
      ...(confidence && { confidence }),
      ...(areaId && { agent: { areaId } }),
    };

    // Fetch one extra row beyond `take` to determine if there's a next page
    const alerts = await prisma.alert.findMany({
      where,
      take: take + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      // Severity first (HIGH -> MEDIUM -> LOW, matching ConfidenceLevel's
      // declared enum order — verified empirically against this DB), then
      // recency as the tiebreaker within each severity tier. Without this,
      // a stale LOW-confidence alert could sit above a fresh HIGH one.
      orderBy: [{ confidence: 'asc' }, { createdAt: sortOrder ?? 'desc' }],
      include: {
        agent: {
          select: { id: true, name: true, outletCode: true, areaId: true },
        },
        provider: { select: { id: true, code: true, name: true } },
        owner: { select: { id: true, name: true, role: true } },
      },
    });

    const hasNextPage = alerts.length > take;
    const pageItems = hasNextPage ? alerts.slice(0, take) : alerts;
    const nextCursor = hasNextPage ? pageItems[pageItems.length - 1].id : null;

    return successResponse(
      {
        alerts: pageItems,
        pagination: { nextCursor, hasNextPage, count: pageItems.length },
      },
      'Alerts retrieved.'
    );
  } catch (error) {
    console.error('[GET /api/alerts]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}