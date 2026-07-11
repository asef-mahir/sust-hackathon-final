import { TopNav } from './TopNav';
import { getSessionOwner } from '@/lib/getSessionOwner';

export async function AppShell({ children }) {
  const owner = await getSessionOwner();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopNav role={owner?.role ?? null} userName={owner?.name ?? 'Guest'} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}