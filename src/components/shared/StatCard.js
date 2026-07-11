/**
 * components/shared/StatCard.js
 *
 * Reusable metric tile — used on the Dashboard vitals strip today, and by
 * Analytics (Page 6) later. Tone drives the accent color so callers don't
 * hardcode Tailwind classes per-instance.
 */

import { Card, CardContent } from '@/components/ui/card';

const TONE_CLASSES = {
  neutral: 'text-slate-900',
  brass: 'text-brass',
  warning: 'text-brass',
  critical: 'text-critical',
  healthy: 'text-healthy',
};

/**
 * @param {{ label: string, value: string, tone?: keyof typeof TONE_CLASSES, icon?: React.ReactNode }} props
 */
export function StatCard({ label, value, tone = 'neutral', icon }) {
  return (
    <Card className="bg-surface border-slate-200">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`ls-numeric text-2xl font-semibold ${TONE_CLASSES[tone]}`}>
            {value}
          </p>
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
