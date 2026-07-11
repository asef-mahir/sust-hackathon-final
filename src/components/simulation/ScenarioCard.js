'use client';

/**
 * components/simulation/ScenarioCard.js
 *
 * One scenario tile. `disabled` renders an honest "not yet implemented"
 * state for Scenario C/D (Data Inconsistency, Coordinated Closure) — see
 * the gap flagged before this page was built: their generators don't
 * exist in simulationEngine.js. `onRun` is only wired for active cards.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

/**
 * @param {{
 *   label: string,
 *   description: string,
 *   disabled?: boolean,
 *   isRunning?: boolean,
 *   onRun?: () => void,
 * }} props
 */
export function ScenarioCard({ label, description, disabled = false, isRunning = false, onRun }) {
  return (
    <Card
      className={`border-slate-200 ${disabled ? 'bg-slate-50 opacity-60' : 'bg-surface'}`}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <Button
          size="sm"
          disabled={disabled || isRunning}
          onClick={onRun}
          className={disabled ? 'cursor-not-allowed' : 'bg-brass text-ink hover:bg-brass/90'}
          variant={disabled ? 'outline' : 'default'}
        >
          {disabled ? (
            <>
              <Lock className="mr-2 h-3.5 w-3.5" /> Not yet implemented
            </>
          ) : isRunning ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Running…
            </>
          ) : (
            'Trigger scenario'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
