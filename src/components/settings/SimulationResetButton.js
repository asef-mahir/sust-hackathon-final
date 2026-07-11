'use client';

/**
 * components/settings/SimulationResetButton.js
 *
 * Destructive action, gated behind ConfirmationDialog (reused, not
 * rebuilt — same component from Page 4). Caveat about baseline values
 * (not a true restore of original seed data) is shown directly in the
 * dialog copy, not hidden.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { RotateCcw } from 'lucide-react';

export function SimulationResetButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    setIsResetting(true);
    try {
      const response = await fetch('/api/settings/reset-demo-data', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message ?? 'Reset failed.');
        return;
      }

      toast.success('Demo data reset to baseline.');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Network error — could not reach the API.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" className="border-critical/30 text-critical hover:bg-critical/10">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset Demo Data
        </Button>
      }
      title="Reset all demo data?"
      description="Deletes every transaction, alert, and simulation run, and resets all balances to fixed baseline values. This does NOT restore your original seed script's exact numbers — it resets to a clean, predictable demo state. This cannot be undone."
      confirmLabel="Reset everything"
      isLoading={isResetting}
      onConfirm={handleReset}
    />
  );
}
