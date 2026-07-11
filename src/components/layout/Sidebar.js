'use client';

/**
 * components/layout/Sidebar.js
 *
 * Persistent nav shared by every page — resolves the "zero shared
 * navigation between pages" gap flagged after Page 2. Pages not yet built
 * (Alerts, Alert Details, Agent View, Analytics, Settings) render as
 * disabled "coming soon" items rather than dead links — same honest-state
 * pattern as the ScenarioCard disabled treatment on Page 2, not a new
 * convention invented just for this file.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  FlaskConical,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['OPS', 'RISK'], built: true },
  { href: '/alerts', label: 'Alerts', icon: Bell, roles: ['OPS', 'RISK'], built: true },
  { href: '/simulation', label: 'Simulation', icon: FlaskConical, roles: ['OPS'], built: true },
  { href: '/agent', label: 'Agent Wallet', icon: Wallet, roles: ['AGENT'], built: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['OPS', 'RISK'], built: true },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['OPS', 'RISK', 'AGENT'], built: true },
];

/**
 * @param {{ role: string | null }} props - current Owner.role, or null if
 *   unauthenticated (in which case every item shows but is treated as
 *   role-permitted, since API-level auth is the real gate regardless)
 */
export function Sidebar({ role }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-slate-200 bg-surface p-4">
      <div className="mb-4 px-2">
        <p className="text-sm font-semibold text-slate-900">Liquidity Sentinel</p>
      </div>

      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (!item.built) {
          return (
            <span
              key={item.href}
              className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400"
              title="Not yet built"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-brass/15 text-brass'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
