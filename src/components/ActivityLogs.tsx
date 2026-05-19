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

type GroupedLog = {
  timestamp: string;
  record_id: string;
  table_name: string;
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
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        container.scrollBy({ left: -150, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        container.scrollBy({ left: 150, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        container.scrollBy({ top: -60, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        container.scrollBy({ top: 60, behavior: 'smooth' });
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) {
        container.scrollBy({ left: e.deltaX * 2, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.shiftKey && e.deltaY !== 0) {
        container.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' });
        e.preventDefault();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
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

      // Fetch devices context
      const deviceIds = Array.from(new Set(historyData.filter(r => r.table_name === 'devices').map(r => r.record_id)));
      let fetchedDevices: any[] = [];
      if (deviceIds.length > 0) {
        const { data: devices } = await supabase.from('devices').select('*').in('id', deviceIds);
        fetchedDevices = devices || [];
        const dMap: Record<string, any> = {};
        fetchedDevices.forEach(d => dMap[d.id] = d);
        setDeviceMap(dMap);
      }

      // Fetch orders context (including parent orders for devices)
      const orderIdsFromHistory = historyData.filter(r => r.table_name === 'orders').map(r => r.record_id);
      const orderIdsFromDevices = fetchedDevices.map(d => d.order_id).filter(Boolean);
      const allOrderIds = Array.from(new Set([...orderIdsFromHistory, ...orderIdsFromDevices]));

      let fetchedOrders: any[] = [];
      if (allOrderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('*').in('id', allOrderIds);
        fetchedOrders = orders || [];
        const oMap: Record<string, any> = {};
        fetchedOrders.forEach(o => oMap[o.id] = o);
        setOrderMap(oMap);
      }

      // Build Global Sales Order to School Map for cross-matching
      const soMap: Record<string, string> = {};
      fetchedOrders.forEach(o => { if (o.sales_order && o.school_name) soMap[o.sales_order] = o.school_name; });
      fetchedDevices.forEach(d => { if (d.sales_order && d.school_name) soMap[d.sales_order] = d.school_name; });

      // If some SOs are still missing school names, try a direct lookup
      const missingSO = Array.from(new Set(historyData.map(r => r.sales_order).filter(s => s && !soMap[s])));
      if (missingSO.length > 0) {
        const { data: extraSO } = await supabase.from('orders').select('sales_order, school_name').in('sales_order', missingSO).eq('is_deleted', false);
        extraSO?.forEach(o => { if (o.school_name) soMap[o.sales_order] = o.school_name; });
      }
      setSoToSchoolMap(soMap);

      // Fetch users context for email mapping
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

  const groupedLogs = useMemo(() => {
    const groups: Record<string, GroupedLog> = {};

    rows.forEach(row => {
      const device = deviceMap[row.record_id];
      const order = orderMap[row.record_id] || (device ? orderMap[device.order_id] : null);

      const time = new Date(row.created_at).getTime();
      const roundedTime = Math.floor(time / 5000) * 5000;

      const rawUser = row.changed_by || row.updated_by || 'system';
      const displayUser = userMap[rawUser] || rawUser;

      const key = `${row.record_id}-${roundedTime}-${rawUser}`;

      if (!groups[key]) {
        groups[key] = {
          timestamp: row.created_at,
          record_id: row.record_id,
          table_name: row.table_name,
          sales_order: row.sales_order || device?.sales_order || order?.sales_order || null,
          user: displayUser,
          serial_number: device?.serial_number || '',
          fields: {}
        };
      }

      const extractValue = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };

      if (!row.field_name && typeof row.new_data === 'object' && row.new_data !== null && !Array.isArray(row.new_data)) {
        Object.entries(row.new_data).forEach(([k, v]) => {
          groups[key].fields[k] = { old: extractValue(row.old_data?.[k]), new: extractValue(v) };
          if (k === 'serial_number' && !groups[key].serial_number) groups[key].serial_number = extractValue(v);
          if (k === 'sales_order' && !groups[key].sales_order) groups[key].sales_order = extractValue(v);
        });
      } else {
        const field = row.field_name || 'details';
        groups[key].fields[field] = { old: extractValue(row.old_data), new: extractValue(row.new_data) };
        if (field === 'serial_number' && !groups[key].serial_number) groups[key].serial_number = extractValue(row.new_data);
        if ((field === 'sales_order' || field === 'order_id') && !groups[key].sales_order) groups[key].sales_order = extractValue(row.new_data);
      }
    });

    const sorted = Object.values(groups).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pass 2: Backfill missing "old" values from previous log entries for the same record
    const lastSeenValue: Record<string, Record<string, string>> = {};

    // We iterate backwards in time (from oldest to newest) to track values
    [...sorted].reverse().forEach(group => {
      Object.entries(group.fields).forEach(([field, data]) => {
        const recordId = group.record_id;
        if (!lastSeenValue[recordId]) lastSeenValue[recordId] = {};

        // If this entry has an empty old value, fill it with the last new value we saw for this record
        if (!data.old && lastSeenValue[recordId][field]) {
          data.old = lastSeenValue[recordId][field];
        }

        // Update our tracker with the newest value from this entry
        if (data.new) {
          lastSeenValue[recordId][field] = data.new;
        }
      });
    });

    return sorted;
  }, [rows, deviceMap, orderMap, userMap]);

  const filtered = useMemo(() => {
    if (!search) return groupedLogs;
    const q = search.toLowerCase();
    return groupedLogs.filter(g =>
      g.serial_number.toLowerCase().includes(q) ||
      g.sales_order?.toLowerCase().includes(q) ||
      g.user.toLowerCase().includes(q)
    );
  }, [groupedLogs, search]);

  const visible = filtered.slice(0, pageSize);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', '');
  };

  const renderCell = (field: string, group: GroupedLog, defaultValue: string = '—') => {
    const data = group.fields[field];
    const device = deviceMap[group.record_id];
    const order = orderMap[group.record_id] || (device ? orderMap[device.order_id] : null);
    const source = group.table_name === 'devices' ? device : order;
    const staticValue = source?.[field];

    const oldV = data?.old || '';
    const newV = data?.new || '';

    // We show the change if the old value is recorded and different from new
    const hasChange = oldV !== newV && oldV !== '' && oldV !== 'null' && oldV !== 'undefined';

    return (
      <div className="flex flex-col min-h-[42px] justify-center">
        <span className="text-emerald-600 font-bold text-[12px] leading-tight">
          {newV || staticValue || defaultValue}
        </span>
        {hasChange && (
          <span className="text-red-600 font-extrabold text-[11px] leading-tight mt-1">
            {oldV}
          </span>
        )}
      </div>
    );
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
              <Input
                placeholder="Search..."
                className="pl-9 bg-white border-gray-200 h-10 rounded-lg"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="w-32 bg-white h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading} className="bg-white h-10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div
          ref={tableContainerRef}
          tabIndex={0}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            height: '400px',
            maxHeight: '400px',
            position: 'relative',
            overscrollBehavior: 'contain',
            boxSizing: 'border-box',
            width: '100%'
          }}
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
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px) font-extrabold uppercase tracking-wider text-gray-500">Status</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Location</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Updated By</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 20, borderBottom: '1px solid #e2e8f0' }} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 pr-6">School Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} className="text-center py-20 text-gray-400">Loading activity data...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center py-20 text-gray-400">No logs found</TableCell></TableRow>
              ) : visible.map((g, i) => {
                const so = g.sales_order || (deviceMap[g.record_id]?.sales_order) || (orderMap[g.record_id]?.sales_order);
                const school = g.fields['school_name']?.new || soToSchoolMap[so || ''] || deviceMap[g.record_id]?.school_name || orderMap[g.record_id]?.school_name || '—';

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
                    <TableCell className="text-[11px]">{renderCell('warehouse', g, '—')}</TableCell>
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
