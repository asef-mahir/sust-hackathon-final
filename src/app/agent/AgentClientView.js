'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  X,
  MapPin,
  Clock,   
  Coins,   
  Flame    
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'preferredExplanationLanguage';

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
  },
  NEGATIVE_BALANCE: {
    en: 'Critical Balance Error',
    bn: 'মারাত্মক ব্যালেন্স ত্রুটি',
    banglish: 'Critical Balance Error'
  }
};

const formatProfile = (profileString) => {
  if (!profileString) return 'Standard';
  return profileString.replace(/_/g, ' ').replace('DOMINANT', 'Zone');
};

export default function AgentClientView({ agentId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(null);
  const [langPreference, setLangPreference] = useState('en');
  
  const [popupAlert, setPopupAlert] = useState(null);
  const seenAlertIdsRef = useRef(null);

  const dismissAlertLocally = (alertId) => {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(window.localStorage.getItem('dismissedAlerts') || '[]');
      if (!stored.includes(alertId)) {
        stored.push(alertId);
        window.localStorage.setItem('dismissedAlerts', JSON.stringify(stored));
      }
    }
    setPopupAlert(null);
  };

  const fetchAgentData = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        const incomingAlerts = json.data.activeAlerts ?? [];
        const dismissed = typeof window !== 'undefined' 
          ? JSON.parse(window.localStorage.getItem('dismissedAlerts') || '[]') 
          : [];

        if (seenAlertIdsRef.current === null) {
          seenAlertIdsRef.current = new Set(incomingAlerts.map((a) => a.id));
        } else {
          const newOnes = incomingAlerts.filter(
            (a) => !seenAlertIdsRef.current.has(a.id) && !dismissed.includes(a.id)
          );
          
          if (newOnes.length > 0) {
            setPopupAlert(newOnes[0]);
            for (const alert of newOnes) {
              toast.warning('New advisory in your inbox', {
                description: alert.confidenceReason || `${alert.scenarioType} flagged for review.`,
                duration: 8000,
              });
            }
            seenAlertIdsRef.current = new Set(incomingAlerts.map((a) => a.id));
          }
        }

        setData(json.data);
      } else {
        toast.error(json.message || 'Failed to load agent data');
      }
    } catch (err) {
      toast.error('Network error while loading wallet.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    seenAlertIdsRef.current = null;
    fetchAgentData();

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLangPreference(stored);
      }
    }
  }, [agentId]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase env vars missing. Real-time features disabled.');
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const channel = supabase
      .channel('realtime-alerts')
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Alert', 
          filter: `agentId=eq.${agentId}` 
        }, 
        (payload) => {
          console.log('Realtime Alert Triggered:', payload.new);
          fetchAgentData({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const handleModalAcknowledge = async () => {
    if (!popupAlert) return;
    
    setIsProcessing(popupAlert.id);
    try {
      const res = await fetch(`/api/alerts/${popupAlert.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          note: 'Agent acknowledged the warning via popup modal.',
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success('Alert acknowledged.');
        dismissAlertLocally(popupAlert.id);
        fetchAgentData({ silent: true }); 
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

  const { agent, liquidity, activeAlerts, chartData } = data;
  const isPhysicalRisk = liquidity.forecast?.primaryRiskVector === 'PHYSICAL_CASH';
  const targetProvider = liquidity.forecast?.providerCode || 'E-Money';

  const formattedChartData = [...(chartData?.recentTransactions || [])].reverse().map(tx => ({
    ...tx,
    timeLabel: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {agent.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Outlet Code: {agent.outletCode}</span>
            <span className="hidden md:inline h-1 w-1 rounded-full bg-slate-300"></span>
            <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">Area Ref: {agent.areaId.slice(-6).toUpperCase()}</span>
            <span className="hidden md:inline h-1 w-1 rounded-full bg-slate-300"></span>
            <span className={`font-semibold ${agent.riskStatus === 'CRITICAL' || agent.riskStatus === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'}`}>
              Status: {agent.riskStatus}
            </span>
          </p>
        </div>
        <button 
          onClick={() => fetchAgentData()}
          className="flex w-full md:w-auto items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Sync Balances
        </button>
      </div>

      {/* Dynamic Forecast & Permanent Prediction Cards */}
      <div className="space-y-4">
        
        {/* Banner Section - Mutually Exclusive */}
        {liquidity.forecast?.isCriticalError ? (
          <div className="flex flex-col rounded-xl border p-5 shadow-sm border-l-4 bg-red-50 border-red-500 border-red-200">
            <div className="flex items-center gap-3 mb-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold uppercase tracking-wide text-xs">Critical Balance Error</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {langPreference === 'bn' ? (
                `সতর্কতা: আপনার ${liquidity.forecast.details.map(p => p.name).join(', ')} একাউন্টে নেগেটিভ ব্যালেন্স (৳${liquidity.forecast.details.map(p => Math.abs(p.amount).toLocaleString('en-IN')).join(', ')}) রয়েছে।`
              ) : langPreference === 'banglish' ? (
                `Sotorkota: Apnar ${liquidity.forecast.details.map(p => p.name).join(', ')} account e negative balance (৳${liquidity.forecast.details.map(p => Math.abs(p.amount).toLocaleString('en-IN')).join(', ')}) ache.`
              ) : (
                `Critical Alert: You have a negative balance in ${liquidity.forecast.details.map(p => p.name).join(', ')} (৳${liquidity.forecast.details.map(p => Math.abs(p.amount).toLocaleString('en-IN')).join(', ')}). Please restore the balance immediately.`
              )}
            </p>
          </div>
        ) : !liquidity.forecast?.isHealthy ? (
          <div className={`flex flex-col rounded-xl border p-5 shadow-sm border-l-4 ${isPhysicalRisk ? 'bg-emerald-50 border-emerald-500 border-emerald-200' : 'bg-blue-50 border-blue-500 border-blue-200'}`}>
            <div className={`flex items-center gap-3 mb-2 ${isPhysicalRisk ? 'text-emerald-700' : 'text-blue-700'}`}>
              <CalendarDays className="h-5 w-5" />
              <h3 className="font-bold uppercase tracking-wide text-xs">AI Liquidity Context</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {langPreference === 'bn' ? (
                <>লেনদেনের বর্তমান গতি অনুযায়ী, আপনার ব্যবসা সচল রাখতে আজ বিকেল <span className="font-bold text-slate-900 text-base">{liquidity.forecast.criticalTime}</span> টার মধ্যে আনুমানিক <span className="font-bold text-slate-900 text-base">৳{liquidity.forecast.requiredAmount?.toLocaleString('en-IN')}</span> {isPhysicalRisk ? 'ক্যাশ টাকার' : `${targetProvider} ই-মানি`} প্রয়োজন হতে পারে।</>
              ) : langPreference === 'banglish' ? (
                <>Apnar current transaction velocity onuzayi, counter chalu rakhte ajke <span className="font-bold text-slate-900 text-base">{liquidity.forecast.criticalTime}</span> er moddhe pray <span className="font-bold text-slate-900 text-base">৳{liquidity.forecast.requiredAmount?.toLocaleString('en-IN')}</span> {isPhysicalRisk ? 'physical cash' : `${targetProvider} e-money`} proyojon hote pare.</>
              ) : (
                <>Based on current velocity patterns, you will require approximately <span className="font-bold text-slate-900 text-base">৳{liquidity.forecast.requiredAmount?.toLocaleString('en-IN')}</span> in {isPhysicalRisk ? 'Physical Cash' : `${targetProvider} E-Money`} by <span className="font-bold text-slate-900 text-base">{liquidity.forecast.criticalTime}</span> today to guarantee uninterrupted service.</>
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col rounded-xl border p-5 shadow-sm border-l-4 bg-emerald-50 border-emerald-500 border-emerald-200">
            <div className="flex items-center gap-3 mb-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-bold uppercase tracking-wide text-xs">AI Liquidity Forecast</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {langPreference === 'bn' ? (
                'বর্তমান লেনদেনের গতি অনুযায়ী আপনার ব্যালেন্স পর্যাপ্ত আছে। আজ কোনো ক্যাশ সংকটের সম্ভাবনা নেই।'
              ) : langPreference === 'banglish' ? (
                'Bortoman transaction velocity onuzayi apnar balance porjapto ache. Aj kono cash shortager somvabona nei.'
              ) : (
                'Liquidity levels are healthy. No projected shortages for today based on current transaction velocity.'
              )}
            </p>
          </div>
        )}

        {/* PERMANENTLY VISIBLE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Coins className="h-4 w-4" />
              <h3 className="font-bold uppercase tracking-wider text-xs">Required Amount</h3>
            </div>
            <span className="text-3xl font-extrabold text-slate-900">
              {liquidity.forecast?.requiredAmount != null 
                ? `৳${liquidity.forecast.requiredAmount.toLocaleString('en-IN')}` 
                : 'N/A'}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500">
              {liquidity.forecast?.isCriticalError ? 'System Overridden' : (isPhysicalRisk ? 'Physical Cash Needed' : `${targetProvider} E-Money Needed`)}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4" />
              <h3 className="font-bold uppercase tracking-wider text-xs">Est. Depletion</h3>
            </div>
            <span className="text-3xl font-extrabold text-slate-900">
              {liquidity.forecast?.criticalTime || 'Halted'}
            </span>
            <span className={`mt-1 text-xs font-medium ${liquidity.forecast?.isCriticalError ? 'text-red-600' : 'text-amber-600'}`}>
              {liquidity.forecast?.minutesRemaining != null 
                ? `~${liquidity.forecast.minutesRemaining} mins remaining` 
                : 'Ledger out of sync'}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Flame className="h-4 w-4" />
              <h3 className="font-bold uppercase tracking-wider text-xs">Burn Rate</h3>
            </div>
            <span className="text-3xl font-extrabold text-slate-900">
              {liquidity.forecast?.hourlyBurnRate != null 
                ? `৳${liquidity.forecast.hourlyBurnRate.toLocaleString('en-IN')}` 
                : 'N/A'}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500">
              {liquidity.forecast?.isCriticalError ? 'Calculation blocked' : 'Average per hour'}
            </span>
          </div>
        </div>
      </div>

      {/* Unified Liquidity Balances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:col-span-1">
          <div className="mb-4 flex items-center gap-3 text-emerald-700">
            <Wallet className="h-6 w-6" />
            <h3 className="font-bold uppercase tracking-wider text-xs">Physical Cash</h3>
          </div>
          <span className="text-3xl font-extrabold text-emerald-900">
            ৳{parseFloat(agent.physicalCash).toLocaleString('en-IN')}
          </span>
          <span className="mt-2 text-xs font-medium text-emerald-600">Shared Drawer Pool</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-3">
          {liquidity.providerBalances.map((provider) => {
            const isLow = provider.shareOfTotal < 0.10;
            const isNegative = parseFloat(provider.balance) < 0;
            return (
              <div 
                key={provider.providerId} 
                className={`flex flex-col rounded-xl border p-5 shadow-sm transition-all ${
                  isNegative ? 'border-red-300 bg-red-50' : isLow ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className={`font-bold uppercase tracking-wider text-xs ${isNegative ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-slate-500'}`}>
                    {provider.providerName}
                  </h3>
                  {isNegative ? <ShieldAlert className="h-4 w-4 text-red-600" /> : isLow ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : null}
                </div>
                <span className={`text-2xl font-extrabold ${isNegative ? 'text-red-900' : isLow ? 'text-amber-900' : 'text-slate-900'}`}>
                  ৳{parseFloat(provider.balance).toLocaleString('en-IN')}
                </span>
                <span className={`mt-2 text-xs font-medium ${isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-400'}`}>
                  {(provider.shareOfTotal * 100).toFixed(1)}% of E-Money
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Volume Chart Section */}
      {chartData && formattedChartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Recent Volume Trend
            </h2>
            <div className="flex gap-4 text-sm font-medium">
              <span className="flex items-center gap-1 text-blue-600"><TrendingDown className="h-4 w-4"/> In: ৳{chartData.dailyStats.totalCashIn.toLocaleString('en-IN')}</span>
              <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="h-4 w-4"/> Out: ৳{chartData.dailyStats.totalCashOut.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="timeLabel" tick={{fontSize: 10}} tickMargin={10} minTickGap={30} stroke="#94a3b8" />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-lg">
                          <p className="font-semibold">{data.timeLabel}</p>
                          <p>{data.providerCode} {data.type}</p>
                          <p className="text-sm font-bold mt-1">৳{data.amount.toLocaleString('en-IN')}</p>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {formattedChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'CASH_IN' ? '#3b82f6' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Clean Read-Only Advisory Inbox */}
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
              const fallbackText = alert.evidence?.confidenceReason || alert.confidenceReason || 'System alert processing context required.';
              const displayReason = alert.explanations?.[currentLang]?.reason || fallbackText;
              const displayTitle = ALERT_TITLES[alert.scenarioType]?.[currentLang] || ALERT_TITLES[alert.scenarioType]?.en || 'System Alert';

              return (
                <div 
                  key={alert.id} 
                  className={`flex flex-col gap-4 rounded-xl border p-5 shadow-sm md:flex-row md:items-center ${
                    alert.confidence === 'HIGH' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Screen Critical Alert Modal */}
      {popupAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${popupAlert.confidence === 'HIGH' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${popupAlert.confidence === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {popupAlert.confidence === 'HIGH' ? <ShieldAlert className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <h2 className={`text-lg font-bold ${popupAlert.confidence === 'HIGH' ? 'text-red-900' : 'text-amber-900'}`}>
                  {ALERT_TITLES[popupAlert.scenarioType]?.[langPreference] || ALERT_TITLES[popupAlert.scenarioType]?.en || 'System Alert'}
                </h2>
              </div>
              <button 
                onClick={() => dismissAlertLocally(popupAlert.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {popupAlert.scenarioType === 'HIDDEN_SHORTAGE' && liquidity?.forecast?.requiredAmount ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded border border-blue-100">
                    <MapPin className="h-3 w-3" />
                    Area Profile: {formatProfile(popupAlert.evidence?.profileApplied)}
                  </div>
                  <p className="text-base text-slate-800 leading-relaxed">
                    {langPreference === 'bn' ? (
                      <>সতর্কতা: আপনার এলাকার ট্রানজেকশন ধরন অনুযায়ী, <span className="font-bold text-red-600">{liquidity.forecast.criticalTime}</span>-এর মধ্যে আপনার <span className="font-bold text-red-600">{isPhysicalRisk ? 'ক্যাশ টাকা' : `${targetProvider} ই-মানি`}</span> শেষ হয়ে যেতে পারে।</>
                    ) : langPreference === 'banglish' ? (
                      <>Sotorkota: Apnar area-r transaction dhoron onuzayi, <span className="font-bold text-red-600">{liquidity.forecast.criticalTime}</span> er moddhe apnar <span className="font-bold text-red-600">{isPhysicalRisk ? 'physical cash' : `${targetProvider} e-money`}</span> sesh hoye jete pare.</>
                    ) : (
                      <>Warning: Based on your local area transaction patterns, your <span className="font-bold text-red-600">{isPhysicalRisk ? 'Physical Cash' : `${targetProvider} E-Money`}</span> is projected to deplete by <span className="font-bold text-red-600">{liquidity.forecast.criticalTime}</span>.</>
                    )}
                  </p>
                </div>
              ) : popupAlert.scenarioType === 'NEGATIVE_BALANCE' ? (
                <div className="space-y-4">
                  <p className="text-base text-slate-800 leading-relaxed font-semibold">
                    {langPreference === 'bn' ? 'একাউন্টে নেগেটিভ ব্যালেন্স পাওয়া গেছে। দ্রুত সমাধান করুন।' 
                    : langPreference === 'banglish' ? 'Account e negative balance pawa geche. Druto somadhan korun.' 
                    : 'A negative balance has been detected. Please resolve immediately.'}
                  </p>
                </div>
              ) : (
                <p className="text-base text-slate-700 leading-relaxed">
                  {popupAlert.explanations?.[langPreference]?.reason || popupAlert.evidence?.confidenceReason || popupAlert.confidenceReason || 'System alert processing context required.'}
                </p>
              )}
              
              {/* Action Box */}
              <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-100">
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  {langPreference === 'bn' ? 'প্রস্তাবিত পদক্ষেপ:' : langPreference === 'banglish' ? 'Next step:' : 'Recommended Action:'}
                </p>
                
                {popupAlert.scenarioType === 'HIDDEN_SHORTAGE' && liquidity?.forecast?.requiredAmount ? (
                  <p className="text-sm text-slate-600 font-medium">
                    {langPreference === 'bn' ? `কাস্টমার সেবা সচল রাখতে দ্রুত ৳${liquidity.forecast.requiredAmount.toLocaleString('en-IN')} সংগ্রহ করুন।` 
                      : langPreference === 'banglish' ? `Service chalu rakhte druto ৳${liquidity.forecast.requiredAmount.toLocaleString('en-IN')} songroho korun.`
                      : `Please secure at least ৳${liquidity.forecast.requiredAmount.toLocaleString('en-IN')} immediately to maintain uninterrupted service.`}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    {popupAlert.explanations?.[langPreference]?.nextStep || 'Verify current balance directly with team operations.'}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => dismissAlertLocally(popupAlert.id)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Remind Me Later
              </button>
              <button
                onClick={handleModalAcknowledge}
                disabled={isProcessing === popupAlert.id}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing === popupAlert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Acknowledge Alert
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}