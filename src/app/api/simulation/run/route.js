import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { runSimulationScenario } from '@/server/services/simulationEngine';
import { evaluateAgentAnomalies } from '@/server/services/anomalyRules';
import { generateAlertAdvisory } from '@/server/ai/openaiClient';

/** Statuses that count as "already open" for dedup purposes. */
const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

/**
 * Cool-down window after a case closes before the same agent+scenario+
 * provider combination is allowed to open a fresh alert. Prevents a value
 * oscillating near a rule's threshold from opening/closing/reopening an
 * alert every simulation run (alert fatigue).
 */
const ALERT_COOLDOWN_MINUTES = 10;

/**
 * Maps this run's rule-engine findings to Agent.riskStatus. Simple and
 * explainable by design: any HIGH-confidence finding means CRITICAL, any
 * finding at all means WARNING, no findings means SAFE. This is evaluated
 * fresh on every simulation run, so the badge reflects the agent's live
 * state instead of staying frozen at its seeded value.
 *
 * @param {import('@/server/services/anomalyRules').AnomalyFinding[]} findings
 * @returns {'SAFE' | 'WARNING' | 'CRITICAL'}
 */
function computeRiskStatus(findings) {
  if (findings.length === 0) return 'SAFE';
  if (findings.some((f) => f.confidence === 'HIGH')) return 'CRITICAL';
  return 'WARNING';
}

const requestSchema = z.object({
  scenarioType: z.enum([
    'HIDDEN_SHORTAGE', 
    'HIGH_VELOCITY', 
    'DATA_INCONSISTENCY',
    'PHYSICAL_CASH_EXHAUSTION',
    'NEGATIVE_BALANCE',
    'COORDINATED_CLOSURE' // Added missing scenario
  ]),
  agentId: z.string().min(1, 'agentId is required'),
  targetProviderId: z.string().min(1, 'targetProviderId is required'),
  seed: z.number().int().optional(),
});

/**
 * Checks for an already-open Alert matching this finding, to avoid
 * spawning duplicate alerts if the same scenario is triggered repeatedly
 *
 * @param {import('@/server/services/anomalyRules').AnomalyFinding} finding
 * @returns {Promise<Object|null>}
 */
async function findExistingOpenAlert(finding) {
  return prisma.alert.findFirst({
    where: {
      agentId: finding.agentId,
      scenarioType: finding.scenarioType,
      providerId: finding.providerId ?? null,
      status: { in: OPEN_ALERT_STATUSES },
    },
  });
}

/**
 * Finds a recently RESOLVED/DISMISSED alert for this exact agent+scenario+
 * provider combination, closed within the cool-down window — used to
 * suppress an immediate reopen of a case an operator just closed.
 *
 * @param {import('@/server/services/anomalyRules').AnomalyFinding} finding
 * @returns {Promise<Object|null>}
 */
async function findRecentlyClosedAlert(finding) {
  const cooldownStart = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60_000);
  return prisma.alert.findFirst({
    where: {
      agentId: finding.agentId,
      scenarioType: finding.scenarioType,
      providerId: finding.providerId ?? null,
      status: { in: ['RESOLVED', 'DISMISSED'] },
      resolvedAt: { gte: cooldownStart },
    },
    orderBy: { resolvedAt: 'desc' },
  });
}

/**
 * Persists a single finding as a new Alert, then attaches an AI-generated
 * explanation (or the deterministic fallback if AI fails).
 *
 * @param {import('@/server/services/anomalyRules').AnomalyFinding} finding
 * @returns {Promise<Object>} the final, explanation-attached Alert row
 */
async function createAlertFromFinding(finding) {
  const provider = finding.providerId
    ? await prisma.provider.findUnique({ where: { id: finding.providerId } })
    : null;

  const createdAlert = await prisma.alert.create({
    data: {
      agentId: finding.agentId,
      providerId: finding.providerId ?? null,
      scenarioType: finding.scenarioType,
      confidence: finding.confidence,
      confidenceReason: finding.confidenceReason,
      evidence: finding.evidence,
      status: 'PENDING',
      source: 'RULE_BASED',
    },
  });

  const advisory = await generateAlertAdvisory({
    scenarioType: finding.scenarioType,
    providerCode: provider?.code ?? 'UNKNOWN',
    confidence: finding.confidence,
    confidenceReason: finding.confidenceReason,
    evidence: finding.evidence,
    recommendedAction: finding.recommendedAction,
    targetStakeholder: finding.targetStakeholder,
  });

  return prisma.alert.update({
    where: { id: createdAlert.id },
    data: {
      explanations: advisory.explanations,
      source: advisory.source === 'AI' ? 'HYBRID' : 'RULE_BASED',
    },
  });
}

