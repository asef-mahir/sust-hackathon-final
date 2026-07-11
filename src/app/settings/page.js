import { SignOutButton } from '@/components/settings/SignOutButton';
import { SimulationResetButton } from '@/components/settings/SimulationResetButton';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { LanguagePreference } from '@/components/settings/LanguagePreference';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500">Demo configuration</p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <Card className="bg-surface border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-800">Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              To view the app as a different role, sign out and sign back in with a
              different seeded demo account.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>

        <Card className="bg-surface border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-800">Preferences</CardTitle>
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