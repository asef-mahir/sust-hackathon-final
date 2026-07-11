/**
 * components/agent/CashDrawerCard.js
 */

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { Banknote } from 'lucide-react';

/**
 * @param {{ physicalCash: string }} props
 */
export function CashDrawerCard({ physicalCash }) {
  return (
    <Card className="bg-surface border-white/10">
      <CardContent className="flex flex-col items-center gap-1 p-6 text-center">
        <Banknote className="h-6 w-6 text-brass" />
        <p className="text-xs uppercase tracking-wide text-white/40">Physical Cash</p>
        <p className="ls-numeric text-3xl font-semibold text-white">
          {formatCurrency(physicalCash)}
        </p>
      </CardContent>
    </Card>
  );
}
