/**
 * app/api/simulation/scenarios/route.js
 *
 * GET /api/simulation/scenarios
 *
 * Thin wrapper — simulationEngine.listAvailableScenarios() already existed
 * (Phase 2) but was never exposed over HTTP. No business logic added here;
 * this route's only job is auth + calling the existing function.
 */

import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { listAvailableScenarios } from '@/server/services/simulationEngine';

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
