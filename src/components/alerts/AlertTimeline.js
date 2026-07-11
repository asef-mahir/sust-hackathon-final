/**
 * components/alerts/AlertTimeline.js
 *
 * Renders the full audit trail — every AlertEvent from oldest to newest.
 * This is what makes "who owns it, what happened, is it actually closed"
 * answerable at a glance, per the case-ownership requirement this whole
 * system was designed around.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * @param {{ timeline: Object[] }} props - AlertEvent[] with `actor` included
 */
export function AlertTimeline({ timeline }) {
  return (
    <Card className="bg-surface border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-800">Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <EmptyState title="No actions taken on this alert yet." />
        ) : (
          <ol className="flex flex-col gap-4 border-l border-slate-200 pl-4">
            {timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brass" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {event.actor?.name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-400">({event.actor?.role})</span>
                  {event.toStatus ? <StatusPill status={event.toStatus} /> : null}
                </div>
                {event.note ? (
                  <p className="mt-1 text-sm text-slate-600">{event.note}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
