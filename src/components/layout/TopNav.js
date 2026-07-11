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
  { href: '/ops', label: 'Ops Command Center', shortLabel: 'Ops', icon: LayoutDashboard, roles: ['OPS'], built: true },
  { href: '/risk', label: 'Risk Dashboard', shortLabel: 'Risk', icon: LayoutDashboard, roles: ['RISK'], built: true },
  { href: '/agent', label: 'Agent Wallet', shortLabel: 'Wallet', icon: Wallet, roles: ['AGENT'], built: true },
  
  // Shared Options
  { href: '/alerts', label: 'Alerts', shortLabel: 'Alerts', icon: Bell, roles: ['OPS', 'RISK'], built: true },
  { href: '/simulation', label: 'Simulations', shortLabel: 'Sims', icon: FlaskConical, roles: ['OPS'], built: true },
  { href: '/analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, roles: ['OPS', 'RISK'], built: true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, roles: ['OPS', 'RISK', 'AGENT'], built: true },
];

export function TopNav({ role, userName }) {
  const pathname = usePathname();

  const visibleItems = role 
    ? NAV_ITEMS.filter((item) => item.roles.includes(role)) 
    : [];

  return (
    <>
      {/* 1. TOP HEADER (Shared Desktop & Mobile) */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 md:px-6 backdrop-blur-md shadow-sm">
        
        {/* Left Side: Brand & Logo */}
        <div className="flex flex-1 items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              <span className="hidden sm:inline">Liquidity Sentinel</span>
              <span className="sm:hidden">Sentinel</span> {/* Shorter name on mobile */}
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Hidden on Mobile) */}
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
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
          {role ? (
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200">
              {/* Hide user name on small screens, keep it on sm and up */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-900">{userName}</span>
                <span className="text-xs font-semibold text-cyan-600">{role}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                <User className="h-4 w-4" />
              </div>
              
              <a 
                href="/api/auth/logout" 
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="pl-2 md:pl-4 border-l border-slate-200">
              <Link 
                href="/login" 
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 md:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-700 hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* 2. BOTTOM NAVIGATION (Mobile Only) */}
      {role && visibleItems.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-cyan-600' : 'text-slate-500 hover:text-slate-900'
                } ${!item.built && 'opacity-50 cursor-not-allowed'}`}
                title={!item.built ? "Coming soon" : ""}
                // Prevent clicking on unbuilt items in mobile view
                onClick={(e) => !item.built && e.preventDefault()}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'fill-cyan-50' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight">
                  {item.shortLabel || item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
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