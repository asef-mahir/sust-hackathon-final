import { Suspense } from 'react';
import { getSessionOwner } from '@/lib/getSessionOwner';
import { serverApiFetch } from '@/lib/serverApiFetch';
import { AgentWalletPoller } from '@/components/agent/AgentWalletPoller';
import { RecentTransactionsSection } from '@/components/agent/RecentTransactionsSection';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorCard } from '@/components/shared/ErrorCard';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AgentViewPage() {
  const owner = await getSessionOwner();

  if (!owner?.managedAgentId) {
    return (
      <div>
        <PageHeader />
        <div className="mt-6">
          <EmptyState
            title="No outlet linked to your account"
            description="This view is for agent accounts with a linked outlet. Contact an Ops admin if you believe this is a mistake."
          />
        </div>
      </div>
    );
  }

  const { ok, body } = await serverApiFetch(`/api/agents/${owner.managedAgentId}`);

  if (!ok) {
    return (
      <div>
        <PageHeader />
        <div className="mt-6">
          <ErrorCard message={body?.message ?? 'Could not load your outlet data.'} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader outletCode={body.data.agent.outletCode} />

      <section className="mt-6">
        <AgentWalletPoller agentId={owner.managedAgentId} initialData={body.data} />
      </section>

      <section className="mt-4">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg bg-white/5" />}>
          <RecentTransactionsSection agentId={owner.managedAgentId} />
        </Suspense>
      </section>
    </div>
  );
}

function PageHeader({ outletCode }) {
  return (
    <header className="border-b border-white/10 pb-4">
      <h1 className="text-lg font-semibold text-white">
        {outletCode ?? 'Your Outlet'}
      </h1>
      <p className="text-xs text-white/40">Unified wallet view</p>
    </header>
  );
}