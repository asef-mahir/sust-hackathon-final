/**
 * components/alerts/EvidencePanel.js
 *
 * Renders alert.evidence (a JSON object from anomalyRules.js) generically
 * as a key-value list, rather than assuming one fixed shape — the two
 * active scenarios (Hidden Shortage, High Velocity) produce different
 * evidence shapes, and a new scenario's evidence should render here
 * without this component needing a code change.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * @param {{ evidence: Object, confidenceReason: string }} props
 */
export function EvidencePanel({ evidence, confidenceReason }) {
  const entries = Object.entries(evidence ?? {});

  return (
    <Card className="bg-surface border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-800">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-slate-700">{confidenceReason}</p>
        <div className="ls-numeric grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between border-b border-slate-100 py-1">
              <span className="text-slate-500">{humanizeKey(key)}</span>
              <span className="text-slate-800">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
