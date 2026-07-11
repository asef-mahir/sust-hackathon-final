'use client';

/**
 * components/agent/AgentWalletPoller.js
 *
 * The one client component on this page — owns polling, per your own
 * spec ("Polling" is explicitly listed for the Agent View, unlike every
 * other page in this app which uses manual refresh). Polls
 * GET /api/agents/:id every 15s and re-renders the balance/risk/alerts
 * section with fresh data. Fires a toast when riskStatus escalates or a
 * new alert appears since the last poll — the "Threshold Warnings"
 * requirement.
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CashDrawerCard } from './CashDrawerCard';
import { RiskIndicator } from './RiskIndicator';
import { CurrentAlertsList } from './CurrentAlertsList';
import { ProviderCard } from '@/components/dashboard/ProviderCard';

const POLL_INTERVAL_MS = 15000;
const RISK_SEVERITY_RANK = { SAFE: 0, WARNING: 1, CRITICAL: 2 };

/**
 * @param {{ agentId: string, initialData: Object }} props
 */
export function AgentWalletPoller({ agentId, initialData }) {
  const [data, setData] = useState(initialData);
  const previousAlertCountRef = useRef(initialData.activeAlerts.length);
  const previousRiskRef = useRef(initialData.agent.riskStatus);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) return;
        const result = await response.json();
        const next = result.data;

        if (next.activeAlerts.length > previousAlertCountRef.current) {
          toast.warning('A new alert was raised for your outlet — check below.');
        }
        if (
          RISK_SEVERITY_RANK[next.agent.riskStatus] >
          RISK_SEVERITY_RANK[previousRiskRef.current]
        ) {
          toast.error(`Risk status escalated to ${next.agent.riskStatus}.`);
        }

        previousAlertCountRef.current = next.activeAlerts.length;
        previousRiskRef.current = next.agent.riskStatus;
        setData(next);
      } catch {
        // Silent on poll failure — a transient network blip shouldn't
        // spam the shopkeeper with error toasts every 15 seconds.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [agentId]);

  return (
    <div className="flex flex-col gap-4">
      <RiskIndicator riskStatus={data.agent.riskStatus} />
      <CashDrawerCard physicalCash={data.agent.physicalCash} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">Provider Wallets</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.liquidity.providerBalances.map((p) => (
            <ProviderCard
              key={p.providerId}
              providerCode={p.providerCode}
              providerName={p.providerName}
              totalBalance={p.balance}
              shareOfTotal={p.shareOfTotal}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">Current Alerts</h2>
        <CurrentAlertsList alerts={data.activeAlerts} />
      </div>
    </div>
  );
}
