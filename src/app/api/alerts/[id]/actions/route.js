import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import {
  transitionAlert,
  getAvailableActions,
  AlertTransitionError,
} from '@/server/services/caseWorkflowService';

const requestSchema = z
  .object({
    action: z.enum(['ACKNOWLEDGE', 'START_PROGRESS', 'ESCALATE', 'RESOLVE', 'DISMISS']),
    note: z.string().max(2000).optional(),
    escalateToOwnerId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'ESCALATE' && !data.escalateToOwnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'escalateToOwnerId is required when action is ESCALATE.',
        path: ['escalateToOwnerId'],
      });
    }
  });

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context - Next.js 15 route
 *  params are async; must be awaited before use.
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireRole(['OPS', 'RISK']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const { id: alertId } = await params;
    if (!alertId) {
      return errorResponse('Alert id is required.', 400);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Request body must be valid JSON.', 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body.', 400, parsed.error.flatten());
    }

    const { action, note, escalateToOwnerId } = parsed.data;

    if (action === 'ESCALATE') {
      const targetOwner = await prisma.owner.findUnique({
        where: { id: escalateToOwnerId },
      });
      if (!targetOwner) {
        return errorResponse(
          `escalateToOwnerId "${escalateToOwnerId}" does not match any Owner.`,
          400
        );
      }
    }

    const { alert, event } = await transitionAlert({
      alertId,
      action,
      actorId: auth.owner.id,
      note,
      escalateToOwnerId,
    });

    return successResponse(
      {
        alert,
        event,
        availableActions: getAvailableActions(alert.status),
      },
      'Alert transitioned successfully.'
    );
  } catch (error) {
    if (error instanceof AlertTransitionError) {
      return errorResponse(error.message, 400, error.context);
    }

    console.error('[POST /api/alerts/[id]/actions]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}