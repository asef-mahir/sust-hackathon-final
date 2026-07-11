'use client';

import { useState, useEffect } from 'react';
import { Wallet, AlertTriangle, ShieldAlert, CheckCircle, Loader2, RefreshCw, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'preferredExplanationLanguage';

// Scalable dictionary mapping for the various system alerts to protect provider boundaries
const ALERT_TITLES = {
  HIDDEN_SHORTAGE: {
    en: 'Liquidity Warning',
    bn: 'সম্ভাব্য ব্যালেন্স সংকট',
    banglish: 'Liquidity Warning'
  },
  HIGH_VELOCITY: {
    en: 'Unusual Activity Spike',
    bn: 'অস্বাভাবিক লেনদেন সতর্কতা',
    banglish: 'Oshabhabik Transaction Alert'
  },
  DATA_INCONSISTENCY: {
    en: 'Data Sync Delayed',
    bn: 'তথ্য সিঙ্ক ত্রুটি',
    banglish: 'Data Sync Error'
  },
  COORDINATED_CLOSURE: {
    en: 'System Operational Notice',
    bn: 'সিস্টেম নোটিশ',
    banglish: 'System Notice'
  }
};

export default function AgentClientView({ agentId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(null);
  const [langPreference, setLangPreference] = useState('en');

  const fetchAgentData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const json = await res.json();
      
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || 'Failed to load agent data');
      }
    } catch (err) {
      toast.error('Network error while loading wallet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();

    // Pull local fallback storage preference configuration for client view
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLangPreference(stored);
      }
    }
  }, [agentId]);

  const handleAcknowledge = async (alertId) => {
    setIsProcessing(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          note: 'Agent acknowledged the warning from the localized client dashboard.',
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success('Alert acknowledged successfully.');
        fetchAgentData(); 
      } else {
        toast.error(json.message || 'Failed to acknowledge alert.');
      }
    } catch (err) {
      toast.error('Network error during acknowledgment.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (!data) return null;

  const { agent, liquidity, activeAlerts } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Container */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {agent.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>Outlet Code: {agent.outletCode}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
            <span className={`font-semibold ${agent.riskStatus === 'CRITICAL' || agent.riskStatus === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'}`}>
              Risk Level: {agent.riskStatus}
            </span>
          </p>
        </div>
        <button 
          onClick={fetchAgentData}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Sync Balances
        </button>
      </div>

      {/* Dynamic Cash Demand Forecast Banner Component */}
      {liquidity.forecast && (
        <div className="flex flex-col rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 text-blue-700 mb-2">
            <CalendarDays className="h-5 w-5" />
            <h3 className="font-bold uppercase tracking-wide text-xs">AI Liquidity Requirements Forecast</h3>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {langPreference === 'bn' ? (
              <>
                লেনদেনের বর্তমান গতি অনুযায়ী, আপনার ব্যবসা সচল রাখতে আজ বিকেল <span className="font-bold text-blue-900 text-base">{liquidity.forecast.criticalTime}</span> টার মধ্যে আনুমানিক <span className="font-bold text-blue-900 text-base">৳{liquidity.forecast.requiredAmount.toLocaleString()}</span> ক্যাশ টাকার প্রয়োজন হতে পারে।
              </>
            ) : langPreference === 'banglish' ? (
              <>
                Apnar current transaction velocity onuzayi, counter chalu rakhte ajke <span className="font-bold text-blue-900 text-base">{liquidity.forecast.criticalTime}</span> er moddhe pray <span className="font-bold text-blue-900 text-base">৳{liquidity.forecast.requiredAmount.toLocaleString()}</span> physical cash proyojon hote pare.
              </>
            ) : (
              <>
                Based on current velocity patterns, you will require approximately <span className="font-bold text-blue-900 text-base">৳{liquidity.forecast.requiredAmount.toLocaleString()}</span> in physical cash reserves by <span className="font-bold text-blue-900 text-base">{liquidity.forecast.criticalTime}</span> today to guarantee uninterrupted service.
              </>
            )}
          </p>
          <div className="flex gap-3 mt-3">
            <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2.5 py-1 rounded-md">
              Burn Rate: ৳{liquidity.forecast.hourlyBurnRate.toLocaleString()}/hr
            </span>
            <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2.5 py-1 rounded-md">
              Est. Depletion: ~{liquidity.forecast.minutesRemaining} mins
            </span>
          </div>
        </div>
      )}

      {/* Unified Liquidity Balances View Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Physical Cash Reserves (Shared Drawer Pool) */}
        <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:col-span-1">
          <div className="mb-4 flex items-center gap-3 text-emerald-700">
            <Wallet className="h-6 w-6" />
            <h3 className="font-bold uppercase tracking-wider text-xs">Physical Cash</h3>
          </div>
          <span className="text-3xl font-extrabold text-emerald-900">
            ৳{parseFloat(agent.physicalCash).toLocaleString()}
          </span>
          <span className="mt-2 text-xs font-medium text-emerald-600">Shared Shop Counter Drawer</span>
        </div>

        {/* MFS E-Money Provider Separate Context Wallets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-3">
          {liquidity.providerBalances.map((provider) => {
            const isLow = provider.shareOfTotal < 0.10;
            return (
              <div 
                key={provider.providerId} 
                className={`flex flex-col rounded-xl border p-5 shadow-sm transition-all ${
                  isLow ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className={`font-bold uppercase tracking-wider text-xs ${isLow ? 'text-amber-700' : 'text-slate-500'}`}>
                    {provider.providerName}
                  </h3>
                  {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
                <span className={`text-2xl font-extrabold ${isLow ? 'text-amber-900' : 'text-slate-900'}`}>
                  ৳{parseFloat(provider.balance).toLocaleString()}
                </span>
                <span className={`mt-2 text-xs font-medium ${isLow ? 'text-amber-600' : 'text-slate-400'}`}>
                  {(provider.shareOfTotal * 100).toFixed(1)}% of Electronic Mix
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contextual Advisory Inbox Workflow Stream */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Agent Advisory Inbox
        </h2>
        
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium text-slate-600">All balances healthy. No operational anomalies reported.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeAlerts.map((alert) => {
              const currentLang = langPreference;
              
              // Safe contextual evaluation extracting localized string targets from dynamic JSON structure
              const fallbackText = alert.evidence?.confidenceReason || 'System alert processing context required.';
              const displayReason = alert.explanations?.[currentLang]?.reason || fallbackText;
              const displayNextStep = alert.explanations?.[currentLang]?.nextStep || 'Verify current balance directly with team operations.';
              const displayTitle = ALERT_TITLES[alert.scenarioType]?.[currentLang] || ALERT_TITLES[alert.scenarioType]?.en || 'System Alert';

              return (
                <div 
                  key={alert.id} 
                  className={`flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-sm md:flex-row md:items-center ${
                    alert.confidence === 'HIGH' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-4 md:items-center">
                    <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                      alert.confidence === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {alert.confidence === 'HIGH' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`font-bold ${alert.confidence === 'HIGH' ? 'text-red-900' : 'text-amber-900'}`}>
                        {displayTitle}
                      </h3>
                      <p className={`mt-1 text-sm leading-relaxed ${alert.confidence === 'HIGH' ? 'text-red-700' : 'text-amber-800'}`}>
                        {displayReason}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        {currentLang === 'bn' ? 'প্রস্তাবিত পদক্ষেপ: ' : currentLang === 'banglish' ? 'Next step: ' : 'Recommended Action: '}
                        <span className="font-normal text-slate-500">{displayNextStep}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row md:items-center">
                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={isProcessing === alert.id}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {isProcessing === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Acknowledge
                      </button>
                    )}
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50">
                      Request Refill
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}