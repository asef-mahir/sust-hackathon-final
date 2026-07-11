/**
 * components/settings/ThemeToggle.js
 *
 * Honestly disabled. The app only has a light theme designed and wired up
 * — no dark-mode token set exists. Rendering a fake-working toggle would be
 * worse than not having one; this is the same disabled-with-explanation
 * pattern used for Scenario C/D on Page 2.
 */

import { Sun } from 'lucide-react';

export function ThemeToggle() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-slate-400" />
        <div>
          <p className="text-sm text-slate-700">Theme</p>
          <p className="text-xs text-slate-400">Light only — dark theme not yet designed.</p>
        </div>
      </div>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-400">
        Coming soon
      </span>
    </div>
  );
}
