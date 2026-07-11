/**
 * components/dashboard/DashboardHeader.js
 *
 * Page header — title, live-status indicator, manual refresh. Not a global
 * app shell/sidebar (that's cross-cutting infra shared by every future
 * page — flagging it as a decision worth making explicitly before Page 2,
 * rather than building it inside a single-page task).
 */

import { RefreshButton } from './RefreshButton';

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Liquidity Sentinel</h1>
        <p className="text-xs text-white/40">Network Operations Center</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-healthy">
          <span className="h-1.5 w-1.5 rounded-full bg-healthy" />
          Live
        </span>
        <RefreshButton />
      </div>
    </header>
  );
}
