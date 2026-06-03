import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { History, Search, RotateCcw, ChevronRight, Clock, Loader2, X } from 'lucide-react';

interface RecordResult {
  id: string;
  table_name: 'devices' | 'orders';
  label: string;
  sublabel: string;
  primary: string; // serial number or sales order to show as card title
}

interface HistoryEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  field_name?: string | null;
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

const fmtHeaderDate = (s: string) =>
  new Date(s).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

const fmtShortTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const fmtDay = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

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
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [showUnmodified, setShowUnmodified] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setHistory([]);
      setSelectedVersionId(null);
    } else {
      runSearch(true);
    }
  }, [open]);

  const runSearch = async (forceAll = false) => {
    const q = query.trim();
    if (!q && !forceAll) return;
    setSearching(true);
    setSelected(null);
    setHistory([]);
    try {
      const deviceQuery = supabase.from('devices').select('id,serial_number,sales_order,model,asset_type').limit(25);
      if (q) {
        deviceQuery.or(`serial_number.ilike.%${q}%,sales_order.ilike.%${q}%`);
      }
      const orderQuery = supabase.from('orders').select('id,sales_order,model,asset_type,quantity').limit(25);
      if (q) {
        orderQuery.ilike('sales_order', `%${q}%`);
      }
      const [{ data: dev }, { data: ord }] = await Promise.all([deviceQuery, orderQuery]);
      const list: RecordResult[] = [];
      (dev || []).forEach((d: any) =>
        list.push({
          id: d.id, table_name: 'devices',
          label: d.serial_number || '—',
          sublabel: `${d.asset_type || ''} • ${d.model || ''} • SO: ${d.sales_order || '—'}`,
          primary: d.serial_number || d.sales_order || '—',
        })
      );
      (ord || []).forEach((o: any) =>
        list.push({
          id: o.id, table_name: 'orders',
          label: `Order: ${o.sales_order}`,
          sublabel: `${o.asset_type || ''} • ${o.model || ''} • Qty: ${o.quantity ?? 0}`,
          primary: o.sales_order || '—',
        })
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
      const seen = new Set<string>();
      const uniqueRows = rows.filter(r => {
        const key = `${r.table_name}|${r.record_id}|${r.operation}|${r.field_name || ''}|${stringify(r.old_data)}|${stringify(r.new_data)}|${r.created_at}|${r.changed_by || ''}|${r.updated_by || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setHistory(uniqueRows);
      if (uniqueRows.length) setSelectedVersionId(uniqueRows[0].id);

      const ids = Array.from(new Set(uniqueRows.map(r => r.changed_by || r.updated_by).filter(Boolean))) as string[];
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

  const filteredHistory = useMemo(() => {
    if (versionFilter === 'all') return history;
    return history.filter(h => h.operation === versionFilter);
  }, [history, versionFilter]);

  const selectedVersion = useMemo(() => history.find(h => h.id === selectedVersionId) || null, [history, selectedVersionId]);

  const selectedVersionUser = useMemo(() => {
    if (!selectedVersion) return 'system';
    const userId = selectedVersion.changed_by || selectedVersion.updated_by || '';
    return userMap[userId] || userId || 'system';
  }, [selectedVersion, userMap]);

  const rows = useMemo(() => {
    if (!selectedVersion) return [] as Array<{ field: string; prev: string; curr: string; changed: boolean }>;

    const makeRow = (field: string, prev: any, curr: any) => {
      const prevText = stringify(prev);
      const currText = stringify(curr);
      return { field, prev: prevText, curr: currText, changed: prevText !== currText };
    };

    const oldD = selectedVersion.old_data;
    const newD = selectedVersion.new_data;
    const isObject = (val: any): val is Record<string, any> => typeof val === 'object' && val !== null && !Array.isArray(val);

    let all: Array<{ field: string; prev: string; curr: string; changed: boolean }> = [];

    if (isObject(oldD) || isObject(newD)) {
      const oldObj = isObject(oldD) ? oldD : {};
      const newObj = isObject(newD) ? newD : {};
      const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      all = Array.from(keys)
        .filter(k => !HIDDEN_FIELDS.has(k))
        .map(k => makeRow(k.replace(/_/g, ' '), oldObj[k], newObj[k]));
    } else if (selectedVersion.field_name) {
      all = [makeRow(selectedVersion.field_name.replace(/_/g, ' '), oldD, newD)];
    } else {
      all = [makeRow('details', oldD, newD)];
    }

    return showUnmodified ? all : all.filter(r => r.changed);
  }, [selectedVersion, showUnmodified]);

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
    if (!confirm(`Restore ${selected.label} to the version from ${fmtHeaderDate(selectedVersion.created_at)}?`)) return;

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

  // Group history by day for timeline
  const grouped = useMemo(() => {
    const g: Record<string, HistoryEntry[]> = {};
    filteredHistory.forEach(h => {
      const d = fmtDay(h.created_at);
      (g[d] ||= []).push(h);
    });
    return g;
  }, [filteredHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 gap-0 h-[85vh] flex flex-col overflow-hidden bg-slate-50">
        {!selected ? (
          <>
            <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl font-bold">
                <History className="w-5 h-5 text-primary" />
                Version History
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by Serial Number or Sales Order..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    className="pr-9 h-11 rounded-full bg-white"
                    autoFocus
                  />
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button onClick={runSearch} disabled={searching || !query.trim()} className="rounded-full h-11 px-6">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              <ScrollArea className="flex-1 border rounded-lg bg-white">
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
          </>
        ) : (
          <>
            {/* Top bar */}
            <div className="px-5 py-3 border-b bg-white flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setSelected(null); setHistory([]); setSelectedVersionId(null); }}
                className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Back"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-foreground">
                  {selected?.label ?? 'Version history'}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{selected?.sublabel}</span>
                  {selectedVersion && (
                    <>
                      <span className="h-4 w-px bg-border/80" />
                      <span>{fmtHeaderDate(selectedVersion.created_at)}</span>
                      <span className="h-4 w-px bg-border/80" />
                      <span>{selectedVersionUser}</span>
                    </>
                  )}
                </div>
              </div>
              {canMutate && selectedVersion && selectedVersion.old_data && (
                <Button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="rounded-full h-9 px-5 ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                >
                  {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Restore this version
                </Button>
              )}
              <div className="ml-auto w-9 h-9 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
                <History className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left: change cards */}
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-3">
                  {loadingHist ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">Loading...</div>
                  ) : !selectedVersion ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No version selected</div>
                  ) : rows.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No field changes in this version.</div>
                  ) : (
                    rows.map(d => {
                      const dim = highlightChanges && !d.changed;
                      return (
                        <div key={d.field} className={`bg-white border rounded-xl p-5 shadow-sm ${dim ? 'opacity-50' : ''}`}>
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-primary font-bold text-base leading-tight">{selected.primary}</div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                                {d.field.replace(/_/g, ' ')}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">{fmtTime(selectedVersion.created_at)}</div>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                            <div>
                              <div className="text-[10px] font-bold uppercase text-red-500 mb-1.5 tracking-wider">Previous</div>
                              <div className="border border-red-200 bg-red-50/60 rounded-md px-3 py-2.5 text-sm text-red-700 break-all min-h-[40px]">
                                {d.prev || <span className="italic text-red-300">Empty</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-5" />
                            <div>
                              <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1.5 tracking-wider">Current</div>
                              <div className="border border-emerald-200 bg-emerald-50/60 rounded-md px-3 py-2.5 text-sm text-emerald-700 break-all min-h-[40px]">
                                {d.curr || <span className="italic text-emerald-400">Empty</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Right: timeline */}
              <div className="w-80 shrink-0 flex flex-col bg-white border-l">
                <div className="px-5 py-4 border-b space-y-3">
                  <div className="text-lg font-bold">Version history</div>
                  <Select value={versionFilter} onValueChange={setVersionFilter}>
                    <SelectTrigger className="h-9 bg-muted/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All versions</SelectItem>
                      <SelectItem value="INSERT">Created</SelectItem>
                      <SelectItem value="UPDATE">Updated</SelectItem>
                      <SelectItem value="DELETE">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
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
                                  active ? 'bg-primary/10 border-primary/30' : 'bg-transparent border-transparent hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold">{fmtShortTime(h.created_at)}</div>
                                  {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="text-xs text-muted-foreground truncate">{user}</div>
                                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                    {h.operation === 'INSERT' ? 'Created' : h.operation === 'UPDATE' ? 'Updated' : h.operation === 'DELETE' ? 'Deleted' : h.operation}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!loadingHist && filteredHistory.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm">No version history.</div>
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t px-5 py-3 space-y-2 bg-muted/20">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={highlightChanges} onCheckedChange={v => setHighlightChanges(!!v)} />
                    Highlight changes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={showUnmodified} onCheckedChange={v => setShowUnmodified(!!v)} />
                    <span className="text-muted-foreground">Show unmodified rows</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryDialog;
