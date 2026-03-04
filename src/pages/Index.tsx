import React, { useCallback, useMemo, useRef, useState } from "react";
import { krupayaTapasa, generateFir } from "@/lib/api";

type TapasaUI = {
  missing_words: string[];
  suggested_sections: Array<{
    section_key?: string;
    section_no?: number;
    title?: string | null;
    score?: number;
    type?: string;
  }>;
};

export default function Index() {
  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  // INPUTS
  const [draft, setDraft] = useState<string>("");
  const [formatId, setFormatId] = useState<string>("FIR");

  // SELECTED SECTIONS
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // UI STATES
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);

  // RESULTS
  const [tapasaData, setTapasaData] = useState<TapasaUI | null>(null);
  const [genDraft, setGenDraft] = useState<string>("");
  const [genMissing, setGenMissing] = useState<string[]>([]);

  const canRun = useMemo(() => draft.trim().length > 0, [draft]);

  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // ACTION 1: KRUPAYA TAPASA (CHECK)
  const handleCheck = useCallback(async () => {
    setValidationError(null);
    if (!draft.trim()) {
      setValidationError("कृपया मसुदा लिहा.");
      return;
    }

    setIsChecking(true);
    setError(null);

    // Reset outputs
    setTapasaData(null);
    setGenDraft("");
    setGenMissing([]);

    try {
      const data = await krupayaTapasa({ text: draft, k: 7, lang: "mr" });

      const missing = Array.isArray(data?.missing_words) ? data.missing_words : [];
      const suggestedRaw = Array.isArray(data?.suggested_sections) ? data.suggested_sections : [];

      // IMPORTANT: DO NOT render snippet anywhere (mojibake blocker)
      const suggested = suggestedRaw.map((s: any) => ({
        section_key: s?.section_key,
        section_no: s?.section_no,
        title: s?.title ?? null,
        score: typeof s?.score === "number" ? s.score : undefined,
        type: typeof s?.type === "string" ? s.type : "scst",
      }));

      setTapasaData({ missing_words: missing, suggested_sections: suggested });

      // Auto-add keys to selected list
      const keys = suggested
        .map((s) => (typeof s.section_key === "string" ? s.section_key : ""))
        .filter(Boolean);

      if (keys.length) {
        setSelectedSections((prev) => [...new Set([...prev, ...keys])]);
      }

      scrollToResults();
    } catch {
      setError("त्रुटी — सर्व्हरशी संपर्क झाला नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setIsChecking(false);
    }
  }, [draft, scrollToResults]);

  // ACTION 2: AUTO FIR GENERATOR
  const handleGenerateFir = useCallback(async () => {
    setValidationError(null);
    if (!draft.trim()) {
      setValidationError("कृपया मसुदा लिहा.");
      return;
    }

    setIsSuggesting(true);
    setError(null);
    setGenDraft("");
    setGenMissing([]);

    try {
      const res = await generateFir({
        incident: draft,
        lang: "mr",
        format_id: formatId ?? "FIR",
        sections: selectedSections,
        fields: {
          date: "",
          time: "",
          place: "",
          victim_name: "",
          accused_name: "",
          witness_name: "",
        },
      });

      setGenDraft(res?.draft || "");
      setGenMissing(Array.isArray(res?.missing_fields) ? res.missing_fields : []);
      scrollToResults();
    } catch {
      setError("Auto FIR तयार करताना त्रुटी आली.");
    } finally {
      setIsSuggesting(false);
    }
  }, [draft, formatId, selectedSections, scrollToResults]);

  const clearAll = useCallback(() => {
    setDraft("");
    setTapasaData(null);
    setGenDraft("");
    setGenMissing([]);
    setSelectedSections([]);
    setValidationError(null);
    setError(null);
  }, []);

  const removeSelected = useCallback((key: string) => {
    setSelectedSections((prev) => prev.filter((x) => x !== key));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold">FIR Mitra</div>
          <button className="btn-police-accent text-sm" onClick={clearAll} type="button">
            Reset
          </button>
        </div>

        {/* ERRORS */}
        {validationError && (
          <div className="mb-3 police-card p-3 border border-destructive/40">
            <div className="text-sm text-destructive font-semibold">{validationError}</div>
          </div>
        )}

        {error && (
          <div className="mb-3 police-card p-3 border border-destructive/40">
            <div className="text-sm text-destructive font-semibold">{error}</div>
          </div>
        )}

        <div className="flex gap-6">
          {/* LEFT COLUMN */}
          <div className="w-[60%] flex flex-col gap-4">
            <div className="police-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold">मसुदा</h2>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Format</label>
                  <select
                    className="text-sm border border-border rounded px-2 py-1 bg-background"
                    value={formatId}
                    onChange={(e) => setFormatId(e.target.value)}
                  >
                    <option value="FIR">FIR</option>
                    <option value="NC">NC</option>
                  </select>
                </div>
              </div>

              <textarea
                className="w-full min-h-[340px] border border-border rounded p-3 text-sm bg-background"
                placeholder="इथे FIR मसुदा लिहा..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />

              <div className="mt-3 flex gap-2">
                <button
                  className="btn-police-accent text-sm"
                  onClick={handleCheck}
                  disabled={isChecking || isSuggesting || !canRun}
                  type="button"
                >
                  {isChecking ? "तपासणी..." : "कृपया तपासा"}
                </button>

                <button
                  className="btn-police-accent text-sm"
                  onClick={handleGenerateFir}
                  disabled={isSuggesting || isChecking || !canRun}
                  type="button"
                >
                  {isSuggesting ? "तयार करत आहे..." : "Auto FIR तयार करा"}
                </button>
              </div>

              {/* Selected Sections */}
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Selected Sections</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSections.length === 0 ? (
                    <div className="text-sm text-muted-foreground">— none —</div>
                  ) : (
                    selectedSections.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-border bg-muted"
                      >
                        {k}
                        <button
                          className="text-xs opacity-70 hover:opacity-100"
                          onClick={() => removeSelected(k)}
                          type="button"
                          aria-label={`remove ${k}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-[40%] flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">निकाल</h2>

            {!tapasaData && !genDraft && !isChecking && (
              <div className="flex-1 flex items-center justify-center police-card p-8 text-center text-muted-foreground text-sm">
                <div>
                  <div className="text-4xl mb-3 opacity-40">📄</div>
                  <p>डाव्या बाजूला मसुदा टाका आणि "कृपया तपासा" क्लिक करा.</p>
                </div>
              </div>
            )}

            {(tapasaData || genDraft) && (
              <div ref={resultSectionRef} className="police-card p-4">
                <div className="grid gap-3">
                  {/* ACCORDION 1: Missing */}
                  <details open className="rounded-md border border-border p-3">
                    <summary className="cursor-pointer font-bold">गहाळ घटक</summary>
                    <div className="mt-2">
                      {tapasaData?.missing_words?.length ? (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {tapasaData.missing_words.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">— नाही —</div>
                      )}
                    </div>
                  </details>

                  {/* ACCORDION 2: Suggested Sections */}
                  <details open className="rounded-md border border-border p-3">
                    <summary className="cursor-pointer font-bold">सुचवलेले कलम</summary>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {(tapasaData?.suggested_sections || []).map((s, idx) => {
                        const label =
                          (s.title && s.title.trim()) ||
                          s.section_key ||
                          (s.section_no ? `Section ${s.section_no}` : `S${idx + 1}`);
                        const key = s.section_key || `${idx}`;
                        const score = typeof s.score === "number" ? s.score.toFixed(2) : "";

                        return (
                          <button
                            key={key}
                            className="text-xs px-3 py-1 rounded-full border border-accent bg-accent/10 hover:bg-accent/25"
                            onClick={() =>
                              s.section_key &&
                              setSelectedSections((prev) => [...new Set([...prev, s.section_key!])])
                            }
                            type="button"
                          >
                            {label}
                            {score ? ` • ${score}` : ""}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      (Snippet बंद ठेवला आहे — police demo clean.)
                    </div>
                  </details>

                  {/* ACCORDION 3: Auto FIR Generator */}
                  <details open className="rounded-md border border-border p-3">
                    <summary className="cursor-pointer font-bold">Auto FIR Draft</summary>

                    <div className="mt-2 flex gap-2">
                      <button
                        className="btn-police-accent text-sm"
                        onClick={handleGenerateFir}
                        disabled={isSuggesting || isChecking || !canRun}
                        type="button"
                      >
                        {isSuggesting ? "तयार करत आहे..." : "Auto FIR तयार करा"}
                      </button>
                    </div>

                    {genMissing.length > 0 && (
                      <div className="mt-3">
                        <div className="font-semibold text-sm text-destructive">Missing Fields</div>
                        <div className="text-sm">{genMissing.join(", ")}</div>
                      </div>
                    )}

                    {genDraft && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-2">Draft (demo)</div>
                        <pre className="whitespace-pre-wrap text-sm border border-border rounded p-3 bg-white text-black">
                          {genDraft}
                        </pre>
                      </div>
                    )}
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Demo rule: UI मध्ये Marathi snippet दाखवत नाही. फक्त missing_words + section_key + score.
        </div>
      </div>
    </div>
  );
}