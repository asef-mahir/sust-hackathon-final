'use client';

/**
 * components/shared/ConfirmationDialog.js
 *
 * Reusable dialog for any action that needs a confirmation step and
 * optionally some extra input (a note, an owner select). Used by every
 * button in AlertActions; will be reusable for any future confirm-then-act
 * flow elsewhere in the app.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * @param {{
 *   trigger: React.ReactNode,
 *   title: string,
 *   description: string,
 *   children?: React.ReactNode,
 *   confirmLabel: string,
 *   onConfirm: () => Promise<void>,
 *   isLoading: boolean,
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 * }} props
 */
export function ConfirmationDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  isLoading,
  open,
  onOpenChange,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-slate-200 bg-surface text-slate-900">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-500">{description}</DialogDescription>
        </DialogHeader>

        {children ? <div className="py-2">{children}</div> : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-slate-200 text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-brass text-ink hover:bg-brass/90"
          >
            {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
