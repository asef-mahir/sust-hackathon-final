import OpenAI from 'openai';
import { z } from 'zod';
import { recordAiCall } from '@/lib/metrics';

const OPENAI_TIMEOUT_MS = 6000;
const OPENAI_MODEL = 'gpt-5';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @typedef {Object} AdvisoryFinding
 * @property {'HIDDEN_SHORTAGE' | 'HIGH_VELOCITY' | 'DATA_INCONSISTENCY' | 'PHYSICAL_CASH_EXHAUSTION' | 'COORDINATED_CLOSURE' | 'NEGATIVE_BALANCE'} scenarioType
 * @property {string} [providerCode] - e.g. 'BKASH', 'NAGAD', null if holistic
 * @property {'HIGH' | 'MEDIUM' | 'LOW'} confidence - rule-engine confidence
 * @property {string} confidenceReason - rule-engine's own explanation string
 * @property {string} recommendedAction - operational next step from rule engine
 * @property {string} targetStakeholder - who should own this alert
 * @property {Object} evidence - the structured evidence object from anomalyRules.js
 */

/**
 * @typedef {Object} LocalizedAdvisory
 * @property {string} reason
 * @property {string} evidence
 * @property {string} nextStep
 */

/**
 * @typedef {Object} AdvisoryResult
 * @property {'AI' | 'FALLBACK'} source
 * @property {{ en: LocalizedAdvisory, bn: LocalizedAdvisory, banglish: LocalizedAdvisory }} explanations
 * @property {string} [errorReason] - present only when source === 'FALLBACK'
 */

const localizedAdvisorySchema = z.object({
  reason: z.string().min(1),
  evidence: z.string().min(1),
  nextStep: z.string().min(1),
});

const advisoryResponseSchema = z.object({
  en: localizedAdvisorySchema,
  bn: localizedAdvisorySchema,
  banglish: localizedAdvisorySchema,
});

/**
 * Builds the system + user prompt pair for a given finding.
 *
 * @param {AdvisoryFinding} finding
 * @returns {{ system: string, user: string }}
 */
function buildAdvisoryPrompt(finding) {
  const system = [
    'You are a helpful, simple assistant speaking directly to a local Mobile Financial Services (MFS) shop agent or their Area Manager.',
    'You are explaining a system alert regarding their shop\'s cash or app balances.',
    'Keep the language extremely simple, friendly, and easy to understand for a non-technical user.',
    'You NEVER decide or imply fraud. Never use words like "fraudulent", "fraud", "guilty", or "suspicious".',
    'Never suggest moving or converting funds between different providers (e.g., never suggest moving bKash balance to Nagad) — providers are completely separate.',
    // NEW RULE: Leverage Area Profile Context
    'If the evidence contains an "areaProfile" (like CASH_IN_DOMINANT or CASH_OUT_DOMINANT) that makes this alert unusual, briefly explain why this behavior clashes with their normal geographic pattern in the "reason" field.',
    'Respond with strict JSON only, matching this exact shape, no markdown, no commentary outside the JSON:',
    '{"en":{"reason":"","evidence":"","nextStep":""},"bn":{"reason":"","evidence":"","nextStep":""},"banglish":{"reason":"","evidence":"","nextStep":""}}',
    'Each "reason" explains the situation in one simple sentence, under 25 words.', // slightly increased to allow area context
    'Each "evidence" gives the exact number or time involved, under 20 words.',
    'Each "nextStep" is a safe, polite recommendation (e.g., "Please check your balance," or "Contact your area manager"), under 15 words.',
    '"bn" must be written in Bengali script. "banglish" must be Bengali written in Latin script (transliterated), not an English translation.',
    'Use natural, everyday spoken Bengali, not stiff literal word-for-word translation. For example, to say "in a short time" use "কম সময়ে", not the more literal but awkward "ছোট সময়ে" or "সংক্ষিপ্ত সময়ে".',
    'Never state a time of day (like "রাত", "সকাল", or "বিকেল") yourself — the app inserts the exact time separately; just describe the situation and the number.',
  ].join(' ');

  const { contributingTransactionIds, contributingTransactions, ...safeEvidence } = finding.evidence || {};

  const user = JSON.stringify({
    scenarioType: finding.scenarioType,
    providerCode: finding.providerCode || 'GENERAL',
    ruleEngineConfidenceReason: finding.confidenceReason,
    recommendedAction: finding.recommendedAction,
    evidence: safeEvidence,
  });

  return { system, user };
}

