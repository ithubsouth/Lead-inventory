import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Search, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

type HistoryRow = {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  field_name: string | null;
  old_data: any;
  new_data: any;
  updated_by: string | null;
  changed_by: string | null;
  created_at: string;
  sales_order: string | null;
};

type LogEntry = {
  id: string;
  timestamp: string;
  record_id: string;
  table_name: string;
  operation: string;
  sales_order: string | null;
  user: string;
  serial_number: string;
  fields: Record<string, { old: string; new: string }>;
};

export const ActivityLogs: React.FC = () => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [deviceMap, setDeviceMap] = useState<Record<string, any>>({});
  const [orderMap, setOrderMap] = useState<Record<string, any>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [soToSchoolMap, setSoToSchoolMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { canMutate } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active === container || container.contains(active)) {
        if (e.key === 'ArrowLeft') { container.scrollBy({ left: -250, behavior: 'smooth' }); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { container.scrollBy({ left: 250, behavior: 'smooth' }); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { container.scrollBy({ top: -100, behavior: 'smooth' }); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { container.scrollBy({ top: 100, behavior: 'smooth' }); e.preventDefault(); }
      }
    };
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) { container.scrollBy({ left: e.deltaX * 2.5, behavior: 'smooth' }); e.preventDefault(); }
      else if (e.shiftKey && e.deltaY !== 0) { container.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' }); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('history').select('*').order('created_at', { ascending: false }).limit(2000);
      if (error) throw error;
      const historyData = (data as HistoryRow[]) || [];
      setRows(historyData);

      // Batch fetch devices
      const deviceIds = Array.from(new Set(historyData.filter(r => r.table_name === 'devices').map(r => r.record_id)));
      let fetchedDevices: any[] = [];
      if (deviceIds.length > 0) {
        const { data: devices } = await supabase.from('devices').select('*').in('id', deviceIds);
        fetchedDevices = devices || [];
        const dMap: Record<string, any> = {};
        fetchedDevices.forEach(d => dMap[d.id] = d);
        setDeviceMap(dMap);
      }

      // Batch fetch orders
      const orderIds = Array.from(new Set([
        ...historyData.filter(r => r.table_name === 'orders').map(r => r.record_id),
        ...fetchedDevices.map(d => d.order_id).filter(Boolean)
      ]));
      let fetchedOrders: any[] = [];
      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds);
        fetchedOrders = orders || [];
        const oMap: Record<string, any> = {};
        fetchedOrders.forEach(o => oMap[o.id] = o);
        setOrderMap(oMap);
      }

      // SO -> School Master Map
      const soMap: Record<string, string> = {};
      fetchedOrders.forEach(o => { if (o.sales_order && o.school_name) soMap[o.sales_order] = o.school_name; });
      fetchedDevices.forEach(d => { if (d.sales_order && d.school_name) soMap[d.sales_order] = d.school_name; });
      setSoToSchoolMap(soMap);

      // User email map
      const { data: users } = await supabase.from('users').select('id, email');
      const uMap: Record<string, string> = {};
      users?.forEach(u => uMap[u.id] = u.email);
      setUserMap(uMap);

    } catch (err) { console.error('Load logs error:', err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const logEntries = useMemo(() => {
    const extractValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      const s = String(val).trim();
      return (s === 'null' || s === 'undefined') ? '' : s;
    };

    const entries = rows.map(row => {
      const device = deviceMap[row.record_id];
      const order = orderMap[row.record_id] || (device ? orderMap[device.order_id] : null);

      const rawUserId = row.changed_by || row.updated_by || 'system';
      const displayUser = userMap[rawUserId] || rawUserId;

      const entry: LogEntry = {
        id: row.id,
        timestamp: row.created_at,
        record_id: row.record_id,
        table_name: row.table_name,
        operation: row.operation || 'UPDATE',
        sales_order: row.sales_order || device?.sales_order || order?.sales_order || null,
        user: displayUser,
        serial_number: device?.serial_number || '',
        fields: {}
      };

      if (!row.field_name && typeof row.new_data === 'object' && row.new_data !== null && !Array.isArray(row.new_data)) {
        Object.entries(row.new_data).forEach(([k, v]) => {
          const oldV = extractValue(row.old_data?.[k]);
          const newV = extractValue(v);
          if (oldV !== newV || row.operation === 'INSERT') entry.fields[k] = { old: oldV, new: newV };
          if (k === 'serial_number' && !entry.serial_number) entry.serial_number = newV;
          if (k === 'sales_order' && !entry.sales_order) entry.sales_order = newV;
        });
      } else {
        const field = row.field_name || 'details';
        const oldV = extractValue(row.old_data);
        const newV = extractValue(row.new_data);
        if (oldV !== newV || row.operation === 'INSERT') entry.fields[field] = { old: oldV, new: newV };
        if (field === 'serial_number' && !entry.serial_number) entry.serial_number = newV;
        if ((field === 'sales_order' || field === 'order_id') && !entry.sales_order) entry.sales_order = newV;
      }
      return entry;
    }).filter(e => e.operation === 'INSERT' || Object.keys(e.fields).length > 0);

    const chron = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastKnown: Record<string, Record<string, string>> = {};
    chron.forEach(e => {
      const rid = e.record_id; if (!lastKnown[rid]) lastKnown[rid] = {};
      Object.entries(e.fields).forEach(([f, data]) => {
        if (!data.old && lastKnown[rid][f]) data.old = lastKnown[rid][f];
        if (data.new) lastKnown[rid][f] = data.new;
      });
    });

    return chron.reverse();
  }, [rows, deviceMap, orderMap, userMap]);

  const filtered = useMemo(() => {
    if (!search) return logEntries;
    const q = search.toLowerCase();
    return logEntries.filter(e =>
      e.serial_number.toLowerCase().includes(q) ||
      (e.sales_order || '').toLowerCase().includes(q) ||
      e.user.toLowerCase().includes(q)
    );
  }, [logEntries, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const formatDate = (ds: string) => new Date(ds).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');

  const renderCell = (field: string, entry: LogEntry, isBlue: boolean = false, isRed: boolean = false) => {
    const data = entry.fields[field];
    const device = deviceMap[entry.record_id];
    const order = orderMap[entry.record_id] || (device ? orderMap[device.order_id] : null);
    const source = entry.table_name === 'devices' ? device : order;

    let currentVal = source?.[field] || '—';
    if (field === 'school_name') {
      const so = entry.sales_order || device?.sales_order || order?.sales_order;
      currentVal = entry.fields.school_name?.new || soToSchoolMap[so || ''] || device?.school_name || order?.school_name || '—';
    } else if (field === 'warehouse') {
      currentVal = source?.warehouse || '—';
    }

    if (data) {
      const isDiff = data.old !== data.new && data.old !== '';
      return (
        <div className="flex flex-col min-h-[46px] justify-center px-2">
          <span className={`${isBlue ? 'text-blue-700' : isRed ? 'text-red-500' : 'text-emerald-600'} font-bold text-[12px] leading-tight`}>
            {data.new || currentVal}
          </span>
          {isDiff && <span className="text-red-600 font-extrabold text-[11px] leading-tight mt-1.5">{data.old}</span>}
        </div>
      );
    }

    return (
      <div className="px-2">
        <span className={`${isBlue ? 'text-blue-700' : isRed ? 'text-red-500' : 'text-gray-400'} font-medium text-[11px]`}>
          {currentVal}
        </span>
      </div>
    );
  };

  const getPageRange = () => {
    const siblingCount = 1;
    const range = [];
    for (let i = Math.max(1, currentPage - siblingCount); i <= Math.min(totalPages, currentPage + siblingCount); i++) range.push(i);
    if (range[0] > 1) range.unshift('...');
    if (range[0] !== 1) range.unshift(1);
    if (range[range.length - 1] < totalPages) range.push('...');
    if (range[range.length - 1] !== totalPages && totalPages > 0) range.push(totalPages);
    return range;
  };

  const handleRestoreRow = async (entry: LogEntry) => {
    if (!canMutate) return;
    const tbl = entry.table_name;
    if (tbl !== 'devices' && tbl !== 'orders') {
      toast({ title: 'Cannot restore', description: `Restore is not supported for ${tbl}.`, variant: 'destructive' });
      return;
    }
    const payload: Record<string, any> = {};
    Object.entries(entry.fields).forEach(([k, v]) => {
      if (['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted'].includes(k)) return;
      payload[k] = v.old === '' ? null : v.old;
    });
    if (Object.keys(payload).length === 0) {
      toast({ title: 'Nothing to restore', description: 'This entry has no previous values.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Restore ${Object.keys(payload).length} field(s) on ${entry.serial_number || entry.sales_order || 'record'} to previous values?`)) return;
    setRestoringId(entry.id);
    try {
      const { error } = await supabase.from(tbl as any).update(payload).eq('id', entry.record_id);
      if (error) throw error;
      toast({ title: 'Restored', description: 'Previous values applied.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Clock className="w-6 h-6 text-blue-600" /> Activity Logs
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search serial, sales order, user..." className="pl-9 bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-blue-500" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="w-32 bg-white h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading} className="bg-white h-10 hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div ref={tableContainerRef} tabIndex={0} style={{ overflowX: 'auto', overflowY: 'auto', height: '520px', maxHeight: '520px', position: 'relative', overscrollBehavior: 'contain', boxSizing: 'border-box', width: '100%' }} className="rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400" onClick={() => tableContainerRef.current?.focus()}>
          <Table wrapperOverflow="visible" style={{ minWidth: '1800px' }}>
            <TableHeader className="bg-white border-b border-gray-200">
              <TableRow>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 py-4 pl-6">Timestamp</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Sales Order</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Serial Number</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Type</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Model</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Configuration</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Status</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Group</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Condition</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Status</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Location</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Updated By</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 pr-6">School Name</TableHead>
                {canMutate && <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 pr-6 text-center">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? ( <TableRow><TableCell colSpan={canMutate ? 14 : 13} className="text-center py-20 text-gray-400">Loading activity data...</TableCell></TableRow> ) : visible.length === 0 ? ( <TableRow><TableCell colSpan={canMutate ? 14 : 13} className="text-center py-20 text-gray-400">No activity found</TableCell></TableRow> ) : visible.map((g, i) => {
                const so = g.sales_order || deviceMap[g.record_id]?.sales_order || orderMap[g.record_id]?.sales_order;
                const hasOld = Object.values(g.fields).some(f => f.old !== '');
                return (
                  <TableRow key={i} className="hover:bg-gray-50/40 transition-colors border-b border-gray-100 last:border-0">
                    <TableCell className="text-[11px] text-gray-500 whitespace-nowrap py-4 pl-6">{formatDate(g.timestamp)}</TableCell>
                    <TableCell className="p-0">{renderCell('sales_order', g, true)}</TableCell>
                    <TableCell className="p-0">{renderCell('serial_number', g, true)}</TableCell>
                    <TableCell className="p-0">{renderCell('asset_type', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('model', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('configuration', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('asset_status', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('asset_group', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('asset_condition', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('status', g)}</TableCell>
                    <TableCell className="p-0">{renderCell('warehouse', g)}</TableCell>
                    <TableCell className="p-0">
                      <div className="flex flex-col min-h-[46px] justify-center px-2">
                        <span className="text-red-500 font-bold text-[12px] leading-tight">{g.user}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-0 pr-6">
                      {renderCell('school_name', g, false, true)}
                    </TableCell>
                    {canMutate && (
                      <TableCell className="p-0 pr-6 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!hasOld || restoringId === g.id || (g.table_name !== 'devices' && g.table_name !== 'orders')}
                          onClick={() => handleRestoreRow(g)}
                          className="h-8 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30"
                          title={hasOld ? 'Restore previous values' : 'No previous values'}
                        >
                          {restoringId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Restore</>}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-2 text-[11px] text-gray-400 font-medium">
          <div>Showing {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries</div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
            {getPageRange().map((p, i) => (
              <Button key={i} variant={currentPage === p ? 'default' : 'outline'} size="sm" className={`h-8 w-8 p-0 text-xs ${p === '...' ? 'border-none bg-transparent hover:bg-transparent cursor-default' : ''}`} onClick={() => typeof p === 'number' && setCurrentPage(p)}>{p}</Button>
            ))}
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;
