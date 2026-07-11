/**
 * components/simulation/CockpitHeader.js
 */

import { Badge } from '@/components/ui/badge';

export function CockpitHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Simulation Cockpit</h1>
        <p className="text-xs text-white/40">
          Injects synthetic scenarios to demonstrate live detection.
        </p>
      </div>
      <Badge variant="outline" className="border-brass/30 text-brass">
        OPS only
      </Badge>
    </header>
  );
}
