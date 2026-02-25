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

export interface LineHighlight {
  line: number;
  issue: string;
}

export interface CheckResult {
  missing_elements: string[];
  corrected_draft: string;
  corrected_html?: string;
  evidence: Record<string, string>;
  extracted_fields?: Record<string, string>;
  suggested_sections: SectionOption[];
  suggested_format_id?: string;
  change_summary?: string[];
  line_highlights?: LineHighlight[];
  last_checked_iso?: string;
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

  const dateMatch = draft.match(/दि\.\s*([\d\/]+)/);
  if (dateMatch) evidence['दिनांक'] = dateMatch[1];
  else missing.push('दिनांक');

  const timeMatch = draft.match(/([\d:]+)\s*वाजता/);
  if (timeMatch) evidence['वेळ'] = timeMatch[1];
  else missing.push('वेळ');

  if (draft.includes('रा.') || draft.includes('येथे') || draft.includes('चौक') || draft.includes('रोड')) {
    const locMatch = draft.match(/रा\.\s*([^,\n]+)/);
    if (locMatch) evidence['ठिकाण'] = locMatch[1].trim();
  } else {
    missing.push('ठिकाण');
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

  let corrected = draft;
  if (missing.length > 0) {
    const header = missing.map(m => `[${m}: ______]`).join('\n');
    corrected = `${header}\n\n${draft}`;
  }

  const line_highlights: LineHighlight[] = missing.slice(0, 3).map((m, i) => ({
    line: i + 1,
    issue: `${m} गायब`
  }));

  return {
    missing_elements: missing,
    corrected_draft: corrected,
    evidence,
    extracted_fields: { 'जिल्हा': 'नाशिक', 'तालुका': '—' },
    suggested_sections: sections.length === 0
      ? allSections.slice(0, 2)
      : allSections.filter(s => sections.includes(s.section_id)),
    change_summary: missing.length > 0
      ? missing.map(m => `${m} जोडले`)
      : ['कोणतेही बदल आवश्यक नाहीत'],
    line_highlights,
    last_checked_iso: new Date().toISOString(),
  };
};

export function useMockApi() {
  const [isDemoMode, setIsDemoMode] = useState(false);

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
    async (draft: string, formatId: string, sections: string[], presetId?: string): Promise<CheckResult> => {
      // Try real backend first
      try {
        const res = await fetch('http://127.0.0.1:5000/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft,
            format_id: formatId,
            selected_sections: sections,
            ...(presetId ? { preset_id: presetId } : {}),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setIsDemoMode(false);
        // Normalize response — fill in defaults for optional fields
        return {
          missing_elements: data.missing_elements || [],
          corrected_draft: data.corrected_draft || draft,
          corrected_html: data.corrected_html,
          evidence: data.evidence || {},
          extracted_fields: data.extracted_fields,
          suggested_sections: data.suggested_sections || [],
          suggested_format_id: data.suggested_format_id,
          change_summary: data.change_summary,
          line_highlights: data.line_highlights,
          last_checked_iso: data.last_checked_iso || new Date().toISOString(),
        };
      } catch {
        // Fallback to mock
        setIsDemoMode(true);
        await new Promise(r => setTimeout(r, 1500));
        return mockCheckResponse(draft, formatId, sections);
      }
    },
    []
  );

  const suggestSections = useCallback(
    async (draft: string): Promise<SectionOption[]> => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/suggest_sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft }),
        });
        if (!res.ok) throw new Error();
        return await res.json();
      } catch {
        await new Promise(r => setTimeout(r, 800));
        const suggestions: SectionOption[] = [];
        const lower = draft.toLowerCase();
        if (lower.includes('दरोडा') || lower.includes('हिसकाव') || lower.includes('लूट') || lower.includes('robbery'))
          suggestions.push(...allSections.filter(s => s.section_id === 'sec-392'));
        if (lower.includes('फसवणूक') || lower.includes('cheating') || lower.includes('उकळ'))
          suggestions.push(...allSections.filter(s => s.section_id === 'sec-420'));
        if (lower.includes('हल्ला') || lower.includes('मार') || lower.includes('assault'))
          suggestions.push(...allSections.filter(s => s.section_id === 'sec-354'));
        return suggestions.length > 0 ? suggestions : allSections.slice(0, 1);
      }
    },
    []
  );

  return { getFormats, getSections, getPresets, checkDraft, suggestSections, allSections, isDemoMode };
}
