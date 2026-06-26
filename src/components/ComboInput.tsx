import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { useCustomOptions } from '@/hooks/useCustomOptions';

interface ComboInputProps {
  fieldKey: string;                 // unique key used to persist customs
  baseOptions: string[];            // built-in choices from constants
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowAdd?: boolean;                // default true
  showArrow?: boolean;               // NEW: default true
  className?: string;
  style?: React.CSSProperties;
}

export const ComboInput: React.FC<ComboInputProps> = ({
  fieldKey, baseOptions, value, onChange,
  placeholder = 'Type or select', allowAdd = true, showArrow = true, className, style,
}) => {
  const { extras, addOption, removeOption, updateOption } = useCustomOptions(fieldKey);
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

  const handleEdit = async (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    const newValue = window.prompt('Edit option:', opt);
    if (newValue && newValue.trim() && newValue.trim() !== opt) {
      const res = await updateOption(opt, newValue.trim());
      if (res.ok && value === opt) {
        onChange(newValue.trim());
      } else if (!res.ok) {
        alert(`Error: ${res.reason}`);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${opt}"?`)) {
      const res = await removeOption(opt);
      if (res.ok && value === opt) {
        onChange('');
        setQuery('');
      } else if (!res.ok) {
        alert(`Error: ${res.reason}`);
      }
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canAdd) handleAdd();
      else if (filtered[0]) commit(filtered[0]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} className={`relative w-full ${className || ''}`} style={style}>
      <div className="flex items-center w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden"
           style={{ height: '40px', minHeight: '40px' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          className="flex-1 w-full px-3 py-2 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          style={{ height: '100%' }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); }}
            className="px-1 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer flex-shrink-0" aria-label="Clear">
            <X size={14} />
          </button>
        )}
        {showArrow && (
          <button type="button" onClick={() => setOpen(o => !o)}
            className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer flex-shrink-0 border-l border-input" aria-label="Toggle">
            <ChevronDown size={16} />
          </button>
        )}
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
                borderBottom: '1px solid #f3f4f6', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none' }}>
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
              <div key={opt} style={{ display: 'flex', alignItems: 'center', background: opt === value ? '#eff6ff' : 'transparent' }}>
                <button type="button" onClick={() => commit(opt)}
                  style={{ flex: 1, display: 'block', padding: '8px 10px', fontSize: 13, textAlign: 'left',
                    color: '#111827', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  {opt}
                </button>
                {isCustom && (
                  <div style={{ display: 'flex', paddingRight: 4 }}>
                    <button type="button" onClick={(e) => handleEdit(e, opt)}
                      style={{ padding: '4px', color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Edit">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" onClick={(e) => handleDelete(e, opt)}
                      style={{ padding: '4px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComboInput;
