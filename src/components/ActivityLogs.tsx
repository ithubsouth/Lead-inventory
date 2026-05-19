import React, { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(50);

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
      if (deviceIds.length > 0) {
        const { data: devices } = await supabase.from('devices').select('*').in('id', deviceIds);
        const map: Record<string, any> = {};
        devices?.forEach(d => map[d.id] = d);
        setDeviceMap(map);
      }

      // Fetch orders context
      const orderIds = Array.from(new Set(historyData.filter(r => r.table_name === 'orders').map(r => r.record_id)));
      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds);
        const map: Record<string, any> = {};
        orders?.forEach(o => map[o.id] = o);
        setOrderMap(map);
      }

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
      const order = orderMap[row.record_id];
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

    return Object.values(groups).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    const source = group.table_name === 'devices' ? deviceMap[group.record_id] : orderMap[group.record_id];
    const staticValue = source?.[field];

    // If we have a change recorded in this log entry
    if (data) {
      const hasChange = data.old !== data.new && data.old !== '';
      return (
        <div className="flex flex-col min-h-[32px] justify-center">
          <span className="text-emerald-600 font-bold">{data.new || staticValue || defaultValue}</span>
          {hasChange && <span className="text-red-500 text-[10px] leading-tight font-medium mt-0.5">{data.old}</span>}
        </div>
      );
    }

    // Fallback to static data from context map
    return <span className="text-gray-400 font-medium">{staticValue || defaultValue}</span>;
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
                {[50, 100, 200, 500].map(n => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b border-gray-200">
              <TableRow>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 py-4 pl-6">Timestamp</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Sales Order</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Serial Number</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Type</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Model</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Configuration</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Asset Status</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Status</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Location</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Updated By</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 pr-6">School Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-20 text-gray-400">Loading activity data...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-20 text-gray-400">No logs found</TableCell></TableRow>
              ) : visible.map((g, i) => (
                <TableRow key={i} className="hover:bg-gray-50/40 transition-colors border-b border-gray-100 last:border-0">
                  <TableCell className="text-[11px] text-gray-500 whitespace-nowrap py-4 pl-6">{formatDate(g.timestamp)}</TableCell>
                  <TableCell className="text-[12px] font-bold text-blue-700">
                    {g.sales_order || deviceMap[g.record_id]?.sales_order || orderMap[g.record_id]?.sales_order || '—'}
                  </TableCell>
                  <TableCell className="text-[12px] font-bold text-blue-700">
                    {g.serial_number || deviceMap[g.record_id]?.serial_number || '—'}
                  </TableCell>
                  <TableCell className="text-[11px]">{renderCell('asset_type', g)}</TableCell>
                  <TableCell className="text-[11px]">{renderCell('model', g)}</TableCell>
                  <TableCell className="text-[11px]">{renderCell('configuration', g)}</TableCell>
                  <TableCell className="text-[11px]">{renderCell('asset_status', g)}</TableCell>
                  <TableCell className="text-[11px]">{renderCell('status', g)}</TableCell>
                  <TableCell className="text-[11px]">{renderCell('warehouse', g, '—')}</TableCell>
                  <TableCell className="text-[11px] text-red-500 font-medium">{g.user}</TableCell>
                  <TableCell className="text-[11px] text-red-500 font-medium pr-6">
                    {deviceMap[g.record_id]?.school_name || orderMap[g.record_id]?.school_name || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;
