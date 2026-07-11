'use client';

/**
 * components/alerts/AlertActions.js
 *
 * Renders exactly the action buttons currently legal for this alert's
 * status — `availableActions` comes from the API (API 6, patched to
 * include getAvailableActions' output), never recomputed here. Every
 * button confirms via ConfirmationDialog, then POSTs to
 * /api/alerts/:id/actions (API 2) and refreshes the page on success.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { CheckCircle2, ArrowUpCircle, Check, XCircle } from 'lucide-react';

const ACTION_CONFIG = {
  ACKNOWLEDGE: {
    label: 'Acknowledge',
    icon: CheckCircle2,
    title: 'Acknowledge this alert',
    description: 'Claims ownership if unassigned. You can add an optional note.',
  },
  START_PROGRESS: {
    label: 'Start Progress',
    icon: ArrowUpCircle,
    title: 'Move this alert to In Progress',
    description: 'Signals active investigation has begun.',
  },
  ESCALATE: {
    label: 'Escalate',
    icon: ArrowUpCircle,
    title: 'Escalate this alert',
    description: 'Hands ownership to another team member. Note is required.',
  },
  RESOLVE: {
    label: 'Resolve',
    icon: Check,
    title: 'Resolve this alert',
    description: 'Marks this case as closed. This is a terminal state.',
  },
  DISMISS: {
    label: 'Dismiss',
    icon: XCircle,
    title: 'Dismiss this alert',
    description: 'Marks this as a false positive. This is a terminal state.',
  },
};

/**
 * @param {{
 *   alertId: string,
 *   availableActions: string[],
 *   owners: { id: string, name: string, role: string }[],
 * }} props
 */
export function AlertActions({ alertId, availableActions, owners }) {
  const router = useRouter();
  const [openAction, setOpenAction] = useState(null);
  const [note, setNote] = useState('');
  const [escalateToOwnerId, setEscalateToOwnerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function closeDialog() {
    setOpenAction(null);
    setNote('');
    setEscalateToOwnerId('');
  }

  async function handleConfirm(action) {
    if (action === 'ESCALATE' && !escalateToOwnerId) {
      toast.error('Select who to escalate this alert to.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/alerts/${alertId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: note || undefined,
          ...(action === 'ESCALATE' && { escalateToOwnerId }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message ?? 'Action failed.');
        return;
      }

      toast.success(`Alert ${ACTION_CONFIG[action].label.toLowerCase()}d.`);
      closeDialog();
      router.refresh();
    } catch {
      toast.error('Network error — could not reach the API.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (availableActions.length === 0) {
    return (
      <p className="text-sm text-white/40">
        This alert is closed — no further actions are available.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => {
        const config = ACTION_CONFIG[action];
        if (!config) return null;
        const Icon = config.icon;

        return (
          <ConfirmationDialog
            key={action}
            open={openAction === action}
            onOpenChange={(isOpen) => (isOpen ? setOpenAction(action) : closeDialog())}
            trigger={
              <Button
                size="sm"
                variant={action === 'DISMISS' ? 'outline' : 'default'}
                className={
                  action === 'DISMISS'
                    ? 'border-white/10 text-white/60'
                    : 'bg-brass text-ink hover:bg-brass/90'
                }
              >
                <Icon className="mr-2 h-3.5 w-3.5" />
                {config.label}
              </Button>
            }
            title={config.title}
            description={config.description}
            confirmLabel={config.label}
            isLoading={isSubmitting}
            onConfirm={() => handleConfirm(action)}
          >
            <div className="flex flex-col gap-3">
              {action === 'ESCALATE' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">Escalate to</label>
                  <Select value={escalateToOwnerId} onValueChange={setEscalateToOwnerId}>
                    <SelectTrigger className="border-white/10 bg-ink">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners
                        .filter((owner) => owner.role !== 'AGENT')
                        .map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} ({owner.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Note {action === 'ESCALATE' ? '(required)' : '(optional)'}
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context for the audit trail…"
                  className="border-white/10 bg-ink text-sm"
                />
              </div>
            </div>
          </ConfirmationDialog>
        );
      })}
    </div>
  );
}
