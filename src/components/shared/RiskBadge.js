/**
 * components/shared/RiskBadge.js
 *
 * Reusable severity/confidence indicator. Deliberately uses color + text
 * label together (never color alone) — colorblind-safe, and matches the
 * accessibility requirement carried over from the architecture review.
 */

import { Badge } from '@/components/ui/badge';

const CONFIDENCE_STYLES = {
  HIGH: 'bg-critical/15 text-critical border-critical/30',
  MEDIUM: 'bg-brass/15 text-brass border-brass/30',
  LOW: 'bg-white/10 text-white/60 border-white/20',
};

/**
 * @param {{ confidence: 'HIGH' | 'MEDIUM' | 'LOW' }} props
 */
export function RiskBadge({ confidence }) {
  return (
    <Badge
      variant="outline"
      className={`ls-numeric text-xs ${CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.LOW}`}
    >
      {confidence} confidence
    </Badge>
  );
}
