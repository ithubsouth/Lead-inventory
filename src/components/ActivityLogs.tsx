import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Search, RefreshCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
      if (e.deltaX !== 0) {
        container.scrollBy({ left: e.deltaX * 2.5, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.shiftKey && e.deltaY !== 0) {
        container.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' });
        e.preventDefault();
      }
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
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      const historyData = (data as HistoryRow[]) || [];
      setRows(historyData);

      const deviceIds = Array.from(new Set(historyData.filter(r => r.table_name === 'devices').map(r => r.record_id)));
      let fetchedDevices: any[] = [];
      if (deviceIds.length > 0) {
        const { data: devices } = await supabase.from('devices').select('*').in('id', deviceIds);
        fetchedDevices = devices || [];
        const dMap: Record<string, any> = {};
        fetchedDevices.forEach(d => dMap[d.id] = d);
        setDeviceMap(dMap);
      }

      const orderIds = Array.from(new Set([
        ...historyData.filter(r => r.table_name === 'orders').map(r => r.record_id),
        ...fetchedDevices.map(d => d.order_id).filter(Boolean)
      ]));
      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds);
        const oMap: Record<string, any> = {};
        orders?.forEach(o => oMap[o.id] = o);
        setOrderMap(oMap);
      }

      const { data: users } = await supabase.from('users').select('id, email');
      const uMap: Record<string, string> = {};
      users?.forEach(u => uMap[u.id] = u.email);
      setUserMap(uMap);

    } catch (err) {
      console.error('Load logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const logEntries = useMemo(() => {
    const extractValue = (val: any): string => (val === null || val === undefined) ? '' : (typeof val === 'object') ? JSON.stringify(val) : String(val);

    // 1. Process all rows into raw events with extracted data
    const rawEvents = rows.map(row => {
      const device = deviceMap[row.record_id];
      const order = orderMap[row.record_id] || (device ? orderMap[device.order_id] : null);

      const eventFields: Record<string, string> = {};
      if (typeof row.new_data === 'object' && row.new_data !== null && !Array.isArray(row.new_data)) {
        Object.entries(row.new_data).forEach(([k, v]) => { eventFields[k] = extractValue(v); });
      } else if (row.field_name) {
        eventFields[row.field_name] = extractValue(row.new_data);
      }

      return {
        ...row,
        serial_number: eventFields.serial_number || device?.serial_number || '',
        sales_order: eventFields.sales_order || row.sales_order || device?.sales_order || order?.sales_order || '',
        school_name: eventFields.school_name || device?.school_name || order?.school_name || '',
        extractedFields: eventFields,
        user: userMap[row.changed_by || row.updated_by || ''] || row.changed_by || row.updated_by || 'system'
      };
    });

    // 2. Sort oldest first to calculate progressive changes
    const sortedEvents = [...rawEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // 3. Track state per identifier (Serial or Record ID)
    const finalEntries: LogEntry[] = [];
    const lastState: Record<string, Record<string, string>> = {};

    sortedEvents.forEach(ev => {
      const key = ev.serial_number || ev.record_id;
      if (!lastState[key]) lastState[key] = {};

      const changes: Record<string, { old: string; new: string }> = {};

      Object.entries(ev.extractedFields).forEach(([f, newVal]) => {
        const prevVal = lastState[key][f] || '';
        if (newVal !== prevVal) {
          changes[f] = { old: prevVal, new: newVal };
          lastState[key][f] = newVal;
        }
      });

      // Special check for school_name consistency
      if (!changes.school_name && ev.school_name && ev.school_name !== (lastState[key].school_name || '')) {
         changes.school_name = { old: lastState[key].school_name || '', new: ev.school_name };
         lastState[key].school_name = ev.school_name;
      }

      if (Object.keys(changes).length > 0) {
        finalEntries.push({
          id: ev.id,
          timestamp: ev.created_at,
          record_id: ev.record_id,
          table_name: ev.table_name,
          operation: ev.operation,
          sales_order: ev.sales_order,
          user: ev.user,
          serial_number: ev.serial_number,
          fields: changes
        });
      }
    });

    // 4. Return newest first for display
    return finalEntries.reverse();
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

  const visible = filtered.slice(0, pageSize);
  const formatDate = (ds: string) => new Date(ds).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');

  const renderCell = (field: string, entry: LogEntry, defaultValue: string = '—') => {
    const data = entry.fields[field];
    if (data) {
      const isDiff = data.old !== data.new && data.old !== '' && data.old !== 'null';
      return (
        <div className="flex flex-col min-h-[44px] justify-center">
          <span className="text-emerald-600 font-bold text-[12px] leading-tight">{data.new || defaultValue}</span>
          {isDiff && <span className="text-red-600 font-extrabold text-[11px] leading-tight mt-1.5">{data.old}</span>}
        </div>
      );
    }
    // For non-changing fields in this row, look up current state from device/order context
    const device = deviceMap[entry.record_id];
    const order = orderMap[entry.record_id] || (device ? orderMap[device.order_id] : null);
    const source = entry.table_name === 'devices' ? device : order;
    return <span className="text-gray-400 font-medium text-[11px]">{source?.[field] || defaultValue}</span>;
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
              <Input placeholder="Search..." className="pl-9 bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-blue-500" value={search} onChange={e => setSearch(e.target.value)} />
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
      <CardContent className="px-0">
        <div
          ref={tableContainerRef}
          tabIndex={0}
          style={{ overflowX: 'auto', overflowY: 'auto', height: '500px', maxHeight: '500px', position: 'relative', overscrollBehavior: 'contain', boxSizing: 'border-box', width: '100%' }}
          className="rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? ( <TableRow><TableCell colSpan={13} className="text-center py-20 text-gray-400">Loading activity data...</TableCell></TableRow> ) : visible.length === 0 ? ( <TableRow><TableCell colSpan={13} className="text-center py-20 text-gray-400">No activity found</TableCell></TableRow> ) : visible.map((g, i) => {
                const device = deviceMap[g.record_id];
                const order = orderMap[g.record_id] || (device ? orderMap[device.order_id] : null);
                const so = g.sales_order || device?.sales_order || order?.sales_order;
                const school = g.fields.school_name?.new || device?.school_name || order?.school_name || '—';
                return (
                  <TableRow key={i} className="hover:bg-gray-50/40 transition-colors border-b border-gray-100 last:border-0">
                    <TableCell className="text-[11px] text-gray-500 whitespace-nowrap py-4 pl-6">{formatDate(g.timestamp)}</TableCell>
                    <TableCell className="text-[12px] font-bold text-blue-700">{so || '—'}</TableCell>
                    <TableCell className="text-[12px] font-bold text-blue-700">{g.serial_number || (deviceMap[g.record_id]?.serial_number) || '—'}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('asset_type', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('model', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('configuration', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('asset_status', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('asset_group', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('asset_condition', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('status', g)}</TableCell>
                    <TableCell className="text-[11px]">{renderCell('warehouse', g)}</TableCell>
                    <TableCell className="text-[11px] text-red-500 font-medium">{g.user}</TableCell>
                    <TableCell className="text-[11px] text-red-500 font-medium pr-6">{school}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;
