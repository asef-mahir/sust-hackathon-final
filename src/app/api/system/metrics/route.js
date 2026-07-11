/**
 * app/api/system/metrics/route.js
 *
 * GET /api/system/metrics
 *
 * Aggregation endpoint feeding the /system-evidence page ONLY. Not part of
 * any product workflow. Everything here comes straight from existing
 * tables (SimulationRun, Alert) plus a live DB ping measured at request
 * time and a small AI-call timing tracker (lib/metrics.js) hooked into the
 * one existing choke point every AI call already passes through.
 *
 * No metric here is fabricated. Where something isn't tracked (e.g. "last
 * deployment"), the field says so explicitly instead of inventing a value.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { getAiStats, getServerStartedAt } from '@/lib/metrics';

const OPEN_ALERT_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'];

function readPackageVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return errorResponse(auth.message, auth.status);
    }

    const dbPingStart = Date.now();
    const [
      simulationRunCount,
      simulationAgg,
      alertsTotal,
      activeAlerts,
      resolvedCount,
      dismissedCount,
      explainedCount,
      aiSourcedCount,
      ruleBasedCount,
      latestRun,
    ] = await Promise.all([
      prisma.simulationRun.count(),
      prisma.simulationRun.aggregate({ _avg: { durationMs: true } }),
      prisma.alert.count(),
      prisma.alert.count({ where: { status: { in: OPEN_ALERT_STATUSES } } }),
      prisma.alert.count({ where: { status: 'RESOLVED' } }),
      prisma.alert.count({ where: { status: 'DISMISSED' } }),
      prisma.alert.count({ where: { explanations: { not: null } } }),
      prisma.alert.count({ where: { source: 'HYBRID' } }),
      prisma.alert.count({ where: { source: 'RULE_BASED' } }),
      prisma.simulationRun.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    const dbPingMs = Date.now() - dbPingStart;

    const closedCount = resolvedCount + dismissedCount;
    const aiStats = getAiStats();

    return successResponse(
      {
        performance: {
          avgSimulationExecutionMs: simulationAgg._avg.durationMs
            ? Math.round(simulationAgg._avg.durationMs)
            : null,
          avgAlertExplanationGenerationMs: aiStats.avgResponseTimeMs,
          dbPingMs,
        },
        analytics: {
          simulationsExecuted: simulationRunCount,
          alertsGenerated: alertsTotal,
          activeAlerts,
          alertsResolved: resolvedCount,
          alertsDismissed: dismissedCount,
          operatorReportedFalsePositiveRate:
            closedCount > 0 ? dismissedCount / closedCount : null,
          explanationCoveragePct: alertsTotal > 0 ? explainedCount / alertsTotal : null,
        },
        reliability: {
          lastSimulationSyncAt: latestRun?.createdAt ?? null,
          databaseConnected: true,
          databasePingMs: dbPingMs,
          aiProviderConfigured: Boolean(process.env.OPENAI_API_KEY),
          fallbackUsageCount: ruleBasedCount,
        },
        ai: {
          aiResponsesGenerated: aiSourcedCount,
          ruleBasedFallbackCount: ruleBasedCount,
          avgAiResponseTimeMs: aiStats.avgResponseTimeMs,
          recentAiSuccessRate: aiStats.recentSuccessRate,
          aiSampleSize: aiStats.sampleSize,
        },
        system: {
          version: readPackageVersion(),
          environment: process.env.NODE_ENV,
          serverStartedAt: getServerStartedAt(),
          lastDeployment: null,
        },
        meta: {
          note:
            'Alert/simulation figures come straight from the database and persist across restarts. AI response-time figures are measured in-memory for this running server process and reset on restart.',
          generatedAt: new Date().toISOString(),
        },
      },
      'System metrics retrieved.'
    );
  } catch (error) {
    console.error('[GET /api/system/metrics]', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error.',
      500
    );
  }
}
