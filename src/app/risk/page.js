'use client';

/**
 * app/risk/page.js
 *
 * Risk Dashboard — deep-dive view for the Risk Analyst role (Nadia Chowdhury).
 * Self-contained client component, matching the existing app/alerts/page.js
 * pattern (own fetch + action handling) rather than the more decomposed
 * component style, for consistency with what's already live.
 *
 * Connected APIs:
 *   GET  /api/alerts?confidence=HIGH   — high-confidence anomaly feed
 *   GET  /api/alerts?limit=100         — broader pull, filtered client-side
 *                                         for alerts an Ops analyst has
 *                                         escalated to a Risk-role owner
 *   POST /api/alerts/[id]/actions      — Acknowledge / Resolve / Dismiss
 *
 * Note on scope: the brief mentions a "Suspend" action alongside "Flag for
 * Review." This app's own guardrails (see RESPONSIBLE_DESIGN.md / hackathon
 * rules) explicitly forbid automatically blocking or freezing an agent —
 * risk signals are advisory only. "Flag for Review" is implemented as the
 * existing Acknowledge action; a "Suspend" action is intentionally not
 * built, since it would cross that line.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShieldAlert,
  Loader2,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';

const SCENARIO_LABELS = {
  HIDDEN_SHORTAGE: 'Hidden Shortage',
  HIGH_VELOCITY: 'High Velocity',
  DATA_INCONSISTENCY: 'Data Inconsistency',
};

function formatRelativeTime(isoString) {
  const diffMinutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.round(diffMinutes / 60)}h ago`;
}

const ACCOUNT_COLORS = ['var(--color-critical)', 'var(--color-brass)', 'var(--color-provider-c)'];

export default function RiskDashboardPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [highRes, broadRes] = await Promise.all([
        fetch('/api/alerts?confidence=HIGH&limit=50'),
        fetch('/api/alerts?limit=100'),
      ]);
      const [highJson, broadJson] = await Promise.all([highRes.json(), broadRes.json()]);

      if (!highRes.ok || !highJson.success) {
        toast.error(highJson.message || 'Failed to load high-confidence alerts');
        setIsLoading(false);
        return;
      }

      const highConfidence = highJson.data.alerts;

      // "Explicitly escalated by the Ops team" = currently owned by a
      // Risk-role Owner (an OPS actor's ESCALATE action reassigns ownerId
      // to whoever it was handed off to).
      const escalatedToRisk =
        broadRes.ok && broadJson.success
          ? broadJson.data.alerts.filter((a) => a.owner?.role === 'RISK')
          : [];

      const merged = new Map();
      for (const a of [...highConfidence, ...escalatedToRisk]) {
        merged.set(a.id, a);
      }

      setAlerts(
        Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch (err) {
      toast.error('Network error while loading the anomaly feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (alertId, actionType, note) => {
    setProcessingId(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, note }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`Alert ${actionType.toLowerCase()} successfully.`);
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: json.data.alert.status } : a))
        );
      } else {
        toast.error(json.message || `Failed to ${actionType} alert.`);
      }
    } catch (err) {
      toast.error('Network error during action.');
    } finally {
      setProcessingId(null);
    }
  };

  // Cluster Scatter Plot data: transaction time (minutes into the window)
  // vs amount, from the most recent HIGH_VELOCITY finding with per-transaction
  // evidence attached.
  const scatterSource = useMemo(
    () =>
      alerts.find(
        (a) => a.scenarioType === 'HIGH_VELOCITY' && a.evidence?.contributingTransactions?.length
      ),
    [alerts]
  );

  const scatterSeries = useMemo(() => {
    if (!scatterSource) return [];
    const txns = scatterSource.evidence.contributingTransactions;
    const earliest = Math.min(...txns.map((t) => new Date(t.timestamp).getTime()));
    const byAccount = new Map();
    for (const t of txns) {
      const key = t.syntheticAccountId ?? 'Unattributed';
      const list = byAccount.get(key) ?? [];
      list.push({
        minutesIn: Math.round((new Date(t.timestamp).getTime() - earliest) / 1000 / 60),
        amount: t.amount,
        syntheticAccountId: key,
      });
      byAccount.set(key, list);
    }
    return Array.from(byAccount.entries()).map(([accountId, points], i) => ({
      accountId,
      color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      points,
    }));
  }, [scatterSource]);

  // Synthetic Account Watchlist: aggregate every HIGH_VELOCITY alert's
  // contributing transactions by syntheticAccountId.
  const watchlist = useMemo(() => {
    const byAccount = new Map();
    for (const alert of alerts) {
      const txns = alert.evidence?.contributingTransactions ?? [];
      for (const t of txns) {
        if (!t.syntheticAccountId) continue;
        const existing = byAccount.get(t.syntheticAccountId) ?? {
          syntheticAccountId: t.syntheticAccountId,
          count: 0,
          totalAmount: 0,
          providers: new Set(),
        };
        existing.count += 1;
        existing.totalAmount += t.amount;
        if (alert.provider?.name) existing.providers.add(alert.provider.name);
        byAccount.set(t.syntheticAccountId, existing);
      }
    }
    return Array.from(byAccount.values())
      .map((row) => ({ ...row, providers: Array.from(row.providers) }))
      .sort((a, b) => b.count - a.count);
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Risk Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Deep-dive into high-confidence anomalies, cluster patterns, and escalations from Ops.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          Refresh Feed
        </button>
      </div>

      {/* Cluster Scatter Plot + Synthetic Account Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Cluster Scatter Plot</h2>
          <p className="mb-4 text-xs text-slate-500">
            Transaction time vs. amount for the most recent high-velocity finding
            {scatterSource ? ` — ${scatterSource.agent?.outletCode ?? 'agent'}` : ''}.
          </p>
          {scatterSeries.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-slate-400">
              No high-velocity cluster data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="minutesIn"
                  name="Minutes into window"
                  unit="m"
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis
                  type="number"
                  dataKey="amount"
                  name="Amount"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrency(v, { compact: true })}
                />
                <ZAxis range={[90, 90]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) =>
                    name === 'amount' ? formatCurrency(value) : `${value}m`
                  }
                />
                {scatterSeries.map((series) => (
                  <Scatter
                    key={series.accountId}
                    name={series.accountId}
                    data={series.points}
                    fill={series.color}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Synthetic Account Watchlist</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Repeating customer IDs across transactions.</p>
          {watchlist.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-slate-400">
              No repeating synthetic accounts flagged yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 text-left font-medium">Account</th>
                  <th className="pb-2 text-right font-medium">Count</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((row) => (
                  <tr key={row.syntheticAccountId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-mono text-xs text-slate-800">{row.syntheticAccountId}</td>
                    <td className="py-2 text-right text-slate-700">{row.count}</td>
                    <td className="py-2 text-right text-slate-700">
                      {formatCurrency(row.totalAmount, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Anomaly Feed */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          Anomaly Feed — High Confidence &amp; Escalated
        </h2>
        <div className="grid gap-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <CheckCircle className="mb-4 h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-900">All Clear</h3>
              <p className="text-sm text-slate-500">
                No high-confidence anomalies or Ops escalations right now.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isProcessing = processingId === alert.id;
              const isTerminal = alert.status === 'RESOLVED' || alert.status === 'DISMISSED';

              return (
                <div
                  key={alert.id}
                  className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4 md:items-center">
                    <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-critical/10 text-critical">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {SCENARIO_LABELS[alert.scenarioType] ?? alert.scenarioType}
                        </h3>
                        <span className="inline-flex items-center rounded-full border border-critical/30 bg-critical/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-critical">
                          {alert.confidence} confidence
                        </span>
                        {alert.owner?.role === 'RISK' && (
                          <span className="inline-flex items-center rounded-full bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass">
                            Escalated by Ops
                          </span>
                        )}
                        {alert.provider && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {alert.provider.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 md:max-w-2xl">
                        {alert.confidenceReason}
                      </p>
                      <div className="mt-1 flex items-center gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          {alert.status === 'PENDING' ? (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          ) : isTerminal ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {alert.status}
                        </span>
                        {alert.agent && (
                          <span>
                            Agent: {alert.agent.name} ({alert.agent.outletCode})
                          </span>
                        )}
                        <span>{formatRelativeTime(alert.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end lg:flex-row">
                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => handleAction(alert.id, 'ACKNOWLEDGE', 'Risk analyst reviewing evidence.')}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Flag for Review
                      </button>
                    )}

                    {(alert.status === 'ACKNOWLEDGED' || alert.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => {
                          const note = window.prompt("Enter resolution note (e.g., 'Reviewed cluster. Legitimate Eid spike. No fraud detected.'):");
                          if (note) handleAction(alert.id, 'RESOLVE', note);
                        }}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Mark Resolved
                      </button>
                    )}

                    {!isTerminal && (
                      <button
                        onClick={() => {
                          const note = window.prompt("Reason for dismissal:");
                          if (note) handleAction(alert.id, 'DISMISS', note);
                        }}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
