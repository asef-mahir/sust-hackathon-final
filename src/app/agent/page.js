import { redirect } from 'next/navigation';
import { getSessionOwner } from '@/lib/getSessionOwner';
import AgentClientView from './AgentClientView';

export default async function AgentDashboardPage() {
  const owner = await getSessionOwner();

  // Route protection
  if (!owner) {
    redirect('/login');
  }
  
  if (owner.role !== 'AGENT') {
    redirect('/');
  }

  if (!owner.managedAgentId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Error: No shop assigned to this agent account. Check your database seed.
      </div>
    );
  }

  // Pass the ID to the interactive client component
  return <AgentClientView agentId={owner.managedAgentId} />;
}