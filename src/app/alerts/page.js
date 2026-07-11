'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Fetch initial alerts
  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/alerts?limit=50');
      const json = await res.json();
      if (res.ok && json.success) {
        setAlerts(json.data.alerts);
      } else {
        toast.error(json.message || 'Failed to load alerts');
      }
    } catch (err) {
      toast.error('Network error while loading alerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Handle Action Buttons (Acknowledge, Resolve, etc.)
  const handleAction = async (alertId, actionType, note = '') => {
    setProcessingId(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          note: note || `System action: ${actionType} triggered via dashboard.`,
          // Note: If you add an 'ESCALATE' button later, you must pass escalateToOwnerId here
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`Alert ${actionType.toLowerCase()} successfully.`);
        // Update the specific alert in the local state to avoid a full page reload
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

  // Helper to determine badge colors based on severity/confidence
  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Helper to determine status styling
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING':
        return { icon: Clock, color: 'text-amber-600', text: 'Needs Triage' };
      case 'ACKNOWLEDGED':
      case 'IN_PROGRESS':
        return { icon: ArrowRight, color: 'text-blue-600', text: 'In Progress' };
      case 'RESOLVED':
        return { icon: CheckCircle, color: 'text-emerald-600', text: 'Resolved' };
      case 'DISMISSED':
        return { icon: AlertCircle, color: 'text-slate-400', text: 'Dismissed' };
      default:
        return { icon: Clock, color: 'text-slate-600', text: status };
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alert Triage Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and coordinate responses for liquidity pressure and anomalies.
          </p>
        </div>
        <button 
          onClick={fetchAlerts}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          Refresh Feed
        </button>
      </div>

      {/* Alert Feed List */}
      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <CheckCircle className="mb-4 h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900">All Clear</h3>
            <p className="text-sm text-slate-500">No active alerts requiring attention.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const StatusIcon = getStatusDisplay(alert.status).icon;
            const isProcessing = processingId === alert.id;

            return (
              <div 
                key={alert.id} 
                className={`relative flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all md:flex-row md:items-center md:justify-between ${
                  alert.status === 'PENDING' ? 'border-amber-200 shadow-amber-900/5' : 'border-slate-200'
                }`}
              >
                {/* Left Section: Details */}
                <div className="flex items-start gap-4 md:items-center">
                  <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    alert.confidence === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {alert.confidence === 'HIGH' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{alert.title || 'System Alert'}</h3>
                      
                      {/* Badges */}
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${getConfidenceBadge(alert.confidence)}`}>
                        {alert.confidence} RISK
                      </span>
                      {alert.provider && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {alert.provider.name}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 md:max-w-2xl">
                      {alert.description}
                    </p>
                    
                    <div className="mt-1 flex items-center gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${getStatusDisplay(alert.status).color}`} />
                        {getStatusDisplay(alert.status).text}
                      </span>
                      {alert.agent && (
                        <span>Agent: {alert.agent.name} ({alert.agent.outletCode})</span>
                      )}
                      <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end lg:flex-row">
                  {alert.status === 'PENDING' && (
                    <button
                      onClick={() => handleAction(alert.id, 'ACKNOWLEDGE')}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Acknowledge
                    </button>
                  )}
                  
                  {(alert.status === 'ACKNOWLEDGED' || alert.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => handleAction(alert.id, 'RESOLVE', 'Contacted agent, issue resolved.')}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Mark Resolved
                    </button>
                  )}

                  {/* Dismiss option is usually available unless it's already resolved/dismissed */}
                  {['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(alert.status) && (
                    <button
                      onClick={() => handleAction(alert.id, 'DISMISS', 'Marked as false positive.')}
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
  );
}