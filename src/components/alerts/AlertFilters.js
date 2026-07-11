'use client';

/**
 * components/alerts/AlertFilters.js
 *
 * Changing a filter navigates to a new URL with updated search params —
 * that re-runs the Server Component page (app/alerts/page.js) with fresh
 * server-fetched, filtered data. No client-side fetch needed for
 * filtering; only "Load more" (AlertList) needs a client fetch, since
 * that's pagination beyond what the server already rendered.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
const CONFIDENCE_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

/**
 * @param {{ providers: { id: string, name: string }[] }} props
 */
export function AlertFilters({ providers }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('cursor'); // any filter change resets pagination
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="Status"
        value={searchParams.get('status') ?? 'ALL'}
        options={[{ value: 'ALL', label: 'All statuses' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
        onChange={(v) => updateFilter('status', v)}
      />
      <FilterSelect
        label="Provider"
        value={searchParams.get('providerId') ?? 'ALL'}
        options={[
          { value: 'ALL', label: 'All providers' },
          ...providers.map((p) => ({ value: p.id, label: p.name })),
        ]}
        onChange={(v) => updateFilter('providerId', v)}
      />
      <FilterSelect
        label="Confidence"
        value={searchParams.get('confidence') ?? 'ALL'}
        options={[{ value: 'ALL', label: 'All confidence levels' }, ...CONFIDENCE_OPTIONS.map((c) => ({ value: c, label: c }))]}
        onChange={(v) => updateFilter('confidence', v)}
      />
      <FilterSelect
        label="Sort"
        value={searchParams.get('sortOrder') ?? 'desc'}
        options={[
          { value: 'desc', label: 'Newest first' },
          { value: 'asc', label: 'Oldest first' },
        ]}
        onChange={(v) => updateFilter('sortOrder', v)}
      />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44 border-slate-200 bg-surface text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
