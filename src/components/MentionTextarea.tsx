import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface MentionUser {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

/** Extract @mentioned emails from a body of text. */
export const extractMentions = (text: string): string[] => {
  const matches = text.match(/@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
};

export default function MentionTextarea({ value, onChange, placeholder, disabled, rows = 3 }: Props) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, department')
        .order('email');
      if (!cancelled) setUsers((data as MentionUser[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    return users
      .filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [users, query]);

  const handleChange = (next: string) => {
    onChange(next);
    const caret = ref.current?.selectionStart ?? next.length;
    const upto = next.slice(0, caret);
    const m = upto.match(/@([^\s@]*(?:@[^\s]*)?)$/);
    if (m) {
      setQuery(m[1] || '');
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const pick = (u: MentionUser) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const upto = value.slice(0, caret);
    const rest = value.slice(caret);
    const replaced = upto.replace(/@([^\s@]*(?:@[^\s]*)?)$/, `@${u.email} `);
    onChange(replaced + rest);
    setOpen(false);
    setTimeout(() => el?.focus(), 0);
  };

  return (
    <div className='relative'>
      <Textarea
        ref={ref}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className='absolute z-50 bottom-full mb-1 left-0 w-80 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl'>
          <div className='px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b'>
            Tag a teammate
          </div>
          {suggestions.map((u) => (
            <button
              key={u.id}
              type='button'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(u)}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex flex-col'
              )}
            >
              <span className='text-xs font-bold text-slate-700'>{u.full_name || u.email}</span>
              <span className='text-[10px] text-slate-400'>
                {u.email} · {u.department || 'General'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
