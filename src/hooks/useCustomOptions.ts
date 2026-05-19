import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache shared across mounts to avoid re-fetching
const cache: Record<string, string[]> = {};
const listeners: Record<string, Set<() => void>> = {};

const notify = (key: string) => listeners[key]?.forEach(l => l());

export function useCustomOptions(fieldKey: string) {
  const [extras, setExtras] = useState<string[]>(cache[fieldKey] || []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('custom_options')
      .select('value')
      .eq('field_key', fieldKey)
      .order('value');
    const values = (data || []).map((r: any) => r.value);
    cache[fieldKey] = values;
    notify(fieldKey);
  }, [fieldKey]);

  useEffect(() => {
    listeners[fieldKey] ||= new Set();
    const cb = () => setExtras([...(cache[fieldKey] || [])]);
    listeners[fieldKey].add(cb);
    if (!cache[fieldKey]) load(); else cb();
    return () => { listeners[fieldKey]?.delete(cb); };
  }, [fieldKey, load]);

  const addOption = useCallback(async (value: string) => {
    const v = value.trim();
    if (!v) return;
    if ((cache[fieldKey] || []).includes(v)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('custom_options')
      .insert({ field_key: fieldKey, value: v, created_by: user?.email || null });
    if (!error) {
      cache[fieldKey] = [...(cache[fieldKey] || []), v].sort();
      notify(fieldKey);
    }
  }, [fieldKey]);

  return { extras, addOption };
}
