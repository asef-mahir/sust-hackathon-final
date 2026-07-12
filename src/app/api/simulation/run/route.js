import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { runSimulationScenario } from '@/server/services/simulationEngine';
import { evaluateAgentAnomalies } from '@/server/services/anomalyRules';
import { generateAlertAdvisory } from '@/server/ai/openaiClient';

const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const ALERT_COOLDOWN_MINUTES = 10;

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
    'COORDINATED_CLOSURE'
  ]),
  agentId: z.string().min(1, 'agentId is required'),
  targetProviderId: z.string().min(1, 'targetProviderId is required'),
  seed: z.number().int().optional(),
  // NEW: Allow the API client to trigger the mismatch attack
  forceProfileMismatch: z.boolean().optional().default(false), 
});

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

    const { scenarioType, agentId, targetProviderId, seed, forceProfileMismatch } = parsed.data;

    // 1. Run Simulation
    const simulation = await runSimulationScenario({
      scenarioType,
      agentId,
      targetProviderId,
      seed,
      forceProfileMismatch,
    });

    // CRITICAL FIX: If forceProfileMismatch was true, the engine attacked a DIFFERENT agent.
    // We must evaluate the actual agent that was attacked, not the original request ID.
    const actualAgentId = simulation.agentId;

    // 2. Evaluate Rules against the actually attacked agent
    const findings = await evaluateAgentAnomalies(actualAgentId);

    // 3. Update Risk Status
    await prisma.agent.update({
      where: { id: actualAgentId },
      data: { riskStatus: computeRiskStatus(findings) },
    });

    const alertsCreated = [];
    const alertsSuppressed = [];

    for (const finding of findings) {
      const existing = await findExistingOpenAlert(finding);

      if (existing) {
        const provider = finding.providerId
          ? await prisma.provider.findUnique({ where: { id: finding.providerId } })
          : null;

        const advisory = await generateAlertAdvisory({
          scenarioType: finding.scenarioType,
          providerCode: provider?.code ?? 'UNKNOWN',
          confidence: finding.confidence,
          confidenceReason: finding.confidenceReason,
          evidence: finding.evidence,
          recommendedAction: finding.recommendedAction,
          targetStakeholder: finding.targetStakeholder,
        });

        const updatedAlert = await prisma.alert.update({
          where: { id: existing.id },
          data: {
            confidence: finding.confidence,
            confidenceReason: finding.confidenceReason,
            evidence: finding.evidence,
            explanations: advisory.explanations,
            source: advisory.source === 'AI' ? 'HYBRID' : 'RULE_BASED',
            createdAt: new Date(), 
          },
        });

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

      const recentlyClosed = await findRecentlyClosedAlert(finding);
      if (recentlyClosed) {
        alertsSuppressed.push({
          scenarioType: finding.scenarioType,
          reason: 'cooldown',
          closedAlertId: recentlyClosed.id,
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
        agentId: actualAgentId,
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