'use client';

/**
 * components/settings/LanguagePreference.js
 *
 * Genuinely scoped-down "Language" setting: sets which language tab the
 * Alert Details AI Explanation panel opens on by default (localStorage-
 * backed). Full UI localization was never built anywhere in this app —
 * this does one real, small thing instead of pretending to do everything.
 */

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'preferredExplanationLanguage';
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'banglish', label: 'Banglish' },
];

export function LanguagePreference() {
  const [value, setValue] = useState('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setValue(stored);
  }, []);

  function handleChange(next) {
    setValue(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm text-slate-700">Default Explanation Language</p>
        <p className="text-xs text-slate-400">
          Which language tab Alert Details opens on by default.
        </p>
      </div>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-40 border-slate-200 bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
