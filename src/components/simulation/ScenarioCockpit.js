'use client';

/**
 * components/simulation/ScenarioCockpit.js
 *
 * Owns all interactive state for the cockpit: which agent/provider is
 * targeted, and the in-flight/result state of each scenario run. The only
 * mutation on this page (POST /api/simulation/run) lives here — correctly
 * a client component per the "simulation buttons are client fetch" rule.
 *
 * After a successful run, calls router.refresh() so the server-rendered
 * SimulationHistorySection (and, if the operator navigates to /alerts or
 * /, those pages too) reflect the new data — consistent with the
 * route-API-only, no-server-actions pattern used everywhere else in this
 * app.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TargetSelector } from './TargetSelector';
import { ScenarioCard } from './ScenarioCard';

const SCENARIO_DESCRIPTIONS = {
  HIDDEN_SHORTAGE:
    'Drains the target provider while total liquidity still looks healthy.',
  HIGH_VELOCITY:
    'Injects a tight cluster of near-identical cash-outs in a short window.',
};

const PLANNED_SCENARIOS = [
  {
    id: 'DATA_INCONSISTENCY',
    label: 'Data Inconsistency',
    description: 'Late/conflicting provider feeds. Generator not yet built.',
  },
  {
    id: 'COORDINATED_CLOSURE',
    label: 'Coordinated Closure',
    description: 'Linked alerts, full lifecycle demo. Generator not yet built.',
  },
];

/**
 * @param {{
 *   agents: { id: string, name: string, outletCode: string }[],
 *   providers: { id: string, code: string, name: string }[],
 *   scenarios: { id: string, label: string, description: string }[],
 * }} props
 */
export function ScenarioCockpit({ agents, providers, scenarios }) {
  const router = useRouter();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? '');
  const [selectedProviderId, setSelectedProviderId] = useState(providers[0]?.id ?? '');
  const [runningScenarioId, setRunningScenarioId] = useState(null);

  async function handleRun(scenarioType) {
    if (!selectedAgentId || !selectedProviderId) {
      toast.error('Select a target agent and provider first.');
      return;
    }

    setRunningScenarioId(scenarioType);

    try {
      const response = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioType,
          agentId: selectedAgentId,
          targetProviderId: selectedProviderId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message ?? 'Simulation failed to run.');
        return;
      }

      const { alertsCreated, alertsSuppressed } = result.data;
      if (alertsCreated.length > 0) {
        toast.success(
          `${alertsCreated.length} new alert${alertsCreated.length > 1 ? 's' : ''} created.`
        );
      } else if (alertsSuppressed.length > 0) {
        toast.info('Pattern detected, but an open alert already exists for it.');
      } else {
        toast.info('Scenario ran — no threshold was crossed this time.');
      }

      router.refresh();
    } catch (error) {
      toast.error('Network error — could not reach the simulation API.');
    } finally {
      setRunningScenarioId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TargetSelector
        agents={agents}
        providers={providers}
        selectedAgentId={selectedAgentId}
        selectedProviderId={selectedProviderId}
        onAgentChange={setSelectedAgentId}
        onProviderChange={setSelectedProviderId}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            label={scenario.label}
            description={SCENARIO_DESCRIPTIONS[scenario.id] ?? scenario.description}
            isRunning={runningScenarioId === scenario.id}
            onRun={() => handleRun(scenario.id)}
          />
        ))}

        {PLANNED_SCENARIOS.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            label={scenario.label}
            description={scenario.description}
            disabled
          />
        ))}
      </div>
    </div>
  );
}
