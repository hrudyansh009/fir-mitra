import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormatOption, SectionOption, PresetOption } from '@/hooks/useMockApi';

interface SearchableSelectProps {
  id: string;
  containerId: string;
  searchId: string;
  label: string;
  options: FormatOption[];
  value: string | null;
  onChange: (val: string) => void;
  renderOption?: (opt: FormatOption) => React.ReactNode;
}

export function FormatSelect({
  id, containerId, searchId, label, options, value, onChange
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    o => o.title.toLowerCase().includes(search.toLowerCase()) ||
         o.description.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(o => o.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && focusIdx >= 0 && filtered[focusIdx]) {
      onChange(filtered[focusIdx].id);
      setOpen(false);
      setSearch('');
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div id={containerId} className="relative flex-1" ref={ref}>
      <label className="police-label" htmlFor={searchId}>{label}</label>
      <input
        id={searchId}
        className="police-input"
        placeholder={selected ? selected.title : 'शोधा...'}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); setFocusIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        aria-label={label}
        autoComplete="off"
      />
      {open && (
        <div className="dropdown-panel" role="listbox" id={id}>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-sm">काहीही सापडले नाही</div>
          )}
          {filtered.map((o, i) => (
            <div
              key={o.id}
              role="option"
              aria-selected={value === o.id}
              className={`dropdown-item ${i === focusIdx ? 'dropdown-item-active' : ''} ${value === o.id ? 'font-bold' : ''}`}
              onClick={() => { onChange(o.id); setOpen(false); setSearch(''); }}
            >
              <div className="font-semibold text-sm">{o.title}</div>
              <div className="text-xs text-muted-foreground">{o.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionSelectProps {
  id: string;
  containerId: string;
  searchId: string;
  label: string;
  options: SectionOption[];
  selected: string[];
  onChange: (val: string[]) => void;
  onSearch: (q: string) => void;
}

export function SectionSelect({
  id, containerId, searchId, label, options, selected, onChange, onSearch
}: SectionSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (q: string) => {
    setSearch(q);
    onSearch(q);
    setOpen(true);
  };

  const toggle = (secId: string) => {
    if (selected.includes(secId)) onChange(selected.filter(s => s !== secId));
    else onChange([...selected, secId]);
  };

  return (
    <div id={containerId} className="relative flex-1" ref={ref}>
      <label className="police-label" htmlFor={searchId}>{label}</label>
      <input
        id={searchId}
        className="police-input"
        placeholder="कलम शोधा..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        aria-label={label}
        autoComplete="off"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(sid => {
            const sec = options.find(o => o.section_id === sid);
            return sec ? (
              <span key={sid} className="police-badge-success text-xs flex items-center gap-1">
                {sec.display} ({sec.statute})
                <button
                  onClick={() => toggle(sid)}
                  className="ml-0.5 hover:opacity-70"
                  aria-label={`${sec.display} काढा`}
                >×</button>
              </span>
            ) : null;
          })}
        </div>
      )}
      {open && (
        <div className="dropdown-panel" role="listbox" id={id}>
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
            सर्वात वापरलेले कलम शीर्षस्थानी दिसतील
          </div>
          {options.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-sm">काहीही सापडले नाही</div>
          )}
          {options.map(o => (
            <div
              key={o.section_id}
              role="option"
              aria-selected={selected.includes(o.section_id)}
              className={`dropdown-item flex items-center gap-2 ${selected.includes(o.section_id) ? 'font-bold' : ''}`}
              onClick={() => toggle(o.section_id)}
            >
              <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs
                ${selected.includes(o.section_id) ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                {selected.includes(o.section_id) && '✓'}
              </span>
              <div>
                <span className="text-sm font-semibold">{o.display}</span>
                <span className="text-xs text-muted-foreground ml-2">{o.statute}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
