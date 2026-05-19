import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, Filter, RefreshCw } from 'lucide-react';

type HistoryRow = {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  old_data: any;
  new_data: any;
  changed_by: string | null;
  created_at: string;
  sales_order: string | null;
};

type DiffRow = {
  id: string;
  created_at: string;
  table_name: string;
  record_id: string;
  operation: string;
  changed_by: string | null;
  field: string;
  old_value: string;
  new_value: string;
  sales_order: string | null;
};

const SKIP_FIELDS = new Set(['updated_at', 'created_at', 'updated_by', 'created_by']);

function buildDiffs(row: HistoryRow): DiffRow[] {
  const base = {
    id: row.id, created_at: row.created_at, table_name: row.table_name,
    record_id: row.record_id, operation: row.operation, changed_by: row.changed_by,
    sales_order: row.sales_order || row.new_data?.sales_order || row.old_data?.sales_order || null,
  };
  if (row.operation === 'INSERT') {
    return [{ ...base, field: '—', old_value: '—', new_value: 'Created', }];
  }
  if (row.operation === 'DELETE') {
    return [{ ...base, field: '—', old_value: 'Existed', new_value: 'Deleted' }];
  }
  const out: DiffRow[] = [];
  const oldD = row.old_data || {}; const newD = row.new_data || {};
  const keys = new Set<string>([...Object.keys(oldD), ...Object.keys(newD)]);
  keys.forEach(k => {
    if (SKIP_FIELDS.has(k)) return;
    const ov = oldD[k]; const nv = newD[k];
    const os = ov == null ? '' : typeof ov === 'object' ? JSON.stringify(ov) : String(ov);
    const ns = nv == null ? '' : typeof nv === 'object' ? JSON.stringify(nv) : String(nv);
    if (os !== ns) out.push({ ...base, field: k, old_value: os, new_value: ns });
  });
  return out;
}

export const ActivityLogs: React.FC = () => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grouped' | 'raw'>('grouped');
  const [pageSize, setPageSize] = useState(50);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('history').select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error) setRows((data as HistoryRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const diffs = useMemo(() => {
    const all: DiffRow[] = [];
    rows.forEach(r => all.push(...buildDiffs(r)));
    return all;
  }, [rows]);

  const filtered = useMemo(() => {
    return diffs.filter(d => {
      if (tableFilter !== 'all' && d.table_name !== tableFilter) return false;
      if (opFilter !== 'all' && d.operation !== opFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${d.field} ${d.old_value} ${d.new_value} ${d.changed_by || ''} ${d.sales_order || ''} ${d.record_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [diffs, tableFilter, opFilter, search]);

  const visible = filtered.slice(0, pageSize);

  const opColor = (op: string) =>
    op === 'INSERT' ? 'bg-success text-success-foreground'
    : op === 'DELETE' ? 'bg-destructive text-destructive-foreground'
    : 'bg-info text-info-foreground';

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-b pb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" /> Activity Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full overflow-hidden border bg-card shadow-sm">
              <button onClick={() => setView('grouped')}
                className={`px-4 py-1.5 text-xs font-semibold transition ${view === 'grouped' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Grouped</button>
              <button onClick={() => setView('raw')}
                className={`px-4 py-1.5 text-xs font-semibold transition ${view === 'raw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Raw</button>
            </div>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-28 text-xs rounded-full bg-card shadow-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs px-3 py-1.5 rounded-full bg-card border shadow-sm font-medium">{filtered.length} entries</span>
            <Button size="sm" variant="outline" className="rounded-full bg-card shadow-sm"
              onClick={() => { setSearch(''); setTableFilter('all'); setOpFilter('all'); }}>
              Clear all
            </Button>
            <Button size="sm" variant="outline" className="rounded-full bg-card shadow-sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by field, value, user, sales order…"
              className="pl-11 h-12 rounded-full bg-card shadow-sm border-0 focus-visible:ring-2"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="h-12 w-40 rounded-full bg-card shadow-sm border-0"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              <SelectItem value="devices">Devices</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="users">Users</SelectItem>
            </SelectContent>
          </Select>
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="h-12 w-36 rounded-full bg-card shadow-sm border-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="INSERT">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">

        {view === 'grouped' ? (
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Table</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Field</TableHead>
                  <TableHead className="text-xs">Old → New</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Sales Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No activity</TableCell></TableRow>
                ) : visible.map((d, i) => (
                  <TableRow key={`${d.id}-${i}`} className="text-xs">
                    <TableCell className="whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.table_name}</Badge></TableCell>
                    <TableCell><Badge className={opColor(d.operation)}>{d.operation}</Badge></TableCell>
                    <TableCell className="font-medium text-primary">{d.field}</TableCell>
                    <TableCell>
                      <span className="text-destructive line-through mr-1 break-all">{d.old_value || '—'}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="text-success font-medium break-all">{d.new_value || '—'}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.changed_by || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{d.sales_order || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <pre className="text-[11px] bg-muted/40 p-3 rounded-lg overflow-auto max-h-[500px]">
            {JSON.stringify(rows.slice(0, pageSize), null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;
