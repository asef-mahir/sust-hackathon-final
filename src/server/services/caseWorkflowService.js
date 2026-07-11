import { prisma } from '../../lib/prisma';

const VALID_TRANSITIONS = {
  PENDING: {
    ACKNOWLEDGE: 'ACKNOWLEDGED',
    DISMISS: 'DISMISSED',
  },
  ACKNOWLEDGED: {
    START_PROGRESS: 'IN_PROGRESS',
    ESCALATE: 'IN_PROGRESS',
    DISMISS: 'DISMISSED',
  },
  IN_PROGRESS: {
    ESCALATE: 'IN_PROGRESS', // self-loop: reassignment only
    RESOLVE: 'RESOLVED',
    DISMISS: 'DISMISSED',
  },
  RESOLVED: {},
  DISMISSED: {},
};

export class AlertTransitionError extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'AlertTransitionError';
    this.context = context;
  }
}

function resolveTransition(fromStatus, action) {
  return VALID_TRANSITIONS[fromStatus]?.[action] ?? null;
}

/**
 * Applies a single action to an alert: validates legality, updates status
 * (and ownership, where relevant), and writes an AlertEvent — atomically.
 */
export async function transitionAlert({
  alertId,
  action,
  actorId,
  note,
  escalateToOwnerId,
}) {
  if (action === 'ESCALATE' && !escalateToOwnerId) {
    throw new AlertTransitionError(
      'ESCALATE action requires escalateToOwnerId (the Owner the alert is being handed off to).',
      { alertId, currentStatus: 'UNKNOWN', action }
    );
  }

  return prisma.$transaction(async (tx) => {
    const currentAlert = await tx.alert.findUnique({ where: { id: alertId } });

    if (!currentAlert) {
      throw new AlertTransitionError(`Alert not found: ${alertId}`, {
        alertId,
        currentStatus: 'UNKNOWN',
        action,
      });
    }

    const fromStatus = currentAlert.status;
    const toStatus = resolveTransition(fromStatus, action);

    if (!toStatus) {
      throw new AlertTransitionError(
        `Action "${action}" is not valid from status "${fromStatus}".`,
        { alertId, currentStatus: fromStatus, action }
      );
    }

    const updateData = { status: toStatus };

    if (action === 'ACKNOWLEDGE' && !currentAlert.ownerId) {
      // First responder claims ownership implicitly, if nobody owns it yet.
      updateData.ownerId = actorId;
      updateData.assignedAt = new Date();
    }

    if (action === 'ESCALATE') {
      updateData.ownerId = escalateToOwnerId;
      updateData.assignedAt = new Date();
    }

    if (action === 'RESOLVE' || action === 'DISMISS') {
      updateData.resolvedAt = new Date();
    }

    const updatedAlert = await tx.alert.update({
      where: { id: alertId },
      data: updateData,
    });

    const event = await tx.alertEvent.create({
      data: {
        alertId,
        fromStatus,
        toStatus,
        actorId,
        note:
          action === 'ESCALATE'
            ? `Escalated to owner ${escalateToOwnerId}.${note ? ` ${note}` : ''}`
            : note ?? null,
      },
    });

    return { alert: updatedAlert, event };
  });
}

/**
 * Returns the set of actions currently valid for a given status — used by the UI
 */
export function getAvailableActions(status) {
  return Object.keys(VALID_TRANSITIONS[status] ?? {});
}

/**
 * Convenience read: full audit timeline for an alert, oldest first
 */
export async function getAlertTimeline(alertId) {
  return prisma.alertEvent.findMany({
    where: { alertId },
    orderBy: { timestamp: 'asc' },
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
}