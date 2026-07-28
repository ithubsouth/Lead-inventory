import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Search } from 'lucide-react';
import { APP_TABS, ALL_TAB_KEYS } from '@/lib/appTabs';

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  /** Administrators / Super Admin always get everything */
  fullAccess?: boolean;
}

export default function TabAccessSelect({ value, onChange, disabled, fullAccess }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const options = useMemo(
    () => APP_TABS.filter((t) => t.label.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  const allSelected = value.length === ALL_TAB_KEYS.length;

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  if (fullAccess) {
    return (
      <div className='text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/40'>
        Administrators and Super Admins always have access to <strong>all tabs</strong>.
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          className='w-full justify-between font-normal text-sm'
        >
          <span className='truncate'>
            {value.length === 0
              ? 'Asset Master only (default)'
              : allSelected
              ? 'All tabs'
              : `${value.length} tab${value.length > 1 ? 's' : ''} selected`}
          </span>
          <ChevronDown className='w-4 h-4 opacity-50 shrink-0' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[320px] p-0' align='start'>
        <div className='p-2 border-b relative'>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search tabs...'
            className='h-8 text-xs pr-8'
          />
          <Search className='absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground' />
        </div>
        <div className='flex items-center justify-between px-3 py-2 border-b'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
            Tab Access
          </span>
          <button
            type='button'
            className='text-xs text-primary hover:underline'
            onClick={() => onChange(allSelected ? [] : [...ALL_TAB_KEYS])}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className='max-h-64 overflow-y-auto p-1'>
          {options.length === 0 && (
            <div className='px-3 py-6 text-center text-xs text-muted-foreground'>No tabs found</div>
          )}
          {options.map((t) => (
            <label
              key={t.key}
              className='flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer'
            >
              <Checkbox checked={value.includes(t.key)} onCheckedChange={() => toggle(t.key)} />
              <span className='text-sm flex-1'>{t.label}</span>
              {t.deniedRoles?.length ? (
                <Badge variant='outline' className='text-[9px]'>
                  not for {t.deniedRoles.join('/')}
                </Badge>
              ) : null}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
