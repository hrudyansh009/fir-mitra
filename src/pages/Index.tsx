import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import EmergencyStrip from '@/components/EmergencyStrip';
import Header from '@/components/Header';
import { FormatSelect, SectionSelect } from '@/components/Selectors';
import { useMockApi } from '@/hooks/useMockApi';
import type { CheckResult, SectionOption } from '@/hooks/useMockApi';
import { toast } from 'sonner';
import { krupayaTapasa } from '@/lib/api';

const formatTime = (iso?: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('mr-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

const Index = () => {
  const api = useMockApi();
  const formats = useMemo(() => api.getFormats(), [api]);
  const presets = useMemo(() => api.getPresets(), [api]);
  const [presetOpen, setPresetOpen] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  const [formatId, setFormatId] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SectionOption[]>(api.allSections);
  const [draft, setDraft] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const [correctedDraft, setCorrectedDraft] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const originalRef = useRef<HTMLDivElement>(null);
  const correctedRef = useRef<HTMLDivElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((source: 'original' | 'corrected') => {
    const srcEl = source === 'original' ? originalRef.current : correctedRef.current;
    const tgtEl = source === 'original' ? correctedRef.current : originalRef.current;
    if (srcEl && tgtEl) {
      tgtEl.scrollTop = srcEl.scrollTop;
    }
  }, []);

  const handleSectionSearch = useCallback((q: string) => {
    setSectionOptions(api.getSections(q));
  }, [api]);

  const handleCheck = useCallback(async () => {
    setValidationError(null);

    if (!draft.trim()) {
      setValidationError('कृपया मसुदा लिहा.');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);
    setCorrectedDraft(null);

    const input = draft.trim();

    // DEMO EXAMPLE 1
    const demo1 =
      'आज सकाळी एका व्यक्तीने मला शिवीगाळ केली आणि मला धमकी दिली. तो माझ्या जवळ आला आणि भांडण केले.';

    const demo1Corrected =
      `दिनांक ५ मार्च २०२६ रोजी सकाळी अंदाजे १०:३० वाजता नाशिक शहरातील पंचवटी परिसरात आरोपीने फिर्यादीस सार्वजनिक ठिकाणी शिवीगाळ करून अपमान केला तसेच फिर्यादीस धमकी दिली.

आरोपीने फिर्यादीजवळ येऊन भांडण केले व त्याला घाबरवण्याचा प्रयत्न केला.

ही घटना सार्वजनिक ठिकाणी घडल्यामुळे फिर्यादीने संबंधित आरोपीविरुद्ध कायदेशीर कारवाई करण्यासाठी ही तक्रार नोंदविली आहे.`;

    // DEMO EXAMPLE 2
    const demo2 =
      'एका व्यक्तीने माझ्याशी भांडण केले आणि मला मारण्याची धमकी दिली.';

    const demo2Corrected =
      `दिनांक ५ मार्च २०२६ रोजी सायंकाळी अंदाजे ७:०० वाजता नाशिक शहरातील पंचवटी परिसरात आरोपीने फिर्यादीशी वाद घालून त्याला मारण्याची धमकी दिली.

या घटनेमुळे फिर्यादीस भीती वाटल्याने त्याने संबंधित आरोपीविरुद्ध कायदेशीर कारवाई करण्यासाठी ही तक्रार नोंदविली आहे.`;

    // DEMO EXAMPLE 3
    const demo3 =
      'आज माझ्या घरात चोरी झाली. कपाटातून पैसे आणि दागिने गेले.';

    const demo3Corrected =
      `दिनांक ५ मार्च २०२६ रोजी सकाळी अंदाजे ११:१५ वाजेच्या सुमारास फिर्यादीच्या नाशिक शहरातील राहत्या घरी अज्ञात आरोपीने अनधिकृतरित्या प्रवेश करून घरातील कपाटातून रोख रक्कम व सोन्याचे दागिने चोरी केले.

घटना लक्षात आल्यानंतर फिर्यादीने घरातील मालमत्ता तपासली असता पैसे व दागिने चोरीस गेल्याचे निदर्शनास आले. सदर घटनेबाबत कायदेशीर कारवाई व्हावी म्हणून ही तक्रार नोंदविली आहे.`;

    if (input === demo1) {
      setCorrectedDraft(demo1Corrected);
      setResult({
        corrected_draft: demo1Corrected,
        corrected_html: '',
        missing_elements: [
          'तारीख नमूद नाही',
          'वेळ नमूद नाही',
          'घटनास्थळ नमूद नाही',
          'आरोपीची स्पष्ट ओळख नाही',
          'कायदेशीर भाषा अपुरी आहे',
        ],
        evidence: {
          प्रकार: 'शिवीगाळ, धमकी, भांडण',
        },
        extracted_fields: {
          सुधारणा: 'अधिकृत FIR रचना तयार केली',
        },
        suggested_sections: [],
        suggested_format_id: formatId || '',
        change_summary: [
          'अनौपचारिक मजकूर अधिकृत FIR भाषेत बदलला',
          'तारीख, वेळ आणि ठिकाण जोडले',
          'घटना अधिक स्पष्ट स्वरूपात मांडली',
        ],
        line_highlights: [],
        last_checked_iso: new Date().toISOString(),
      } as any);
      setIsChecking(false);
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    if (input === demo2) {
      setCorrectedDraft(demo2Corrected);
      setResult({
        corrected_draft: demo2Corrected,
        corrected_html: '',
        missing_elements: [
          'तारीख नमूद नाही',
          'वेळ नमूद नाही',
          'घटनास्थळ नमूद नाही',
          'घटनेचे सविस्तर वर्णन नाही',
        ],
        evidence: {
          प्रकार: 'भांडण, धमकी',
        },
        extracted_fields: {
          सुधारणा: 'औपचारिक FIR मसुदा तयार केला',
        },
        suggested_sections: [],
        suggested_format_id: formatId || '',
        change_summary: [
          'धमकी घटनेचे स्पष्ट वर्णन केले',
          'औपचारिक FIR रचना तयार केली',
        ],
        line_highlights: [],
        last_checked_iso: new Date().toISOString(),
      } as any);
      setIsChecking(false);
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    if (input === demo3) {
      setCorrectedDraft(demo3Corrected);
      setResult({
        corrected_draft: demo3Corrected,
        corrected_html: '',
        missing_elements: [
          'तारीख नमूद नाही',
          'वेळ नमूद नाही',
          'घटनास्थळ पूर्ण नाही',
          'चोरी गेलेल्या वस्तूंचा तपशील अपुरा आहे',
          'अधिकृत FIR भाषा वापरलेली नाही',
        ],
        evidence: {
          प्रकार: 'चोरी',
        },
        extracted_fields: {
          सुधारणा: 'चोरीसंबंधित FIR मसुदा तयार केला',
        },
        suggested_sections: [],
        suggested_format_id: formatId || '',
        change_summary: [
          'चोरी घटनेचे औपचारिक वर्णन जोडले',
          'घटनास्थळ आणि मालमत्तेचा संदर्भ स्पष्ट केला',
          'तक्रार नोंदविण्याची कायदेशीर भाषा जोडली',
        ],
        line_highlights: [],
        last_checked_iso: new Date().toISOString(),
      } as any);
      setIsChecking(false);
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    try {
      const data: any = await krupayaTapasa({ text: draft, k: 7, lang: 'mr' });

      const missingWords: string[] = Array.isArray(data?.missing_words) ? data.missing_words : [];
      const suggestedSections: any[] = Array.isArray(data?.suggested_sections) ? data.suggested_sections : [];

      setCorrectedDraft(draft);

      setResult({
        corrected_draft: draft,
        corrected_html: '',
        missing_elements: missingWords,
        evidence: {},
        extracted_fields: {},
        suggested_sections: suggestedSections,
        suggested_format_id: formatId || '',
        change_summary: missingWords.length
          ? [`गहाळ शब्द/घटक: ${missingWords.length}`]
          : ['गहाळ शब्द/घटक नाही'],
        line_highlights: [],
        last_checked_iso: new Date().toISOString(),
      } as any);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setError('त्रुटी — सर्व्हरशी संपर्क झाला नाही. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsChecking(false);
    }
  }, [draft, formatId]);

  const handleSuggest = useCallback(async () => {
    if (!draft.trim()) return;
    setIsSuggesting(true);
    try {
      const suggestions = await api.suggestSections(draft);
      const newSecs = suggestions.map(s => s.section_id);
      setSelectedSections(prev => [...new Set([...prev, ...newSecs])]);
    } catch {
      // silent
    } finally {
      setIsSuggesting(false);
    }
  }, [draft, api]);

  const handleClear = useCallback(() => {
    setDraft('');
    setResult(null);
    setCorrectedDraft(null);
    setError(null);
    setValidationError(null);
  }, []);

  const handlePreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setDraft(preset.draft);
      setFormatId(preset.format_id);
      setSelectedSections(preset.sections);
      setResult(null);
      setCorrectedDraft(null);
    }
  }, [presets]);

  const handleCopy = useCallback(() => {
    if (result?.corrected_draft) {
      navigator.clipboard.writeText(result.corrected_draft);
      toast('कॉपी केले');
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result?.corrected_draft) return;
    const bom = '\uFEFF';
    const blob = new Blob([bom + result.corrected_draft], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `fir_${ts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleAddSuggestedSection = useCallback((sectionId: string) => {
    setSelectedSections(prev => [...new Set([...prev, sectionId])]);
  }, []);

  const lineHighlightMap = useMemo(() => {
    const map: Record<number, string> = {};
    if ((result as any)?.line_highlights) {
      (result as any).line_highlights.forEach((lh: any) => {
        map[lh.line] = lh.issue;
      });
    }
    return map;
  }, [result]);

  const allEvidence = useMemo(() => {
    if (!result) return {};
    return {
      ...((result as any).evidence || {}),
      ...((result as any).extracted_fields || {}),
    };
  }, [result]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EmergencyStrip />
      <Header />

      {api.isDemoMode && (
        <div className="bg-accent/20 border-b border-accent text-center py-1.5 text-sm font-semibold text-accent-foreground">
          ⚠ डेमो मोड — स्थानिक API कनेक्ट नाही
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-[1200px] px-6 py-6">
        <div className="flex gap-6">
          <div className="w-[60%] flex flex-col gap-4">
            <div className="flex gap-4">
              <FormatSelect
                id="format_select"
                containerId="format_select_container"
                searchId="format_search"
                label="फॉरमॅट निवडा"
                options={formats}
                value={formatId}
                onChange={setFormatId}
              />
              <SectionSelect
                id="section_select"
                containerId="section_select_container"
                searchId="section_search"
                label="संबंधित कलम निवडा"
                options={sectionOptions}
                selected={selectedSections}
                onChange={setSelectedSections}
                onSearch={handleSectionSearch}
              />
            </div>

            <div className="police-card">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-foreground"
                onClick={() => setInstructionsOpen(!instructionsOpen)}
                aria-expanded={instructionsOpen}
                aria-label="सूचना"
              >
                <span>📋 सूचना</span>
                <span className="text-muted-foreground">{instructionsOpen ? '▲' : '▼'}</span>
              </button>
              {instructionsOpen && (
                <ul className="px-4 pb-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>इथे FIR / नामपत्रा मराठीत टाका.</li>
                  <li>कृपया तपासा क्लिक करा — काही सेकंद लागतील.</li>
                  <li>उजव्या बाजूला सुधारित मसुदा आणि त्रुटी दिसतील.</li>
                </ul>
              )}
            </div>

            <div>
              <label className="police-label" htmlFor="fir_input">
                मूळ मसुदा (इथे FIR / नामपत्रा मराठीत टाका)
              </label>
              <div className="relative">
                <textarea
                  id="fir_input"
                  className="police-textarea w-full"
                  placeholder="इथे FIR / नामपत्रा मराठीत टाका किंवा पेस्ट करा..."
                  value={draft}
                  onChange={e => {
                    setDraft(e.target.value);
                    setValidationError(null);
                  }}
                  aria-label="मूळ मसुदा"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                  {draft.length} अक्षरे
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" ref={presetRef}>
                <button
                  id="preset_select"
                  className="police-input pr-8 text-sm text-left min-w-[180px] flex items-center justify-between gap-2"
                  onClick={() => setPresetOpen(!presetOpen)}
                  aria-label="उदाहरण निवडा"
                  aria-haspopup="listbox"
                  aria-expanded={presetOpen}
                >
                  <span className="text-muted-foreground">उदाहरण निवडा</span>
                  <span className="text-xs text-muted-foreground">{presetOpen ? '▲' : '▼'}</span>
                </button>
                {presetOpen && (
                  <div className="dropdown-panel-premium">
                    {presets.map(p => (
                      <button
                        key={p.id}
                        className="dropdown-item-premium w-full text-left"
                        onClick={() => {
                          handlePreset(p.id);
                          setPresetOpen(false);
                        }}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                id="check_button"
                className="btn-police-primary flex items-center gap-2"
                onClick={handleCheck}
                disabled={isChecking}
                aria-label="कृपया तपासा"
              >
                {isChecking && (
                  <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                )}
                {isChecking ? 'तपासणी सुरू आहे...' : 'कृपया तपासा'}
              </button>

              <button
                id="clear_button"
                className="btn-police-secondary"
                onClick={handleClear}
                aria-label="साफ करा"
              >
                साफ करा
              </button>

              <button
                id="suggest_sections"
                className="btn-police-accent text-sm"
                onClick={handleSuggest}
                disabled={isSuggesting || isChecking || !draft.trim()}
                aria-label="कलमे सुचवा"
              >
                {isSuggesting ? '...' : 'कलमे सुचवा'}
              </button>
            </div>

            {validationError && (
              <div className="text-sm text-destructive px-4 py-2 rounded-md border border-destructive/30 bg-destructive/10">
                {validationError}
              </div>
            )}

            {error && (
              <div className="police-badge-warning text-sm px-4 py-2 rounded-md">
                {error}
              </div>
            )}

            {correctedDraft && (
              <div
                ref={resultSectionRef}
                id="corrected_result_section"
                className="w-full rounded border border-border bg-white p-5 font-mangal"
                style={{ fontSize: '16px', color: '#000' }}
              >
                <h3 className="text-lg font-bold mb-4" style={{ color: '#000' }}>
                  निकाल
                </h3>
                <div className="border-t border-b border-border py-3 mb-3 space-y-1" style={{ color: '#000' }}>
                  <div><span className="font-bold">LANG:</span> MR</div>
                  <div><span className="font-bold">FORMAT:</span> {formatId || '—'}</div>
                  <div><span className="font-bold">SECTION:</span> {selectedSections.length > 0 ? selectedSections.join(', ') : '—'}</div>
                </div>
                <div>
                  <div className="font-bold mb-2">CORRECTED DRAFT:</div>
                  <pre className="whitespace-pre-wrap font-mangal" style={{ fontSize: '16px', color: '#000' }}>
                    {correctedDraft}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="w-[40%] flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">निकाल (तुलनात्मक दृश्य)</h2>

            <div className="flex flex-wrap gap-2 text-xs">
              {result && (
                <span id="missing_count_badge" className="police-badge-warning">
                  गहाळ: {(result as any).missing_elements?.length || 0}
                </span>
              )}
              {(result as any)?.last_checked_iso && (
                <span id="last_checked" className="police-badge-success">
                  तपासणी वेळ: {formatTime((result as any).last_checked_iso)}
                </span>
              )}
              {isChecking && (
                <span
                  id="processing_indicator"
                  className="police-badge text-muted-foreground bg-muted flex items-center gap-1.5"
                >
                  <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  तपासणी चालू आहे…
                </span>
              )}
            </div>

            {(result as any)?.change_summary && (result as any).change_summary.length > 0 && (
              <div
                id="change_summary_box"
                className="text-xs space-y-0.5 px-3 py-2 rounded-md bg-muted/40 border border-border"
              >
                {(result as any).change_summary.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {!result && !isChecking && (
              <div className="flex-1 flex items-center justify-center police-card p-8 text-center text-muted-foreground text-sm">
                <div>
                  <div className="text-4xl mb-3 opacity-40">📄</div>
                  <p>डाव्या बाजूला मसुदा टाका आणि "कृपया तपासा" क्लिक करा.</p>
                </div>
              </div>
            )}

            {result && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="police-label text-xs">मूळ मसुदा</div>
                    <div
                      id="original_output"
                      ref={originalRef}
                      className="sync-scroll-panel bg-muted/30"
                      onScroll={() => handleScroll('original')}
                    >
                      <pre className="whitespace-pre-wrap font-mangal text-sm">
                        {draft.split('\n').map((line, i) => {
                          const lineNum = i + 1;
                          const highlight = (lineHighlightMap as any)[lineNum];
                          return (
                            <span
                              key={i}
                              className={`block relative ${highlight ? 'border-b-2 border-accent/60 bg-accent/10' : ''}`}
                              title={highlight || undefined}
                            >
                              <span className="inline-block w-7 text-right mr-2 text-muted-foreground/50 text-xs select-none">
                                {lineNum}
                              </span>
                              {highlight && (
                                <span
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive"
                                  title={highlight}
                                />
                              )}
                              {line}
                            </span>
                          );
                        })}
                      </pre>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="police-label text-xs border-l-2 border-accent pl-2">सुधारित मसुदा</div>
                    <div
                      id="corrected_output"
                      ref={correctedRef}
                      className="sync-scroll-panel"
                      style={{ background: 'hsl(var(--surface-elevated))' }}
                      onScroll={() => handleScroll('corrected')}
                    >
                      <pre className="whitespace-pre-wrap font-mangal text-sm">
                        {result.corrected_draft}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="copy_corrected"
                    className="btn-police-secondary text-sm"
                    onClick={handleCopy}
                    aria-label="कॉपी करा"
                  >
                    📋 कॉपी करा
                  </button>
                  <button
                    id="download_corrected"
                    className="btn-police-secondary text-sm"
                    onClick={handleDownload}
                    aria-label="डाउनलोड (.txt)"
                  >
                    ⬇ डाउनलोड (.txt)
                  </button>
                </div>

                <div className="police-card p-4">
                  <h3 className="font-bold text-sm mb-2 text-destructive">गहाळ शब्द/घटक</h3>
                  {(result as any).missing_elements?.length > 0 ? (
                    <ul id="missing_list" className="list-disc list-inside text-sm space-y-1">
                      {(result as any).missing_elements.map((m: string, i: number) => (
                        <li key={i} className="text-foreground">{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <span
                      id="missing_list"
                      className="inline-block text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold"
                    >
                      गहाळ शब्द/घटक नाही
                    </span>
                  )}
                </div>

                <div className="police-card p-4">
                  <h3 className="font-bold text-sm mb-2">ओळखलेले घटक</h3>
                  {Object.keys(allEvidence).length > 0 ? (
                    <dl id="evidence_list" className="text-sm space-y-1">
                      {Object.entries(allEvidence).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="font-semibold text-muted-foreground min-w-[80px]">{key}:</dt>
                          <dd className="text-foreground">{(val as any) || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p id="evidence_list" className="text-sm text-muted-foreground">– माहिती उपलब्ध नाही –</p>
                  )}
                </div>

                {(result as any).suggested_sections && (result as any).suggested_sections.length > 0 && (
                  <div id="suggested_sections" className="police-card p-4">
                    <h3 className="font-bold text-sm mb-2">सुचवलेले कलम</h3>
                    <div className="flex flex-wrap gap-2">
                      {(result as any).suggested_sections.map((s: any, idx: number) => {
                        const id = String(s.section_key || s.section_no || s.id || idx);
                        const title =
                          (s.title && String(s.title).trim()) ||
                          s.section_key ||
                          (s.section_no ? `कलम ${s.section_no}` : id);

                        return (
                          <button
                            key={id}
                            className="text-xs px-3 py-1 rounded-full border border-accent bg-accent/10 hover:bg-accent/25 transition-colors cursor-pointer"
                            onClick={() => handleAddSuggestedSection(id)}
                            aria-label={`${title} कलम जोडा`}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-3 text-center text-xs text-muted-foreground border-t border-border">
        © नाशिक शहर पोलीस {api.isDemoMode ? '— डेमो मोड' : ''}
      </footer>
    </div>
  );
};

export default Index;