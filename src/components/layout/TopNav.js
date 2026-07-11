'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  FlaskConical,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  User,
  LogIn
} from 'lucide-react';

const NAV_ITEMS = [
 { href: '/ops', label: 'Ops Command Center', icon: LayoutDashboard, roles: ['OPS'], built: true },
  { href: '/risk', label: 'Risk Dashboard', icon: LayoutDashboard, roles: ['RISK'], built: true },
  { href: '/agent', label: 'Agent Wallet', icon: Wallet, roles: ['AGENT'], built: true },
  
  // Shared Options
  { href: '/alerts', label: 'Alerts', icon: Bell, roles: ['OPS', 'RISK'], built: true },
  { href: '/simulation', label: 'Simulations', icon: FlaskConical, roles: ['OPS'], built: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['OPS', 'RISK'], built: true },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['OPS', 'RISK', 'AGENT'], built: true },
];

export function TopNav({ role, userName }) {
  const pathname = usePathname();

  // FIX: If there is no role (logged out), the array is empty so nothing renders.
  // If logged in, it strictly filters based on the user's role.
  const visibleItems = role 
    ? NAV_ITEMS.filter((item) => item.roles.includes(role)) 
    : [];

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md shadow-sm">
      
      {/* Left Side: Brand & Logo */}
      <div className="flex flex-1 items-center gap-2">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Liquidity Sentinel
          </span>
        </Link>
      </div>

      {/* Center: Navigation Links (Empty if not logged in) */}
      <nav className="hidden md:flex flex-shrink-0 items-center gap-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (!item.built) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400"
                title="Coming soon"
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
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Side: Dynamic Auth Area */}
      <div className="flex flex-1 items-center justify-end gap-4">
        

        {/* Conditional Rendering based on Authentication Status */}
        {role ? (
          /* --- LOGGED IN VIEW --- */
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-900">{userName}</span>
              <span className="text-xs font-semibold text-cyan-600">{role}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              <User className="h-4 w-4" />
            </div>
            
            {/* Note: using standard <a> tag here to force hard refresh on logout */}
            <a 
              href="/api/auth/logout" 
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        ) : (
          /* --- LOGGED OUT VIEW --- */
          <div className="pl-4 border-l border-slate-200">
            <Link 
              href="/login" 
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 hover:shadow-md"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

// Fallback icon
function ShieldAlert(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}