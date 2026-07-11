'use client';

/**
 * components/simulation/TargetSelector.js
 *
 * Controlled selectors for "which agent + which provider" a scenario run
 * targets. Pure controlled component — all state lives in the parent
 * (ScenarioCockpit), this just renders <Select> and calls back up.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * @param {{
 *   agents: { id: string, name: string, outletCode: string }[],
 *   providers: { id: string, code: string, name: string }[],
 *   selectedAgentId: string,
 *   selectedProviderId: string,
 *   onAgentChange: (id: string) => void,
 *   onProviderChange: (id: string) => void,
 * }} props
 */
export function TargetSelector({
  agents,
  providers,
  selectedAgentId,
  selectedProviderId,
  onAgentChange,
  onProviderChange,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500" htmlFor="agent-select">
          Target Agent
        </label>
        <Select value={selectedAgentId} onValueChange={onAgentChange}>
          <SelectTrigger id="agent-select" className="w-56 border-slate-200 bg-surface">
            <SelectValue placeholder="Select an agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.outletCode} — {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500" htmlFor="provider-select">
          Target Provider
        </label>
        <Select value={selectedProviderId} onValueChange={onProviderChange}>
          <SelectTrigger id="provider-select" className="w-40 border-slate-200 bg-surface">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
