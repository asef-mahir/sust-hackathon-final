/**
 * components/dashboard/LiquidityGauge.js
 *
 * Signature visual element: a segmented, bill-counter-style gauge — thin
 * vertical ticks filling left to right like counted banknotes, rather than
 * a generic rounded progress bar. Used everywhere a balance/share-of-total
 * is shown (provider cards now, agent balance bars later) so the "counted
 * cash" motif stays consistent across the app.
 *
 * Pure presentational component — takes a 0..1 ratio, no data fetching.
 */

const SEGMENT_COUNT = 24;

/**
 * @param {{ ratio: number, label?: string, className?: string }} props
 * ratio: 0..1, share of total this gauge represents.
 */
export function LiquidityGauge({ ratio, label, className = '' }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filledSegments = Math.round(clamped * SEGMENT_COUNT);

  const colorClass =
    clamped < 0.1 ? 'bg-critical' : clamped < 0.25 ? 'bg-brass' : 'bg-healthy';

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        className="flex items-end gap-[2px]"
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Liquidity share'}
      >
        {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
          <span
            key={index}
            className={`w-[3px] rounded-[1px] transition-colors ${
              index < filledSegments ? colorClass : 'bg-slate-200'
            }`}
            style={{ height: index % 4 === 0 ? '18px' : '12px' }}
          />
        ))}
      </div>
      {label ? (
        <span className="ls-numeric text-xs text-slate-500">{label}</span>
      ) : null}
    </div>
  );
}