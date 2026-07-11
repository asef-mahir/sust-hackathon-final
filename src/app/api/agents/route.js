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
    const areaId = searchParams.get('areaId') ?? undefined;

    const agents = await prisma.agent.findMany({
      where: { ...(areaId && { areaId }) },
      select: {
        id: true,
        name: true,
        outletCode: true,
        areaId: true,
        area: { select: { name: true } },
        riskStatus: true,
      },
      orderBy: { outletCode: 'asc' },
    });

    return successResponse({ agents }, 'Agents retrieved.');
  } catch (error) {
    console.error('[GET /api/agents]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
