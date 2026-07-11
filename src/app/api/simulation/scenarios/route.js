import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { listAvailableScenarios } from '@/server/services/simulationEngine';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireRole(['OPS']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const scenarios = listAvailableScenarios();

    return successResponse({ scenarios }, 'Scenarios retrieved.');
  } catch (error) {
    console.error('[GET /api/simulation/scenarios]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}