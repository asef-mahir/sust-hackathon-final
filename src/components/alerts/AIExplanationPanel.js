'use client';

/**
 * components/alerts/AIExplanationPanel.js
 *
 * Renders alert.explanations ({en, bn, banglish}, each with reason/
 * evidence/nextStep) with a language toggle. Shows alert.source
 * (RULE_BASED vs HYBRID) as a small transparency badge — visible proof of
 * whether AI actually contributed or the deterministic fallback template
 * was used, per the explainability principle this was built under.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Sparkles } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'banglish', label: 'Banglish' },
];

/**
 * @param {{ explanations: Object | null, source: 'RULE_BASED' | 'HYBRID' }} props
 */
export function AIExplanationPanel({ explanations, source }) {
  // Defaults to 'en' on first render (server + client must match to avoid
  // a hydration mismatch), then adopts the Settings-page preference (if
  // any) once mounted in the browser.
  const [activeLanguage, setActiveLanguage] = useState('en');

  useEffect(() => {
    const stored = window.localStorage.getItem('preferredExplanationLanguage');
    if (stored) setActiveLanguage(stored);
  }, []);

  if (!explanations) {
    return (
      <Card className="bg-surface border-white/10">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white/80">
            AI Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No explanation generated for this alert." />
        </CardContent>
      </Card>
    );
  }

  const content = explanations[activeLanguage];

  return (
    <Card className="bg-surface border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-white/80">
          AI Explanation
        </CardTitle>
        <Badge
          variant="outline"
          className={
            source === 'HYBRID'
              ? 'border-healthy/30 text-healthy'
              : 'border-white/20 text-white/50'
          }
        >
          <Sparkles className="mr-1 h-3 w-3" />
          {source === 'HYBRID' ? 'AI-generated' : 'Rule-based template'}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveLanguage(lang.code)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                activeLanguage === lang.code
                  ? 'bg-brass/15 text-brass'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Reason</p>
            <p className="text-white/80">{content?.reason}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Evidence</p>
            <p className="text-white/80">{content?.evidence}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">
              Recommended Next Step
            </p>
            <p className="text-white/80">{content?.nextStep}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
