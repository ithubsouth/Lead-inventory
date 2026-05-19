import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useCustomOptions } from '@/hooks/useCustomOptions';

interface ComboInputProps {
  fieldKey: string;                 // unique key used to persist customs
  baseOptions: string[];            // built-in choices from constants
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowAdd?: boolean;                // default true
  className?: string;
  style?: React.CSSProperties;
}

export const ComboInput: React.FC<ComboInputProps> = ({
  fieldKey, baseOptions, value, onChange,
  placeholder = 'Type or select', allowAdd = true, className, style,
}) => {
  const { extras, addOption } = useCustomOptions(fieldKey);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const all = Array.from(new Set([...baseOptions, ...extras]));
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter(o => o.toLowerCase().includes(q)) : all;
  const exists = all.some(o => o.toLowerCase() === q);
  const canAdd = allowAdd && q.length > 0 && !exists;

  const commit = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  const handleAdd = async () => {
    const v = query.trim();
    if (!v) return;
    await addOption(v);
    commit(v);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canAdd) handleAdd();
      else if (filtered[0]) commit(filtered[0]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} className={className} style={{ position: 'relative', ...style }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: '1px solid #d1d5db', borderRadius: 4, background: '#fff',
      }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          style={{ flex: 1, padding: '8px', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', borderRadius: 4 }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); }}
            style={{ padding: '0 6px', color: '#9ca3af' }} aria-label="Clear">
            <X size={14} />
          </button>
        )}
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ padding: '0 8px', color: '#6b7280' }} aria-label="Toggle">
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
          marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          {canAdd && (
            <button type="button" onClick={handleAdd}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 10px', fontSize: 13, color: '#2563eb', fontWeight: 500,
                borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}>
              <Plus size={14} /> Add "{query.trim()}"
            </button>
          )}
          {filtered.length === 0 && !canAdd && (
            <div style={{ padding: '10px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              No matches
            </div>
          )}
          {filtered.map(opt => {
            const isCustom = extras.includes(opt) && !baseOptions.includes(opt);
            return (
              <button type="button" key={opt} onClick={() => commit(opt)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between',
                  padding: '8px 10px', fontSize: 13, textAlign: 'left',
                  background: opt === value ? '#eff6ff' : 'transparent',
                  color: '#111827' }}>
                <span>{opt}</span>
                {isCustom && <span style={{ fontSize: 10, color: '#6b7280' }}>custom</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComboInput;
