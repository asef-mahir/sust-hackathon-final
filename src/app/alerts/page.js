'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Terminal, History, Loader2, AlertTriangle, CheckCircle, Database, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SimulationPage() {
  const [scenarios, setScenarios] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  
  const [isRunning, setIsRunning] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: 'Simulation Engine Ready.', type: 'info' }
  ]);
  
  const [agentId, setAgentId] = useState(''); 
  const [providerId, setProviderId] = useState('');

  // NEW: State for the Ops action modal
  const [popupAlert, setPopupAlert] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [mounted, setMounted] = useState(false); // Prevents hydration mismatch with Portals

  const terminalEndRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    async function loadData() {
      try {
        const [scenariosRes, historyRes, agentsRes, providersRes] = await Promise.all([
          fetch('/api/simulation/scenarios'),
          fetch('/api/simulation/history?limit=5'),
          fetch('/api/agents'),
          fetch('/api/providers')
        ]);
        
        const [scenariosJson, historyJson, agentsJson, providersJson] = await Promise.all([
          scenariosRes.json(), historyRes.json(), agentsRes.json(), providersRes.json()
        ]);

        if (scenariosJson.success) setScenarios(scenariosJson.data.scenarios);
        if (historyJson.success) setHistory(historyJson.data.runs);
        
        if (agentsJson.success && agentsJson.data.agents?.length > 0) {
          setAgents(agentsJson.data.agents);
          setAgentId(agentsJson.data.agents[0].id);
        }
        
        if (providersJson.success && providersJson.data.providers?.length > 0) {
          setProviders(providersJson.data.providers);
          setProviderId(providersJson.data.providers[0].id);
        }
      } catch (err) {
        toast.error('Failed to connect to backend services.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text, type }]);
  };

  const handleRunSimulation = async (scenarioType) => {
    if (!agentId || !providerId) {
      toast.error('Please select an Agent and Provider first.');
      return;
    }

    setIsRunning(scenarioType);
    addLog(`Initiating ${scenarioType}...`, 'warning');
    addLog('Synthesizing transaction payload...', 'info');

    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scenarioType, 
          agentId, 
          targetProviderId: providerId 
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        addLog(`FAILED: ${json.message}`, 'error');
        toast.error(json.message || 'Simulation failed.');
        return;
      }

      const { simulation, alertsCreated, durationMs } = json.data;
      
      addLog(`Success: Injected ${simulation.transactionsCreated} synthetic transactions.`, 'success');
      addLog(`Agent Cash After: ৳${simulation.physicalCashAfter}`, 'info');
      addLog(`Alerts Triggered: ${alertsCreated.length} new anomalies detected.`, alertsCreated.length > 0 ? 'warning' : 'success');
      addLog(`Execution Time: ${durationMs}ms`, 'info');

      if (alertsCreated.length > 0) {
        // Pop open the modal for the Ops team immediately
        setPopupAlert(alertsCreated[0]);
      } else {
        toast.success('Simulation executed successfully — no new anomalies detected.');
      }
      
      const histRes = await fetch('/api/simulation/history?limit=5');
      const histJson = await histRes.json();
      if (histJson.success) setHistory(histJson.data.runs);

    } catch (err) {
      addLog('CRITICAL: Network connection dropped.', 'error');
      toast.error('Network error during simulation.');
    } finally {
      setIsRunning(null);
    }
  };

  // NEW: Handle Actions directly from the Simulation page modal
  const handleAction = async (actionType, note = '') => {
    if (!popupAlert) return;
    setIsProcessingAction(true);
    
    try {
      const res = await fetch(`/api/alerts/${popupAlert.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          note: note || `System action: ${actionType} triggered immediately via Simulation Dashboard.`,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`Alert ${actionType.toLowerCase()} successfully.`);
        addLog(`Ops Action Applied: ${actionType} on Alert ${popupAlert.id.slice(-6)}`, 'success');
        setPopupAlert(null); // Close modal on success
      } else {
        toast.error(json.message || `Failed to ${actionType} alert.`);
      }
    } catch (err) {
      toast.error('Network error during action.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  // Define the Modal UI
  const modalContent = popupAlert && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${popupAlert.confidence === 'HIGH' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${popupAlert.confidence === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              {popupAlert.confidence === 'HIGH' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${popupAlert.confidence === 'HIGH' ? 'text-red-900' : 'text-amber-900'}`}>
                CRITICAL SYSTEM ALERT DETECTED
              </h2>
              <span className={`text-xs font-semibold uppercase tracking-wider ${popupAlert.confidence === 'HIGH' ? 'text-red-700' : 'text-amber-700'}`}>
                Scenario: {popupAlert.scenarioType.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setPopupAlert(null)}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Anomaly Evidence</h3>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {popupAlert.confidenceReason}
            </p>
          </div>
          
          <p className="text-sm text-slate-600 mb-2">
            Please take immediate action to mitigate potential liquidity or operational risk.
          </p>
        </div>

        {/* Modal Footer (Action Buttons) */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={() => handleAction('DISMISS', 'Marked as false positive during simulation.')}
            disabled={isProcessingAction}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-50"
          >
            Dismiss (False Positive)
          </button>
          <button
            onClick={() => handleAction('ACKNOWLEDGE', 'Issue acknowledged by Ops.')}
            disabled={isProcessingAction}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 disabled:opacity-50"
          >
            {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Acknowledge & Triage
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Simulation Engine</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inject synthetic transaction clusters to test rule engines and alert coordination.
          </p>
        </div>
      </div>

      <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Target Agent</label>
          <select 
            value={agentId} 
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.area?.name ? `- ${agent.area.name}` : ''} ({agent.outletCode})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Target Provider</label>
          <select 
            value={providerId} 
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} ({provider.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <Database className="h-4 w-4" /> Available Scenarios
          </h2>
          
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{scenario.label}</h3>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {scenario.id}
                </span>
              </div>
              <p className="mb-6 text-sm text-slate-600 leading-relaxed">
                {scenario.description}
              </p>
              <button
                onClick={() => handleRunSimulation(scenario.id)}
                disabled={isRunning !== null || !agentId || !providerId}
                className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRunning === scenario.id ? 'bg-cyan-700' : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
              >
                {isRunning === scenario.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {isRunning === scenario.id ? 'Executing...' : 'Inject Scenario'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex h-[350px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
              <Terminal className="h-4 w-4 text-cyan-500" />
              <span className="font-mono text-xs text-slate-400">root@liquidity-sentinel:~</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-slate-600">[{log.time}]</span>{' '}
                  <span className={
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'warning' ? 'text-amber-400' : 
                    log.type === 'success' ? 'text-emerald-400' : 
                    'text-cyan-400'
                  }>
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <History className="h-4 w-4" /> Recent Executions
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {history.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No recent simulations.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-900">{run.scenarioType}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(run.createdAt).toLocaleString()} • {run.durationMs}ms
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs font-medium">
                        <span className="text-emerald-600">{run.transactionsCreated} Txns</span>
                        {run.alertsCreated > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3"/> {run.alertsCreated} Alerts</span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400"><CheckCircle className="h-3 w-3"/> Clear</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* React Portal implementation to guarantee the modal covers the entire screen seamlessly */}
      {mounted && popupAlert && typeof document !== 'undefined' && createPortal(
        modalContent,
        document.body
      )}
    </div>
  );
}