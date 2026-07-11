/**
 * components/settings/ThemeToggle.js
 *
 * Honestly disabled. The entire token system built across this app
 * (bg-ink, bg-surface, text-brass, etc.) only has dark-mode values
 * defined — a working light theme would need a second full set of HSL
 * values and wasn't designed. Rendering a fake-working toggle would be
 * worse than not having one; this is the same disabled-with-explanation
 * pattern used for Scenario C/D on Page 2.
 */

import { Sun } from 'lucide-react';

export function ThemeToggle() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-white/30" />
        <div>
          <p className="text-sm text-white/70">Theme</p>
          <p className="text-xs text-white/30">Dark only — light theme not yet designed.</p>
        </div>
      </div>
      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/30">
        Coming soon
      </span>
    </div>
  );
}
