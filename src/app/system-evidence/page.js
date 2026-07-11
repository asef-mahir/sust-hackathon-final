'use client';

/**
 * app/system-evidence/page.js
 *
 * Engineering Evidence / System Validation page — exists ONLY to
 * demonstrate measurable engineering quality during the hackathon
 * presentation. Not a product feature, not an admin dashboard, not tied to
 * any user role's workflow. Completely separate route, fetches its own
 * data from GET /api/system/metrics, and doesn't touch any existing page.
 *
 * Self-contained client component, matching the established pattern in
 * this app (ops/page.js, alerts/page.js, risk/page.js) rather than
 * introducing new shared component abstractions for a page that exists
 * once.
 */

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Activity,
  Gauge,
  Database,
  CheckCircle2,
  XCircle,
  Sparkles,
  Server,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  Clock,
} from 'lucide-react';

function formatMs(value) {
  if (value === null || value === undefined) return '—';
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatPct(value) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const diffMinutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.round(diffMinutes / 60)}h ago`;
}

function StatCard({ icon: Icon, label, value, sublabel, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'text-slate-900',
    healthy: 'text-healthy',
    critical: 'text-critical',
    brass: 'text-brass',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`ls-numeric text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-slate-500">{sublabel}</p> : null}
    </div>
  );
}

function ProgressBar({ value, tone = 'healthy' }) {
  const toneClasses = {
    healthy: 'bg-healthy',
    brass: 'bg-brass',
    critical: 'bg-critical',
  };
  const pct = value === null || value === undefined ? 0 : Math.round(value * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${toneClasses[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h2>
        {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      </div>
    </div>
  );
}

const AI_SPLIT_COLORS = ['var(--color-healthy)', 'var(--color-brass)'];

export default function SystemEvidencePage() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/system/metrics');
      const json = await res.json();
      if (res.ok && json.success) {
        setMetrics(json.data);
      } else {
        setError(json.message || 'Failed to load system metrics.');
      }
    } catch (err) {
      setError('Network error while loading system metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-critical" />
        <p className="text-sm text-slate-600">{error || 'No data available.'}</p>
        <button
          onClick={fetchMetrics}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  const { performance, analytics, reliability, ai, system, meta } = metrics;

  const aiSplitData = [
    { name: 'AI-generated', value: ai.aiResponsesGenerated },
    { name: 'Rule-based fallback', value: ai.ruleBasedFallbackCount },
  ].filter((d) => d.value > 0);

  const systemOperational = reliability.databaseConnected;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Engineering Evidence
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                systemOperational
                  ? 'border-healthy/30 bg-healthy/10 text-healthy'
                  : 'border-critical/30 bg-critical/10 text-critical'
              }`}
            >
              {systemOperational ? 'Operational' : 'Degraded'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Measurable system validation for judges &amp; reviewers — not a product feature.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Transparency note */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        {meta.note}
      </div>

      {/* System Performance */}
      <section>
        <SectionHeader
          icon={Gauge}
          title="System Performance"
          description="Measured directly from existing simulation and AI-call records."
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatCard
            icon={GitBranch}
            label="Simulation Exec Time"
            value={formatMs(performance.avgSimulationExecutionMs)}
            sublabel="avg per run"
          />
          <StatCard
            icon={Sparkles}
            label="Alert Explanation Time"
            value={formatMs(performance.avgAlertExplanationGenerationMs)}
            sublabel="AI generation avg"
          />
          <StatCard
            icon={Database}
            label="DB Ping"
            value={formatMs(performance.dbPingMs)}
            sublabel="live, this request"
          />
        </div>
      </section>

      {/* Analytics Validation */}
      <section>
        <SectionHeader
          icon={ShieldCheck}
          title="Analytics Validation"
          description="Durable counts from the database — persist across restarts."
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Activity} label="Simulations Run" value={analytics.simulationsExecuted} />
          <StatCard icon={AlertTriangle} label="Alerts Generated" value={analytics.alertsGenerated} />
          <StatCard icon={Clock} label="Active Alerts" value={analytics.activeAlerts} tone="brass" />
          <StatCard
            icon={CheckCircle2}
            label="Alerts Resolved"
            value={analytics.alertsResolved}
            tone="healthy"
          />
          <StatCard
            icon={XCircle}
            label="Operator-Reported FP Rate"
            value={formatPct(analytics.operatorReportedFalsePositiveRate)}
            sublabel="dismissed / closed"
          />
          <StatCard
            icon={Sparkles}
            label="Explanation Coverage"
            value={formatPct(analytics.explanationCoveragePct)}
            tone="healthy"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Reliability */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Server} title="Reliability" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Last Simulation Sync</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatRelativeTime(reliability.lastSimulationSyncAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Database</p>
              <p className="flex items-center gap-1 text-sm font-semibold text-healthy">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected ({reliability.databasePingMs}ms)
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">AI Provider</p>
              <p
                className={`flex items-center gap-1 text-sm font-semibold ${
                  reliability.aiProviderConfigured ? 'text-healthy' : 'text-slate-400'
                }`}
              >
                {reliability.aiProviderConfigured ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </>
                ) : (
                  'Not configured'
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fallback Usage</p>
              <p className="ls-numeric text-sm font-semibold text-brass">
                {reliability.fallbackUsageCount} alerts
              </p>
            </div>
          </div>
        </div>

        {/* AI */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Sparkles} title="AI Explainability" />
          <div className="flex items-center gap-6">
            {aiSplitData.length > 0 ? (
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aiSplitData}
                      dataKey="value"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                    >
                      {aiSplitData.map((entry, i) => (
                        <Cell key={entry.name} fill={AI_SPLIT_COLORS[i % AI_SPLIT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center text-xs text-slate-400">
                No alerts yet
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-healthy" /> AI-generated
                </span>
                <span className="ls-numeric font-semibold text-slate-900">
                  {ai.aiResponsesGenerated}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-brass" /> Rule-based fallback
                </span>
                <span className="ls-numeric font-semibold text-slate-900">
                  {ai.ruleBasedFallbackCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Avg AI Response Time</span>
                <span className="ls-numeric font-semibold text-slate-900">
                  {formatMs(ai.avgAiResponseTimeMs)}
                </span>
              </div>
              <ProgressBar value={ai.recentAiSuccessRate} tone="healthy" />
              <p className="text-xs text-slate-400">
                {formatPct(ai.recentAiSuccessRate)} success rate (n={ai.aiSampleSize} recent calls)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <section>
        <SectionHeader icon={GitBranch} title="System" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={GitBranch} label="Version" value={system.version} />
          <StatCard icon={Server} label="Environment" value={system.environment} />
          <StatCard
            icon={Clock}
            label="Server Started"
            value={formatRelativeTime(system.serverStartedAt)}
          />
          <StatCard
            icon={Clock}
            label="Last Deployment"
            value="N/A"
            sublabel="No CI/CD pipeline in this environment"
          />
        </div>
      </section>
    </div>
  );
}
