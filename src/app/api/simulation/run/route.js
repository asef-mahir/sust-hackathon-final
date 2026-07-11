import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { runSimulationScenario } from '@/server/services/simulationEngine';
import { evaluateAgentAnomalies } from '@/server/services/anomalyRules';
import { generateAlertAdvisory } from '@/server/ai/openaiClient';

/** Statuses that count as "already open" for dedup purposes. */
const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

const requestSchema = z.object({
  scenarioType: z.enum(['HIDDEN_SHORTAGE', 'HIGH_VELOCITY']),
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

    const alertsCreated = [];
    const alertsSuppressed = [];

    for (const finding of findings) {
      const existing = await findExistingOpenAlert(finding);

      if (existing) {
        alertsSuppressed.push({
          scenarioType: finding.scenarioType,
          existingAlertId: existing.id,
        });
        continue;
      }

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