/**
 * Deterministic local fallback — no network call, no randomness.
 * Guarantees the alert always has a usable explanation.
 *
 * @param {AdvisoryFinding} finding
 * @returns {{ en: LocalizedAdvisory, bn: LocalizedAdvisory, banglish: LocalizedAdvisory }}
 */
function buildFallbackAdvisory(finding) {
  const SCENARIO_LABELS = {
    HIDDEN_SHORTAGE: 'a possible hidden liquidity shortage',
    HIGH_VELOCITY: 'unusually clustered high-velocity transactions',
    DATA_INCONSISTENCY: 'data inconsistency across providers',
    PHYSICAL_CASH_EXHAUSTION: 'critical depletion of physical cash',
    COORDINATED_CLOSURE: 'suspicious rapid depletion of multiple balances',
    NEGATIVE_BALANCE: 'a critical negative balance error'
  };

  const scenarioLabelEn = SCENARIO_LABELS[finding.scenarioType] || 'an unexpected system anomaly';
  const providerText = finding.providerCode ? ` for ${finding.providerCode}` : '';
  
  // NEW: Append Area Context to Fallback if present
  const areaProfile = finding.evidence?.areaProfile;
  const areaContext = areaProfile ? ` (Context: ${areaProfile})` : '';

  const reasonEn = `Rule-based alert: ${scenarioLabelEn} detected${providerText}${areaContext}. ${finding.confidenceReason}`;
  const evidenceEn = `See attached evidence for exact figures and thresholds breached.`;
  const nextStepEn = finding.recommendedAction || `Flag for operations review; confirm current balance directly with the agent before taking action.`;

  return {
    en: { reason: reasonEn, evidence: evidenceEn, nextStep: nextStepEn },
    bn: {
      reason: `নিয়মভিত্তিক সতর্কতা: সম্ভাব্য অস্বাভাবিক কার্যকলাপ শনাক্ত হয়েছে।`,
      evidence: `সঠিক পরিসংখ্যানের জন্য সংযুক্ত প্রমাণ দেখুন।`,
      nextStep: `পর্যালোচনার জন্য অপারেশন টিমকে জানান; পদক্ষেপ নেওয়ার আগে এজেন্টের সাথে সরাসরি ব্যালেন্স যাচাই করুন।`,
    },
    banglish: {
      reason: `Rule-based alert: oshabhabik kar-kolap shonakto hoyeche.`,
      evidence: `Shothik hisheb-er jonno shongzukto evidence dekhun.`,
      nextStep: `Operations team ke review-er jonno janan; kaj korar age agent-er shathe direct balance jachai korun.`,
    },
  };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI call exceeded ${ms}ms timeout`)), ms)
    ),
  ]);
}

/**
 * Generates a bilingual/trilingual advisory explanation for a rule-engine finding.
 *
 * @param {AdvisoryFinding} finding
 * @returns {Promise<AdvisoryResult>}
 */
export async function generateAlertAdvisory(finding) {
  const startedAt = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    recordAiCall({ durationMs: Date.now() - startedAt, success: false, fallback: true });
    return {
      source: 'FALLBACK',
      explanations: buildFallbackAdvisory(finding),
      errorReason: 'OPENAI_API_KEY not configured',
    };
  }

  const { system, user } = buildAdvisoryPrompt(finding);

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      OPENAI_TIMEOUT_MS
    );

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI response contained no message content');
    }

    const parsedJson = JSON.parse(rawContent);
    const validated = advisoryResponseSchema.parse(parsedJson);

    recordAiCall({ durationMs: Date.now() - startedAt, success: true, fallback: false });
    return {
      source: 'AI',
      explanations: {
        en: validated.en,
        bn: validated.bn,
        banglish: validated.banglish,
      },
    };
  } catch (error) {
    recordAiCall({ durationMs: Date.now() - startedAt, success: false, fallback: true });
    return {
      source: 'FALLBACK',
      explanations: buildFallbackAdvisory(finding),
      errorReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { buildAdvisoryPrompt, buildFallbackAdvisory };