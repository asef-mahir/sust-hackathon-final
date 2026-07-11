/**
 * components/layout/AppShell.js
 *
 * Owns the chrome every page shares: sidebar + scrollable content area +
 * background. Individual pages (app/page.js, app/simulation/page.js, etc.)
 * should render ONLY their content now — not their own min-h-screen/bg-ink
 * wrapper, since that's this component's job. Fetches the current role
 * once, server-side, and passes it down to Sidebar for role-aware nav.
 */

import { Sidebar } from './Sidebar';
import { getSessionOwner } from '@/lib/getSessionOwner';

export async function AppShell({ children }) {
  const owner = await getSessionOwner();

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar role={owner?.role ?? null} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