export async function POST(request) {
  const startedAt = Date.now();

  try {
    // Security checkpoint: Only operations staff can trigger a network simulation
    const auth = await requireRole(['OPS']);
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
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

    const { scenarioType, agentId, targetProviderId, seed } = parsed.data;

    const simulation = await runSimulationScenario({
      scenarioType,
      agentId,
      targetProviderId,
      seed,
    });

    const findings = await evaluateAgentAnomalies(agentId);

    await prisma.agent.update({
      where: { id: agentId },
      data: { riskStatus: computeRiskStatus(findings) },
    });

    const alertsCreated = [];
    const alertsSuppressed = [];

    for (const finding of findings) {
      const existing = await findExistingOpenAlert(finding);

      if (existing) {
        // OVERWRITE LOGIC: Updates the old alert details with the new dynamic telemetry data!
        const provider = finding.providerId
          ? await prisma.provider.findUnique({ where: { id: finding.providerId } })
          : null;

        // 1. Fire off the fresh calculations to OpenAI
        const advisory = await generateAlertAdvisory({
          scenarioType: finding.scenarioType,
          providerCode: provider?.code ?? 'UNKNOWN',
          confidence: finding.confidence,
          confidenceReason: finding.confidenceReason,
          evidence: finding.evidence,
          recommendedAction: finding.recommendedAction,
          targetStakeholder: finding.targetStakeholder,
        });

        // 2. Update the existing row in the database
        const updatedAlert = await prisma.alert.update({
          where: { id: existing.id },
          data: {
            confidence: finding.confidence,
            confidenceReason: finding.confidenceReason,
            evidence: finding.evidence,
            explanations: advisory.explanations,
            source: advisory.source === 'AI' ? 'HYBRID' : 'RULE_BASED',
            createdAt: new Date(), // Bumps the card to the top of the feed list
          },
        });

        // 3. Log the refresh on the audit timeline — otherwise a case that
        // gets re-triggered several times looks, from the timeline alone,
        // like nothing happened between creation and whatever action an
        // operator eventually takes.
        await prisma.alertEvent.create({
          data: {
            alertId: existing.id,
            fromStatus: existing.status,
            toStatus: existing.status,
            actorId: auth.owner.id,
            note: `Evidence refreshed — a renewed ${finding.scenarioType} signal was detected on this already-open case (confidence: ${finding.confidence}).`,
          },
        });

        alertsCreated.push(updatedAlert);
        continue;
      }

      // Cool-down: if this exact agent+scenario+provider combination was
      // just resolved/dismissed, don't immediately reopen a fresh alert —
      // a value oscillating near a threshold would otherwise open/close/
      // reopen a case on every single run.
      const recentlyClosed = await findRecentlyClosedAlert(finding);
      if (recentlyClosed) {
        alertsSuppressed.push({
          scenarioType: finding.scenarioType,
          reason: 'cooldown',
          closedAlertId: recentlyClosed.id,
        });
        continue;
      }

      // Otherwise create a normal new alert...
      const alert = await createAlertFromFinding(finding);
      alertsCreated.push(alert);
    }

    const durationMs = Date.now() - startedAt;

    await prisma.simulationRun.create({
      data: {
        scenarioType,
        agentId,
        seed: seed ?? null,
        transactionsCreated: simulation.transactionsCreated,
        alertsCreated: alertsCreated.length,
        alertsSuppressed: alertsSuppressed.length,
        durationMs,
        triggeredById: auth.owner.id,
      },
    });

    return successResponse(
      { simulation, alertsCreated, alertsSuppressed, durationMs },
      'Simulation executed successfully.'
    );
  } catch (error) {
    console.error('[POST /api/simulation/run]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}