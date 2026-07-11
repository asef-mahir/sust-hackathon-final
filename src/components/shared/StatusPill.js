/**
 * components/shared/StatusPill.js
 *
 * Reusable alert lifecycle status indicator — distinct from RiskBadge
 * (which shows detection confidence, not case status). Used here on
 * Page 3, and again on Page 4's timeline and Page 2's history rows later
 * if needed.
 */

const STATUS_STYLES = {
  PENDING: 'bg-critical/15 text-critical',
  ACKNOWLEDGED: 'bg-brass/15 text-brass',
  IN_PROGRESS: 'bg-brass/15 text-brass',
  RESOLVED: 'bg-healthy/15 text-healthy',
  DISMISSED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

/**
 * @param {{ status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED' }} props
 */
export function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.DISMISSED
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
