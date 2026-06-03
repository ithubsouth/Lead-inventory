import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { History, Search, RotateCcw, ChevronRight, Clock, Loader2 } from 'lucide-react';

interface RecordResult {
  id: string;
  table_name: 'devices' | 'orders';
  label: string;
  sublabel: string;
}

interface HistoryEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  old_data: any;
  new_data: any;
  created_at: string;
  changed_by: string | null;
  updated_by: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted']);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

const fmtDay = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

const stringify = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v).trim();
  return s === 'null' || s === 'undefined' ? '' : s;
};

export const VersionHistoryDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { canMutate } = useUserRole();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RecordResult[]>([]);
  const [selected, setSelected] = useState<RecordResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loadingHist, setLoadingHist] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setHistory([]);
      setSelectedVersionId(null);
    }
  }, [open]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    setHistory([]);
    try {
      const q = query.trim();
      const [{ data: dev }, { data: ord }] = await Promise.all([
        supabase.from('devices').select('id,serial_number,sales_order,model,asset_type').or(`serial_number.ilike.%${q}%,sales_order.ilike.%${q}%`).limit(25),
        supabase.from('orders').select('id,sales_order,model,asset_type,quantity').ilike('sales_order', `%${q}%`).limit(25),
      ]);
      const list: RecordResult[] = [];
      (dev || []).forEach((d: any) =>
        list.push({ id: d.id, table_name: 'devices', label: d.serial_number || '—', sublabel: `${d.asset_type || ''} • ${d.model || ''} • SO: ${d.sales_order || '—'}` })
      );
      (ord || []).forEach((o: any) =>
        list.push({ id: o.id, table_name: 'orders', label: `Order: ${o.sales_order}`, sublabel: `${o.asset_type || ''} • ${o.model || ''} • Qty: ${o.quantity ?? 0}` })
      );
      setResults(list);
    } finally {
      setSearching(false);
    }
  };

  const loadHistory = async (rec: RecordResult) => {
    setSelected(rec);
    setLoadingHist(true);
    setSelectedVersionId(null);
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('record_id', rec.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data as HistoryEntry[]) || [];
      setHistory(rows);
      if (rows.length) setSelectedVersionId(rows[0].id);

      const ids = Array.from(new Set(rows.map(r => r.changed_by || r.updated_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: users } = await supabase.from('users').select('id,email,full_name').in('id', ids);
        const m: Record<string, string> = {};
        users?.forEach((u: any) => (m[u.id] = u.full_name || u.email || u.id));
        setUserMap(m);
      }
    } catch (e: any) {
      toast({ title: 'Failed to load history', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingHist(false);
    }
  };

  const selectedVersion = useMemo(() => history.find(h => h.id === selectedVersionId) || null, [history, selectedVersionId]);

  const diffs = useMemo(() => {
    if (!selectedVersion) return [] as Array<{ field: string; prev: string; curr: string }>;
    const oldD = selectedVersion.old_data || {};
    const newD = selectedVersion.new_data || {};
    const keys = new Set([...Object.keys(oldD), ...Object.keys(newD)]);
    return Array.from(keys)
      .filter(k => !HIDDEN_FIELDS.has(k))
      .map(k => ({ field: k, prev: stringify(oldD[k]), curr: stringify(newD[k]) }))
      .filter(d => d.prev !== d.curr);
  }, [selectedVersion]);

  const handleRestore = async () => {
    if (!selectedVersion || !selected) return;
    if (!canMutate) {
      toast({ title: 'Not allowed', description: 'You do not have permission to restore.', variant: 'destructive' });
      return;
    }
    const oldD = selectedVersion.old_data;
    if (!oldD || typeof oldD !== 'object') {
      toast({ title: 'Cannot restore', description: 'This entry has no previous snapshot to restore.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Restore ${selected.label} to the version from ${fmtDate(selectedVersion.created_at)}?`)) return;

    setRestoring(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(oldD).forEach(([k, v]) => {
        if (HIDDEN_FIELDS.has(k)) return;
        payload[k] = v;
      });
      const { error } = await supabase.from(selected.table_name as any).update(payload).eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'Version restored', description: `${selected.label} reverted successfully.` });
      await loadHistory(selected);
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  // Group history by day
  const grouped = useMemo(() => {
    const g: Record<string, HistoryEntry[]> = {};
    history.forEach(h => {
      const d = fmtDay(h.created_at);
      (g[d] ||= []).push(h);
    });
    return g;
  }, [history]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 gap-0 h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-5 h-5 text-primary" />
            Version History
            {selected && <Badge variant="secondary" className="ml-2 font-mono text-xs">{selected.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by Serial Number or Sales Order..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                  className="pr-9"
                  autoFocus
                />
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button onClick={runSearch} disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-lg">
              {results.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  {searching ? 'Searching...' : 'Enter a serial number or sales order to view its version history.'}
                </div>
              ) : (
                <div className="divide-y">
                  {results.map(r => (
                    <button
                      key={`${r.table_name}-${r.id}`}
                      onClick={() => loadHistory(r)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{r.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase">{r.table_name}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: changes */}
            <div className="flex-1 overflow-hidden flex flex-col border-r">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                <div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setHistory([]); }} className="-ml-2 mb-1 h-7 text-xs">
                    ← Back to search
                  </Button>
                  <div className="text-lg font-bold">Changes in this version</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{diffs.length} field{diffs.length === 1 ? '' : 's'} modified</Badge>
                  {canMutate && selectedVersion && selectedVersion.old_data && (
                    <Button onClick={handleRestore} disabled={restoring} className="bg-primary hover:bg-primary/90 rounded-full">
                      {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                      Restore this version
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-3">
                  {loadingHist ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">Loading...</div>
                  ) : !selectedVersion ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No version selected</div>
                  ) : diffs.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No field changes in this version.</div>
                  ) : (
                    diffs.map(d => (
                      <div key={d.field} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{d.field.replace(/_/g, ' ')}</div>
                          <div className="ml-auto text-[11px] text-muted-foreground">{fmtDate(selectedVersion.created_at)}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-red-500 mb-1">Previous</div>
                            <div className="border border-red-200 bg-red-50/50 rounded-md px-3 py-2 text-sm text-red-700 break-all min-h-[36px]">
                              {d.prev || <span className="italic text-red-300">Empty</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Current</div>
                            <div className="border border-emerald-200 bg-emerald-50/50 rounded-md px-3 py-2 text-sm text-emerald-700 break-all min-h-[36px]">
                              {d.curr || <span className="italic text-emerald-400">Empty</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: timeline */}
            <div className="w-80 shrink-0 flex flex-col bg-muted/20">
              <div className="px-5 py-4 border-b">
                <div className="text-base font-bold">Version history</div>
                <div className="text-xs text-muted-foreground mt-0.5">{history.length} versions</div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {Object.entries(grouped).map(([day, items]) => (
                    <div key={day}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">{day}</div>
                      <div className="space-y-1">
                        {items.map(h => {
                          const active = h.id === selectedVersionId;
                          const userId = h.changed_by || h.updated_by || '';
                          const user = userMap[userId] || userId || 'system';
                          return (
                            <button
                              key={h.id}
                              onClick={() => setSelectedVersionId(h.id)}
                              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors border ${
                                active ? 'bg-primary/10 border-primary/30' : 'bg-card border-transparent hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">
                                  {new Date(h.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                                {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="text-xs text-muted-foreground truncate">{user}</div>
                                <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 h-4">{h.operation}</Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {!loadingHist && history.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">No version history.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryDialog;
