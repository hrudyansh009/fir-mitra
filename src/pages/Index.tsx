import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import EmergencyStrip from '@/components/EmergencyStrip';
import Header from '@/components/Header';
import { FormatSelect, SectionSelect } from '@/components/Selectors';
import { useMockApi } from '@/hooks/useMockApi';
import type { CheckResult, SectionOption } from '@/hooks/useMockApi';

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
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(true);

  // Close preset dropdown on outside click
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

  // Sync scroll
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
    if (!draft.trim()) return;
    setIsChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.checkDraft(draft, formatId || 'fmt-01', selectedSections);
      setResult(res);
      setLastChecked(new Date().toLocaleTimeString('mr-IN'));
      // Auto-suggest sections from result
      if (res.suggested_sections.length > 0) {
        const newSecs = res.suggested_sections.map(s => s.section_id);
        setSelectedSections(prev => [...new Set([...prev, ...newSecs])]);
      }
    } catch {
      setError('त्रुटी — नेटवर्क समस्या. कृपया नंतर प्रयत्न करा.');
    } finally {
      setIsChecking(false);
    }
  }, [draft, formatId, selectedSections, api]);

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
    setError(null);
    setLastChecked(null);
  }, []);

  const handlePreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setDraft(preset.draft);
      setFormatId(preset.format_id);
      setSelectedSections(preset.sections);
      setResult(null);
    }
  }, [presets]);

  const handleCopy = useCallback(() => {
    if (result?.corrected_draft) {
      navigator.clipboard.writeText(result.corrected_draft);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result?.corrected_draft) return;
    const blob = new Blob([result.corrected_draft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'सुधारित_मसुदा.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EmergencyStrip />
      <Header />

      <main className="flex-1 mx-auto w-full max-w-[1200px] px-6 py-6">
        <div className="flex gap-6">
          {/* LEFT COLUMN - INPUT */}
          <div className="w-[60%] flex flex-col gap-4">
            {/* Selectors row */}
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

            {/* Instructions */}
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
                  <li>उजव्या बाजूला सुधारित मसुदा दिसेल — कॉपी किंवा डाउनलोड करा.</li>
                </ul>
              )}
            </div>

            {/* Textarea */}
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
                  onChange={e => setDraft(e.target.value)}
                  aria-label="मूळ मसुदा"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                  {draft.length} अक्षरे
                </span>
              </div>
            </div>

            {/* Control row */}
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
                        onClick={() => { handlePreset(p.id); setPresetOpen(false); }}
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
                disabled={isChecking || !draft.trim()}
                aria-label="कृपया तपासा"
              >
                {isChecking && (
                  <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                )}
                {isChecking ? 'तपासणी चालू आहे…' : 'कृपया तपासा'}
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

            {error && (
              <div className="police-badge-warning text-sm px-4 py-2 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - RESULTS */}
          <div className="w-[40%] flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">निकाल (तुलनात्मक दृश्य)</h2>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {result && (
                <span id="missing_count_badge" className="police-badge-warning">
                  गहाळ: {result.missing_elements.length}
                </span>
              )}
              {lastChecked && (
                <span id="last_checked" className="police-badge-success">
                  शेवटची तपासणी: {lastChecked}
                </span>
              )}
              {isChecking && (
                <span id="processing_indicator" className="police-badge text-muted-foreground bg-muted">
                  तपासणी चालू आहे…
                </span>
              )}
            </div>

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
                {/* Comparison panels */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="police-label text-xs">मूळ मसुदा</div>
                    <div
                      id="original_output"
                      ref={originalRef}
                      className="sync-scroll-panel bg-muted/30"
                      onScroll={() => handleScroll('original')}
                    >
                      <pre className="whitespace-pre-wrap font-mangal text-sm">{draft}</pre>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="police-label text-xs">सुधारित मसुदा</div>
                    <div
                      id="corrected_output"
                      ref={correctedRef}
                      className="sync-scroll-panel"
                      style={{ background: 'hsl(var(--surface-elevated))' }}
                      onScroll={() => handleScroll('corrected')}
                    >
                      <pre className="whitespace-pre-wrap font-mangal text-sm">
                        {result.corrected_draft.split('\n').map((line, i) =>
                          line.startsWith('[') ? (
                            <span key={i} className="highlight-missing block">{line}</span>
                          ) : (
                            <span key={i} className="block">{line}</span>
                          )
                        )}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
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

                {/* Missing elements */}
                {result.missing_elements.length > 0 && (
                  <div className="police-card p-4">
                    <h3 className="font-bold text-sm mb-2 text-destructive">गहाळ घटक</h3>
                    <ul id="missing_list" className="list-disc list-inside text-sm space-y-1">
                      {result.missing_elements.map((m, i) => (
                        <li key={i} className="text-foreground">{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence */}
                {Object.keys(result.evidence).length > 0 && (
                  <div className="police-card p-4">
                    <h3 className="font-bold text-sm mb-2">ओळखलेले घटक</h3>
                    <dl id="evidence_list" className="text-sm space-y-1">
                      {Object.entries(result.evidence).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="font-semibold text-muted-foreground min-w-[80px]">{key}:</dt>
                          <dd className="text-foreground">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t border-border">
        © नाशिक शहर पोलीस — डेमो मोड
      </footer>
    </div>
  );
};

export default Index;
