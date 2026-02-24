import { useState, useRef, useCallback, useEffect } from 'react';

export interface FormatOption {
  id: string;
  title: string;
  description: string;
  popularity: number;
}

export interface SectionOption {
  section_id: string;
  display: string;
  statute: string;
  category?: string;
}

export interface CheckResult {
  missing_elements: string[];
  corrected_draft: string;
  evidence: Record<string, string>;
  suggested_sections: SectionOption[];
}

export interface PresetOption {
  id: string;
  title: string;
  draft: string;
  format_id: string;
  sections: string[];
}

// Import local data
import formatsData from '@/data/formats.json';
import sectionsData from '@/data/sections.json';
import presetsData from '@/data/presets.json';

const allSections: SectionOption[] = Object.entries(sectionsData).flatMap(
  ([category, items]) =>
    (items as SectionOption[]).map((s) => ({ ...s, category }))
);

const mockCheckResponse = (draft: string, formatId: string, sections: string[]): CheckResult => {
  const missing: string[] = [];
  const evidence: Record<string, string> = {};

  // Simple heuristic detection
  const dateMatch = draft.match(/दि\.\s*([\d\/]+)/);
  if (dateMatch) evidence['दिनांक'] = dateMatch[1];
  else missing.push('दिनांक');

  const timeMatch = draft.match(/([\d:]+)\s*वाजता/);
  if (timeMatch) evidence['वेळ'] = timeMatch[1];
  else missing.push('वेळ');

  if (draft.includes('रा.') || draft.includes('येथे') || draft.includes('चौक') || draft.includes('रोड')) {
    const locMatch = draft.match(/रा\.\s*([^,\n]+)/);
    if (locMatch) evidence['स्थळ'] = locMatch[1].trim();
  } else {
    missing.push('स्थळ');
  }

  if (draft.includes('आरोपी') || draft.includes('इसम')) {
    const accMatch = draft.match(/आरोपी\s+([^\s,]+\s*[^\s,]*)/);
    if (accMatch) evidence['आरोपी'] = accMatch[1].trim();
  } else {
    missing.push('आरोपीचे वर्णन');
  }

  if (!draft.includes('फिर्यादी') && !draft.includes('तक्रारदार')) missing.push('फिर्यादीचे नाव');
  if (!draft.includes('वय')) missing.push('फिर्यादीचे वय');
  if (!draft.includes('रु.') && !draft.includes('रक्कम')) missing.push('नुकसानीचा तपशील');

  // Build corrected draft by prepending missing fields
  let corrected = draft;
  if (missing.length > 0) {
    const header = missing.map(m => `[${m}: ______]`).join('\n');
    corrected = `${header}\n\n${draft}`;
  }

  return {
    missing_elements: missing,
    corrected_draft: corrected,
    evidence,
    suggested_sections: sections.length === 0
      ? allSections.slice(0, 2)
      : allSections.filter(s => sections.includes(s.section_id)),
  };
};

export function useMockApi() {
  const getFormats = useCallback((): FormatOption[] => {
    return [...formatsData].sort((a, b) => b.popularity - a.popularity);
  }, []);

  const getSections = useCallback((query?: string): SectionOption[] => {
    if (!query) return allSections;
    const q = query.toLowerCase();
    return allSections.filter(
      s =>
        s.display.toLowerCase().includes(q) ||
        s.statute.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, []);

  const getPresets = useCallback((): PresetOption[] => {
    return presetsData as PresetOption[];
  }, []);

  const checkDraft = useCallback(
    async (draft: string, formatId: string, sections: string[]): Promise<CheckResult> => {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1500));
      return mockCheckResponse(draft, formatId, sections);
    },
    []
  );

  const suggestSections = useCallback(
    async (draft: string): Promise<SectionOption[]> => {
      await new Promise(r => setTimeout(r, 800));
      // keyword-based suggestion
      const suggestions: SectionOption[] = [];
      const lower = draft.toLowerCase();
      if (lower.includes('दरोडा') || lower.includes('हिसकाव') || lower.includes('लूट') || lower.includes('robbery'))
        suggestions.push(...allSections.filter(s => s.section_id === 'sec-392'));
      if (lower.includes('फसवणूक') || lower.includes('cheating') || lower.includes('उकळ'))
        suggestions.push(...allSections.filter(s => s.section_id === 'sec-420'));
      if (lower.includes('हल्ला') || lower.includes('मार') || lower.includes('assault'))
        suggestions.push(...allSections.filter(s => s.section_id === 'sec-354'));
      return suggestions.length > 0 ? suggestions : allSections.slice(0, 1);
    },
    []
  );

  return { getFormats, getSections, getPresets, checkDraft, suggestSections, allSections };
}
