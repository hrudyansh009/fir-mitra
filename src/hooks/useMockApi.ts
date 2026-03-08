import { useMemo } from "react";

export type FormatOption = {
  id: string;
  title: string;
  description: string;
};

export type SectionOption = {
  id: string;
  display: string;
  statute: string;
};

export type PresetOption = {
  id: string;
  title: string;
  draft: string;
  format_id: string;
  sections: string[];
};

export type SuggestedChip = {
  section_id: string;
  display: string;
  statute: string;
};

export type LineHighlight = {
  line: number;
  issue: string;
};

export type CheckResult = {
  corrected_draft: string;
  corrected_html: string;
  missing_elements: string[];
  evidence: Record<string, unknown>;
  extracted_fields: Record<string, unknown>;
  suggested_sections: SuggestedChip[];
  suggested_format_id: string;
  change_summary: string[];
  line_highlights: LineHighlight[];
  last_checked_iso: string;
  id?: string;
  created_at?: string;
};

export function useMockApi() {
  const isDemoMode = useMemo(() => false, []);

  const formats = useMemo<FormatOption[]>(
    () => [
      {
        id: "FIR",
        title: "FIR",
        description: "FIR मसुदा तपासणी",
      },
      {
        id: "DOSHAROP",
        title: "दोषारोप",
        description: "दोषारोप मसुदा तपासणी",
      },
    ],
    []
  );

  const allSections = useMemo<SectionOption[]>(
    () => [
      { id: "SCST_3(1)(r)", display: "SC/ST 3(1)(r)", statute: "SC/ST" },
      { id: "SCST_3(1)(s)", display: "SC/ST 3(1)(s)", statute: "SC/ST" },
      { id: "IPC_323", display: "IPC 323", statute: "IPC" },
      { id: "IPC_504", display: "IPC 504", statute: "IPC" },
      { id: "IPC_506", display: "IPC 506", statute: "IPC" },
      { id: "IPC_379", display: "IPC 379", statute: "IPC" },
      { id: "IPC_427", display: "IPC 427", statute: "IPC" },
      { id: "IPC_448", display: "IPC 448", statute: "IPC" },
    ],
    []
  );

  const presets = useMemo<PresetOption[]>(
    () => [
      {
        id: "p1",
        title: "जातिवाचक शिवीगाळ (उदाहरण)",
        format_id: "FIR",
        sections: ["SCST_3(1)(r)", "SCST_3(1)(s)"],
        draft: "अनुसूचित जातीच्या व्यक्तीला सार्वजनिक ठिकाणी जातिवाचक शिवीगाळ करून अपमान केला.",
      },
      {
        id: "p2",
        title: "मारहाण/धमकी (उदाहरण)",
        format_id: "FIR",
        sections: ["IPC_323", "IPC_504", "IPC_506"],
        draft: "वादाच्या कारणावरून आरोपीने मारहाण केली व शिवीगाळ करून जीवे मारण्याची धमकी दिली.",
      },
    ],
    []
  );

  function getFormats(): FormatOption[] {
    return formats;
  }

  function getPresets(): PresetOption[] {
    return presets;
  }

  function getSections(q: string): SectionOption[] {
    const s = q.trim().toLowerCase();
    if (!s) return allSections;
    return allSections.filter(
      (x) =>
        x.display.toLowerCase().includes(s) ||
        x.id.toLowerCase().includes(s) ||
        x.statute.toLowerCase().includes(s)
    );
  }

  async function suggestSections(_draft: string): Promise<Array<{ section_id: string }>> {
    return [];
  }

  return {
    isDemoMode,
    allSections,
    getFormats,
    getPresets,
    getSections,
    suggestSections,
  };
}