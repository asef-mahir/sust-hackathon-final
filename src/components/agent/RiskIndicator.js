/**
 * components/agent/RiskIndicator.js
 *
 * Large, unmissable risk status display — this is the "how severe is it"
 * answer for the shopkeeper user, who needs it readable at a glance, not
 * buried in a small badge.
 */

const RISK_CONFIG = {
  SAFE: { label: 'All Clear', className: 'bg-healthy/15 text-healthy border-healthy/30' },
  WARNING: { label: 'Attention Needed', className: 'bg-brass/15 text-brass border-brass/30' },
  CRITICAL: { label: 'Urgent — Act Now', className: 'bg-critical/15 text-critical border-critical/30' },
};

/**
 * @param {{ riskStatus: 'SAFE' | 'WARNING' | 'CRITICAL' }} props
 */
export function RiskIndicator({ riskStatus }) {
  const config = RISK_CONFIG[riskStatus] ?? RISK_CONFIG.SAFE;

  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${config.className}`}>
      <p className="text-sm font-semibold">{config.label}</p>
    </div>
  );
}
