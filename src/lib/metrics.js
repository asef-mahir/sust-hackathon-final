/**
 * lib/metrics.js
 *
 * Tiny in-memory tracker for AI call timing, used only by the
 * /system-evidence page. Hooked into the single existing choke point every
 * AI call already passes through (openaiClient.js's generateAlertAdvisory)
 * — no other files need to change for this.
 *
 * In-memory only: resets on server restart. Fine for a hackathon demo
 * process; the page states this limitation directly rather than hiding it.
 */

const MAX_SAMPLES = 500;
const SERVER_STARTED_AT = new Date().toISOString();

const aiCalls = [];

/**
 * @param {{ durationMs: number, success: boolean, fallback: boolean }} entry
 */
export function recordAiCall(entry) {
  aiCalls.push(entry);
  if (aiCalls.length > MAX_SAMPLES) aiCalls.shift();
}

export function getAiStats() {
  const total = aiCalls.length;
  const aiSuccessCount = aiCalls.filter((c) => c.success && !c.fallback).length;
  const fallbackCount = aiCalls.filter((c) => c.fallback).length;
  const durations = aiCalls.map((c) => c.durationMs);

  return {
    sampleSize: total,
    aiSuccessCount,
    fallbackCount,
    avgResponseTimeMs:
      total > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / total) : null,
    recentSuccessRate: total > 0 ? aiSuccessCount / total : null,
  };
}

export function getServerStartedAt() {
  return SERVER_STARTED_AT;
}
