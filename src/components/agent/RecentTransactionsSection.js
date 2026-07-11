/**
 * components/agent/RecentTransactionsSection.js
 *
 * Independent async Server Component — own GET /api/agents/:id/transactions
 * call, own <Suspense> boundary at the page level.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { formatCurrency } from '@/lib/formatCurrency';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorCard } from '@/components/shared/ErrorCard';

/**
 * @param {{ agentId: string }} props
 */
export async function RecentTransactionsSection({ agentId }) {
  const { ok, body } = await serverApiFetch(
    `/api/agents/${agentId}/transactions?limit=10`
  );

  return (
    <Card className="bg-surface border-white/10">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white/80">
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ok ? (
          <ErrorCard message={body?.message ?? 'Could not load transactions.'} />
        ) : body.data.transactions.length === 0 ? (
          <EmptyState title="No transactions recorded yet." />
        ) : (
          <div className="flex flex-col gap-1">
            {body.data.transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0"
              >
                <div>
                  <span className="text-white/80">{txn.type === 'CASH_OUT' ? 'Cash Out' : 'Cash In'}</span>
                  <span className="ml-2 text-xs text-white/40">{txn.provider?.name}</span>
                </div>
                <span className="ls-numeric text-white/70">
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
