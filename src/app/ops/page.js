'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Loader2, Users, AlertTriangle, ShieldAlert, Wallet, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OpsDashboardPage() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      // Fetch high-level stats
      const statsRes = await fetch('/api/dashboard');
      const statsJson = await statsRes.json();
      if (statsRes.ok) setData(statsJson.data);

      // Fetch active alerts for the Ops Feed
      const alertsRes = await fetch('/api/alerts?limit=20');
      const alertsJson = await alertsRes.json();
      if (alertsRes.ok) {
        // Ops should only manage PENDING or ACKNOWLEDGED alerts
        const activeAlerts = alertsJson.data.alerts.filter(
          a => a.status === 'PENDING' || a.status === 'ACKNOWLEDGED'
        );
        setAlerts(activeAlerts);
      }
    } catch (err) {
      toast.error('Failed to load Operations Command Center');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAction = async (alertId, actionType, note, escalateToOwnerId = null) => {
    setProcessingId(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, note, escalateToOwnerId }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`Alert ${actionType.toLowerCase()} successfully.`);
        fetchDashboard(); // Refresh feed
      } else {
        toast.error(json.message || `Failed to ${actionType} alert.`);
      }
    } catch (err) {
      toast.error('Network error during action.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEscalate = (alertId) => {
    const note = window.prompt("Enter escalation note for the Risk Team:");
    if (!note) {
      toast.error("Escalation requires a case note.");
      return;
    }
    
    // In a real app, this ID comes from a dropdown of users. 
    // For the hackathon demo, we fetch the Risk user's ID from our seeded data dynamically via an API, 
    // or we bypass the strict ID check in the UI and let the backend assign it to the 'RISK' queue.
    // Assuming your risk user was seeded, we will pass a placeholder that your backend can handle, 
    // or you must replace 'RISK_USER_ID' with the actual seeded Supabase ID of Nadia Chowdhury.
    const riskUserId = process.env.NEXT_PUBLIC_DEMO_RISK_USER_ID || 'risk-user-id'; 
    handleAction(alertId, 'ESCALATE', note, riskUserId);
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-900">
      <DashboardHeader title="Operations Command Center" />

      {/* Top Stats Row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Agents" value={String(data.totalAgents)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Alerts" value={String(data.activeAlerts)} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Critical Alerts" value={String(data.criticalAlerts)} tone="critical" icon={<ShieldAlert className="h-5 w-5" />} />
        <StatCard label="Network Cash" value={`৳${(data.cashAvailability / 1000000).toFixed(2)}M`} tone="healthy" icon={<Wallet className="h-5 w-5" />} />
      </section>

      {/* Main Content: Alert Triage Queue */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Live Triage Queue</h2>
          <button onClick={fetchDashboard} className="text-sm font-medium text-cyan-600 hover:text-cyan-700">Refresh Queue</button>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
             <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
             <p className="text-sm font-medium text-slate-600">All alerts cleared. Network is stable.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${alert.confidence === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {alert.scenarioType}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{alert.agent?.name}</span>
                  </div>
                  <p className="text-sm text-slate-600">{alert.confidenceReason}</p>
                </div>

                <div className="flex items-center gap-2">
                  {alert.status === 'PENDING' && (
                    <button
                      onClick={() => handleAction(alert.id, 'ACKNOWLEDGE', 'Ops acknowledged issue.')}
                      disabled={processingId === alert.id}
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && alert.scenarioType === 'HIGH_VELOCITY' && (
                    <button
                      onClick={() => handleEscalate(alert.id)}
                      disabled={processingId === alert.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                      Escalate to Risk <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && alert.scenarioType === 'HIDDEN_SHORTAGE' && (
                    <button
                      onClick={() => handleAction(alert.id, 'RESOLVE', 'Contacted agent. Cash refill dispatched.')}
                      disabled={processingId === alert.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Resolve (Cash Dispatched)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}