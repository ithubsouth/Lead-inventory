import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Delay before the (expensive) table filter runs. Typing itself is never delayed. */
  debounceMs?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Search box that keeps its own text state so every keystroke renders instantly,
 * and only tells the parent after the user pauses. Filtering thousands of rows on
 * each keystroke was what made typing feel laggy in the tables.
 * Press Escape or the × button to clear.
 */
export const SearchInput = ({
  id,
  value,
  onChange,
  placeholder,
  debounceMs = 200,
  style,
  className,
}: SearchInputProps) => {
  const [text, setText] = useState(value);
  const timer = useRef<number>();
  const lastSent = useRef(value);

  // Follow outside changes (e.g. "Clear filters") without fighting the user's typing.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const push = (next: string, immediate = false) => {
    window.clearTimeout(timer.current);
    const send = () => {
      lastSent.current = next;
      onChange(next);
    };
    if (immediate) send();
    else timer.current = window.setTimeout(send, debounceMs);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Input
        id={id}
        type='search'
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          push(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') push(text, true);
          if (e.key === 'Escape' && text) {
            e.preventDefault();
            setText('');
            push('', true);
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder || 'Search'}
        className={`[&::-webkit-search-cancel-button]:hidden ${className || ''}`}
        style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 28px 6px 8px', height: '28px', ...style }}
      />
      {text ? (
        <button
          type='button'
          onClick={() => {
            setText('');
            push('', true);
          }}
          aria-label='Clear search'
          title='Clear search'
          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
        >
          <X style={{ width: '13px', height: '13px' }} />
        </button>
      ) : (
        <Search style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: '#6b7280', pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default SearchInput;
