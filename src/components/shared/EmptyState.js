/**
 * components/shared/EmptyState.js
 *
 * Reusable "nothing here yet" state. Per the writing guidance: explain
 * what's missing and why, in the interface's voice — never a bare "No
 * data" with no context.
 */

export function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      {icon ? <div className="text-slate-400">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
