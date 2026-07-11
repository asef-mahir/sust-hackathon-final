/**
 * app/settings/page.js
 *
 * PAGE 7 — Settings (route: "/settings")
 *
 * Mostly a thin server shell around client controls, since every control
 * here either mutates (reset) or is a client-only preference (language,
 * sign out). No data fetching needed for this page itself.
 */

import { SignOutButton } from '@/components/settings/SignOutButton';
import { SimulationResetButton } from '@/components/settings/SimulationResetButton';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { LanguagePreference } from '@/components/settings/LanguagePreference';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <p className="text-xs text-white/40">Demo configuration</p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <Card className="bg-surface border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white/80">Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-white/40">
              To view the app as a different role, sign out and sign back in with a
              different seeded demo account.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>

        <Card className="bg-surface border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white/80">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <LanguagePreference />
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="border-critical/20 bg-surface">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-critical">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimulationResetButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
