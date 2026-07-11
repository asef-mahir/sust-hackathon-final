/**
 * components/shared/EmptyState.js
 *
 * Reusable "nothing here yet" state. Per the writing guidance: explain
 * what's missing and why, in the interface's voice — never a bare "No
 * data" with no context.
 */

export function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      {icon ? <div className="text-white/20">{icon}</div> : null}
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-white/40">{description}</p>
      ) : null}
    </div>
  );
}
