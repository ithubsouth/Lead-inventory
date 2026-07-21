import React, { useState, useMemo, useEffect } from 'react';
import { X, GripVertical, Plus, Save, Trash2, ChevronDown, Check, Settings2 } from 'lucide-react';
import { Device } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface PivotTableProps {
  devices: Device[];
  instanceId: string;
  onClose: () => void;
}

type AggregationType = 'SUM' | 'COUNTA' | 'COUNT' | 'COUNTUNIQUE' | 'AVERAGE' | 'MAX' | 'MIN' | 'MEDIAN' | 'PRODUCT' | 'STDEV' | 'STDEVP' | 'VAR' | 'VARP';

interface PivotDimension {
  field: string;
  order: 'asc' | 'desc';
  sortBy: 'field' | 'value';
  showTotals: boolean;
}

interface PivotValue {
  field: string;
  summarizeBy: AggregationType;
  showAs: 'default' | 'percentRow' | 'percentCol';
}

interface PivotFilter {
  field: string;
  selectedValues: string[];
}

interface SavedPivot {
  name: string;
  title: string;
  rows: PivotDimension[];
  columns: PivotDimension[];
  values: PivotValue[];
  filters: PivotFilter[];
  showTotals: boolean;
}

const SearchableAdd: React.FC<{
  options: { value: string; label: string }[];
  onSelect: (val: string) => void;
  placeholder?: string;
  label?: string;
}> = ({ options, onSelect, placeholder = "Search field...", label = "Add" }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-[70px] h-8 text-[11px] font-bold text-emerald-500 bg-emerald-50/50 border-emerald-100 rounded-full shadow-none hover:bg-emerald-500 hover:text-white transition-all">
          <div className="flex items-center gap-1 mx-auto">{label} <ChevronDown className="h-3 w-3" /></div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="end">
        <Command>
          <CommandInput placeholder={placeholder} className="h-10 text-xs border-none focus:ring-0" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-4 text-center text-xs text-slate-400">No field found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className="text-xs font-semibold py-2.5 px-4 cursor-pointer hover:bg-slate-50 aria-selected:bg-slate-50"
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const PivotTable: React.FC<PivotTableProps> = ({ devices, instanceId, onClose }) => {
  const [pivotTitle, setPivotTitle] = useState('Custom Analysis');
  const [rows, setRows] = useState<PivotDimension[]>([]);
  const [columns, setColumns] = useState<PivotDimension[]>([]);
  const [values, setValues] = useState<PivotValue[]>([{ field: '__record_count', summarizeBy: 'COUNT', showAs: 'default' }]);
  const [filters, setFilters] = useState<PivotFilter[]>([]);
  const [showEditor, setShowEditor] = useState(true);
  const [showTotals, setShowTotals] = useState(true);
  const [pivotName, setPivotName] = useState('');
  const [savedPivots, setSavedPivots] = useState<SavedPivot[]>([]);
  const { toast } = useToast();

  // Load current instance state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`pivot_instance_state_${instanceId}`);
    if (savedState) {
      try {
        const s = JSON.parse(savedState);
        setPivotTitle(s.title || 'Custom Analysis');
        setRows(s.rows || []);
        setColumns(s.columns || []);
        setValues(s.values || []);
        setFilters(s.filters || []);
        setShowTotals(s.showTotals ?? true);
        setShowEditor(s.showEditor ?? true);
      } catch (e) {
        console.error('Error loading instance state', e);
      }
    }
  }, [instanceId]);

  // Auto-save instance state on any change
  useEffect(() => {
    const stateToSave = {
      title: pivotTitle,
      rows,
      columns,
      values,
      filters,
      showTotals,
      showEditor
    };
    localStorage.setItem(`pivot_instance_state_${instanceId}`, JSON.stringify(stateToSave));
  }, [pivotTitle, rows, columns, values, filters, showTotals, showEditor, instanceId]);

  // Dynamic Field Discovery
  const availableFields = useMemo(() => {
    if (!devices.length) return [];

    // Scan one record to get all keys (or scan all for safety if schema is very fluid)
    const keys = new Set<string>();
    devices.forEach(d => {
      Object.keys(d).forEach(k => keys.add(k));
    });

    const excluded = ['id', 'order_id', 'is_deleted', 'created_at', 'updated_at', 'deleted_at', 'audited_at', 'created_by', 'updated_by', 'audited_by'];

    const fields = Array.from(keys)
      .filter(k => !excluded.includes(k))
      .map(k => ({
        value: k,
        label: k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { value: '__record_count', label: 'SIM Count' },
      ...fields
    ];
  }, [devices]);

  useEffect(() => {
    const saved = localStorage.getItem('inventory_saved_pivots');
    if (saved) {
      try {
        setSavedPivots(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading pivots', e);
      }
    }
  }, []);

  const savePivot = () => {
    const config: SavedPivot = { name: pivotTitle, title: pivotTitle, rows, columns, values, filters, showTotals };
    const updated = [...savedPivots.filter(p => p.name !== pivotTitle), config];
    setSavedPivots(updated);
    localStorage.setItem('inventory_saved_pivots', JSON.stringify(updated));
    toast({ title: 'Success', description: `Pivot "${pivotTitle}" saved successfully` });
  };

  const loadPivot = (name: string) => {
    const p = savedPivots.find(p => p.name === name);
    if (p) {
      setRows(p.rows);
      setColumns(p.columns);
      setValues(p.values || []);
      setFilters(p.filters || []);
      setPivotTitle(p.title || 'Custom Analysis');
      setShowTotals(p.showTotals ?? true);
      setPivotName(p.name);
    }
  };

  const deletePivot = (name: string) => {
    const updated = savedPivots.filter(p => p.name !== name);
    setSavedPivots(updated);
    localStorage.setItem('inventory_saved_pivots', JSON.stringify(updated));
    if (pivotName === name) setPivotName('');
  };

  const moveItem = (list: any[], setList: (val: any[]) => void, index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newList.length) {
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      setList(newList);
    }
  };

  const performAggregation = (vals: any[], type: AggregationType) => {
    const numericValues = vals.map(v => Number(v)).filter(v => !isNaN(v));

    switch (type) {
      case 'SUM': return numericValues.reduce((a, b) => a + b, 0);
      case 'COUNTA': return vals.filter(v => v !== null && v !== undefined && v !== '').length;
      case 'COUNT': return vals.filter(v => v !== null && v !== undefined && v !== '').length; // Generic count for IDs
      case 'COUNTUNIQUE': return new Set(vals.filter(v => v !== null && v !== undefined && v !== '')).size;
      case 'AVERAGE': return numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
      case 'MAX': return numericValues.length ? Math.max(...numericValues) : 0;
      case 'MIN': return numericValues.length ? Math.min(...numericValues) : 0;
      case 'MEDIAN': {
        if (!numericValues.length) return 0;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      case 'PRODUCT': return numericValues.length ? numericValues.reduce((a, b) => a * b, 1) : 0;
      case 'STDEV':
      case 'STDEVP': {
        if (!numericValues.length) return 0;
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const squareDiffs = numericValues.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / (type === 'STDEV' ? Math.max(1, numericValues.length - 1) : numericValues.length);
        return Math.sqrt(avgSquareDiff);
      }
      case 'VAR':
      case 'VARP': {
        if (!numericValues.length) return 0;
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const squareDiffs = numericValues.map(v => Math.pow(v - avg, 2));
        return squareDiffs.reduce((a, b) => a + b, 0) / (type === 'VAR' ? Math.max(1, numericValues.length - 1) : numericValues.length);
      }
      default: return vals.length;
    }
  };

  const pivotData = useMemo(() => {
    // 1. Filter Data
    let filteredData = devices;
    filters.forEach(f => {
      if (f.selectedValues.length) {
        filteredData = filteredData.filter(d => f.selectedValues.includes(String(d[f.field as keyof Device] || 'N/A')));
      }
    });

    // 2. Aggregate Data into a structure that allows sorting and totals
    // Structure: rowKey -> colKey -> valueField -> number[]
    const aggregated: Record<string, Record<string, Record<string, number[]>>> = {};
    const rowKeyMap: Record<string, string[]> = {};
    const colKeyMap: Record<string, string[]> = {};
    const allColKeys = new Set<string>();

    filteredData.forEach(d => {
      const rowParts = rows.map(r => String(d[r.field as keyof Device] || 'N/A'));
      const rowKey = rowParts.join(' | ');
      const colParts = columns.map(c => String(d[c.field as keyof Device] || 'N/A'));
      const colKey = columns.length > 0 ? colParts.join(' | ') : "__default__";

      rowKeyMap[rowKey] = rowParts;
      colKeyMap[colKey] = colParts;
      allColKeys.add(colKey);

      if (!aggregated[rowKey]) aggregated[rowKey] = {};
      if (!aggregated[rowKey][colKey]) aggregated[rowKey][colKey] = {};

      values.forEach(v => {
        if (!aggregated[rowKey][colKey][v.field]) aggregated[rowKey][colKey][v.field] = [];
        const val = v.field === '__record_count' ? 1 : d[v.field as keyof Device];
        aggregated[rowKey][colKey][v.field].push(val as any);
      });
    });

    // 3. Perform initial aggregation and calculate totals for sorting
    const cellValues: Record<string, Record<string, Record<string, number>>> = {};
    const rowTotals: Record<string, Record<string, number>> = {};
    const colTotals: Record<string, Record<string, number>> = {};
    const grandTotals: Record<string, number> = {};

    Object.keys(aggregated).forEach(rk => {
      cellValues[rk] = {};
      if (!rowTotals[rk]) rowTotals[rk] = {};
      Object.keys(aggregated[rk]).forEach(ck => {
        cellValues[rk][ck] = {};
        if (!colTotals[ck]) colTotals[ck] = {};
        values.forEach(v => {
          const val = performAggregation(aggregated[rk][ck][v.field], v.summarizeBy);
          cellValues[rk][ck][v.field] = val;

          rowTotals[rk][v.field] = (rowTotals[rk][v.field] || 0) + val;
          colTotals[ck][v.field] = (colTotals[ck][v.field] || 0) + val;
          grandTotals[v.field] = (grandTotals[v.field] || 0) + val;
        });
      });
    });

    // 4. Sorting Logic
    const sortKeys = (keys: string[], dimensions: PivotDimension[], keyPartsMap: Record<string, string[]>, totalsMap: Record<string, Record<string, number>>) => {
      return [...keys].sort((a, b) => {
        const partsA = keyPartsMap[a] || [];
        const partsB = keyPartsMap[b] || [];

        for (let i = 0; i < dimensions.length; i++) {
          const dim = dimensions[i];
          const valA = partsA[i];
          const valB = partsB[i];

          if (valA !== valB) {
            let comparison = 0;
            if (dim.sortBy === 'value') {
              const firstValueField = values[0]?.field;
              if (firstValueField) {
                const getMemberTotal = (keyParts: string[]) => {
                  return Object.keys(keyPartsMap)
                    .filter(k => {
                      const kParts = keyPartsMap[k];
                      return i === 0 || keyParts.slice(0, i).every((p, idx) => p === kParts[idx]);
                    })
                    .filter(k => keyPartsMap[k][i] === keyParts[i])
                    .reduce((sum, k) => sum + (totalsMap[k]?.[firstValueField] || 0), 0);
                };
                comparison = getMemberTotal(partsA) - getMemberTotal(partsB);
              }
            } else {
              comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            }
            if (comparison !== 0) return dim.order === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    };

    const sortedRowKeys = sortKeys(Object.keys(aggregated), rows, rowKeyMap, rowTotals);
    const sortedColKeys = columns.length > 0
      ? sortKeys(Array.from(allColKeys), columns, colKeyMap, colTotals)
      : ["__default__"];

    // 5. Apply "Show As" transformations
    const finalCellValues: Record<string, Record<string, Record<string, number>>> = {};
    sortedRowKeys.forEach(rk => {
      finalCellValues[rk] = {};
      sortedColKeys.forEach(ck => {
        finalCellValues[rk][ck] = {};
        values.forEach(v => {
          let val = cellValues[rk]?.[ck]?.[v.field] || 0;
          if (v.showAs === 'percentRow') {
            const rowTotal = rowTotals[rk][v.field] || 0;
            val = rowTotal !== 0 ? (val / rowTotal) * 100 : 0;
          } else if (v.showAs === 'percentCol') {
            const colTotal = colTotals[ck][v.field] || 0;
            val = colTotal !== 0 ? (val / colTotal) * 100 : 0;
          }
          finalCellValues[rk][ck][v.field] = val;
        });
      });
    });

    // 6. Calculate Spans for Row Grouping
    const spans: number[][] = Array(sortedRowKeys.length).fill(0).map(() => Array(rows.length).fill(1));
    for (let colIdx = 0; colIdx < rows.length; colIdx++) {
      let currentIdx = 0;
      while (currentIdx < sortedRowKeys.length) {
        let spanCount = 1;
        const currentParts = rowKeyMap[sortedRowKeys[currentIdx]];
        const currentVal = currentParts[colIdx];
        const currentPrefix = currentParts.slice(0, colIdx).join('|');

        for (let nextIdx = currentIdx + 1; nextIdx < sortedRowKeys.length; nextIdx++) {
          const nextParts = rowKeyMap[sortedRowKeys[nextIdx]];
          const nextVal = nextParts[colIdx];
          const nextPrefix = nextParts.slice(0, colIdx).join('|');

          if (nextVal === currentVal && nextPrefix === currentPrefix) {
            spanCount++;
            spans[nextIdx][colIdx] = 0;
          } else {
            break;
          }
        }
        spans[currentIdx][colIdx] = spanCount;
        currentIdx += spanCount;
      }
    }

    return {
      data: finalCellValues,
      rowKeys: sortedRowKeys,
      columns: sortedColKeys,
      spans,
      rowKeyMap,
      colKeyMap,
      rowTotals,
      colTotals,
      grandTotals
    };
  }, [devices, rows, columns, values, filters]);

  const getAvailableOptions = (field: string) => {
    return Array.from(new Set(devices.map(d => String(d[field as keyof Device] || 'N/A')))).sort();
  };

  return (
    <div className="flex h-[800px] border border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl transition-all duration-500">
      {/* Pivot Editor Sidebar */}
      {showEditor && (
        <div className="w-[340px] border-r border-slate-100 bg-white flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <span className="font-black text-[11px] uppercase text-slate-400 tracking-[0.15em]">PIVOT EDITOR</span>
            <Button variant="ghost" size="icon" onClick={() => setShowEditor(false)} className="h-6 w-6 text-slate-300 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-8 py-6">
            <div className="space-y-10">

              {/* Persistence (Internal UI) */}
              {savedPivots.length > 0 && (
                <div className="space-y-4 p-5 bg-sky-50/30 rounded-3xl border border-sky-100/50">
                  <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">Saved Views</label>
                   <Select onValueChange={loadPivot}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-white border-sky-100">
                      <SelectValue placeholder="Load Saved Pivot" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-sky-100">
                      {savedPivots.map(p => (
                        <div key={p.name} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 cursor-pointer group">
                          <SelectItem value={p.name} className="flex-1">{p.name}</SelectItem>
                          <Trash2 className="h-3.5 w-3.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); deletePivot(p.name); }} />
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Rows Section */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ROWS</label>
                  <SearchableAdd
                    options={availableFields.filter(f => !rows.find(r => r.field === f.value))}
                    onSelect={(val) => setRows([...rows, { field: val, order: 'asc', sortBy: 'field', showTotals: true }])}
                    placeholder="Search row field..."
                  />
                </div>
                <div className="space-y-4">
                  {rows.map((row, idx) => (
                    <div key={row.field} className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 space-y-5 shadow-sm group hover:border-slate-200 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <GripVertical className="h-3.5 w-3.5 text-slate-200" />
                          <span className="text-[12px] font-bold text-slate-700 tracking-tight">{availableFields.find(f => f.value === row.field)?.label}</span>
                        </div>
                        <X className="h-4.5 w-4.5 text-slate-300 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setRows(rows.filter(r => r.field !== row.field))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Order</label>
                          <Select value={row.order} onValueChange={(val: any) => {
                            const n = [...rows]; n[idx].order = val; setRows(n);
                          }}>
                            <SelectTrigger className="h-9 text-[11px] font-bold bg-white rounded-xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Sort by</label>
                          <Select value={row.sortBy} onValueChange={(val: any) => {
                            const n = [...rows]; n[idx].sortBy = val; setRows(n);
                          }}>
                            <SelectTrigger className="h-9 text-[11px] font-bold bg-white rounded-xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="field">Field</SelectItem>
                              <SelectItem value="value">Value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-100/50 mt-2">
                        <Checkbox
                          id={`rt-${idx}`}
                          checked={row.showTotals}
                          onCheckedChange={v => { const n = [...rows]; n[idx].showTotals = !!v; setRows(n); }}
                          className="w-4 h-4 rounded-md border-slate-200 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <label htmlFor={`rt-${idx}`} className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">Show totals</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columns Section */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">COLUMNS</label>
                  <SearchableAdd
                    options={availableFields.filter(f => !columns.find(c => c.field === f.value))}
                    onSelect={(val) => setColumns([...columns, { field: val, order: 'asc', sortBy: 'field', showTotals: true }])}
                    placeholder="Search column field..."
                  />
                </div>
                <div className="space-y-4">
                  {columns.map((col, idx) => (
                    <div key={col.field} className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 space-y-5 shadow-sm group hover:border-slate-200 transition-all">
                       <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <GripVertical className="h-3.5 w-3.5 text-slate-200" />
                          <span className="text-[12px] font-bold text-slate-700 tracking-tight">{availableFields.find(f => f.value === col.field)?.label}</span>
                        </div>
                        <X className="h-4.5 w-4.5 text-slate-300 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setColumns(columns.filter(c => c.field !== col.field))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Order</label>
                          <Select value={col.order} onValueChange={(val: any) => {
                            const n = [...columns]; n[idx].order = val; setColumns(n);
                          }}>
                            <SelectTrigger className="h-9 text-[11px] font-bold bg-white rounded-xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Sort by</label>
                          <Select value={col.sortBy} onValueChange={(val: any) => {
                            const n = [...columns]; n[idx].sortBy = val; setColumns(n);
                          }}>
                            <SelectTrigger className="h-9 text-[11px] font-bold bg-white rounded-xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="field">Field</SelectItem>
                              <SelectItem value="value">Value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-100/50 mt-2">
                        <Checkbox
                          id={`ct-${idx}`}
                          checked={col.showTotals}
                          onCheckedChange={v => { const n = [...columns]; n[idx].showTotals = !!v; setColumns(n); }}
                          className="w-4 h-4 rounded-md border-slate-200 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <label htmlFor={`ct-${idx}`} className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">Show totals</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                 <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">VALUES</label>
                  <SearchableAdd
                    options={availableFields}
                    onSelect={(val) => setValues([...values, { field: val, summarizeBy: 'SUM', showAs: 'default' }])}
                    placeholder="Search value field..."
                  />
                </div>
                <div className="space-y-4">
                  {values.map((v, idx) => (
                    <div key={`${v.field}-${idx}`} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6 shadow-sm group hover:border-slate-200 transition-all">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                          <GripVertical className="h-3.5 w-3.5 text-slate-200" />
                          <span className="text-[13px] font-bold text-slate-800 tracking-tight">{availableFields.find(f => f.value === v.field)?.label}</span>
                        </div>
                        <X className="h-5 w-5 text-slate-300 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setValues(values.filter((_, i) => i !== idx))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Summarize by</label>
                          <Select value={v.summarizeBy} onValueChange={(val: AggregationType) => {
                             const n = [...values]; n[idx].summarizeBy = val; setValues(n);
                          }}>
                            <SelectTrigger className="h-10 text-[12px] font-bold bg-white rounded-2xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl max-h-[300px]">
                              {['SUM', 'COUNTA', 'COUNT', 'COUNTUNIQUE', 'AVERAGE', 'MAX', 'MIN', 'MEDIAN', 'PRODUCT'].map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Show as</label>
                          <Select value={v.showAs} onValueChange={(val: any) => {
                             const n = [...values]; n[idx].showAs = val; setValues(n);
                          }}>
                            <SelectTrigger className="h-10 text-[12px] font-bold bg-white rounded-2xl border-slate-100 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="percentRow">% of row</SelectItem>
                              <SelectItem value="percentCol">% of column</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 pb-10">
                 <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">FILTERS</label>
                  <SearchableAdd
                    options={availableFields.filter(f => f.value !== '__record_count' && !filters.find(fi => fi.field === f.value))}
                    onSelect={(val) => setFilters([...filters, { field: val, selectedValues: [] }])}
                    placeholder="Search filter field..."
                  />
                </div>
                <div className="space-y-4">
                   {filters.map((f, idx) => (
                    <div key={f.field} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-[11px] font-bold text-slate-700">{availableFields.find(af => af.value === f.field)?.label}</span>
                         <X className="h-4 w-4 text-slate-300 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setFilters(filters.filter(fi => fi.field !== f.field))} />
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 text-[11px] justify-start px-4 rounded-xl bg-white border-slate-100 hover:bg-slate-50 shadow-none font-medium text-slate-500 overflow-hidden">
                             {f.selectedValues.length === 0 ? "Showing all items" : `Selected: ${f.selectedValues.join(', ')}`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="start">
                           <ScrollArea className="h-64 p-4">
                              <div className="space-y-2">
                                {getAvailableOptions(f.field).map(opt => (
                                  <div key={opt} className="flex items-center gap-3 py-1 cursor-pointer" onClick={() => {
                                    const n = [...filters];
                                    if (n[idx].selectedValues.includes(opt)) n[idx].selectedValues = n[idx].selectedValues.filter(v => v !== opt);
                                    else n[idx].selectedValues.push(opt);
                                    setFilters(n);
                                  }}>
                                    <div className={`w-4.5 h-4.5 rounded border-2 transition-colors flex items-center justify-center ${f.selectedValues.includes(opt) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                                      {f.selectedValues.includes(opt) && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{opt}</span>
                                  </div>
                                ))}
                              </div>
                           </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                   ))}
                </div>
              </div>

            </div>
          </ScrollArea>

          <div className="p-8 border-t border-slate-50">
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-lg border-[3px] flex items-center justify-center cursor-pointer transition-all duration-300 ${showTotals ? 'bg-sky-500 border-sky-500 shadow-lg shadow-sky-200' : 'border-slate-200'}`}
                onClick={() => setShowTotals(!showTotals)}
              >
                {showTotals && <Check className="w-4 h-4 text-white stroke-[4px]" />}
              </div>
              <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Show Totals</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditor(!showEditor)}
              className={cn("p-3 h-11 w-11 rounded-2xl shadow-sm border transition-all", showEditor ? "bg-sky-50 text-sky-500 border-sky-100" : "bg-slate-50 text-slate-400 border-slate-100")}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
            <div className="px-8 py-3 bg-slate-50/50 rounded-full border border-slate-100 shadow-inner group relative">
               <Input
                value={pivotTitle}
                onChange={e => setPivotTitle(e.target.value)}
                className="h-6 w-auto min-w-[150px] border-none bg-transparent shadow-none focus-visible:ring-0 px-0 text-base font-bold text-slate-800 placeholder:text-slate-300 text-center"
                placeholder="Enter Analysis Name..."
               />
               <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-sky-400 group-focus-within:w-1/2 transition-all duration-500 rounded-full" />
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
               <Check className="h-4.5 w-4.5 stroke-[3px]" />
            </div>
          </div>
          <div className="flex items-center gap-4">
             {!showEditor && (
              <Button variant="ghost" size="icon" onClick={() => setShowEditor(true)} className="h-10 w-10 text-slate-300 hover:text-sky-500 hover:bg-sky-50 rounded-2xl transition-all">
                <Plus className="h-6 w-6" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={savePivot} title="Save Pivot" className="h-10 w-10 text-slate-200 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all">
              <Save className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-slate-200 hover:text-red-400 hover:bg-red-50 rounded-2xl transition-all">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-slate-200 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-12">
          <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl bg-white">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b-0">
                    {rows.map((r, i) => (
                      <TableHead key={r.field} className={`text-[11px] font-black uppercase text-slate-400 border-r border-slate-100/50 px-8 h-16 sticky top-0 bg-slate-50/50 backdrop-blur-md z-10 ${i === rows.length - 1 ? 'border-r-4 border-slate-100' : ''}`}>
                        {availableFields.find(f => f.value === r.field)?.label}
                      </TableHead>
                    ))}
                    {columns.length > 0 && pivotData.columns.map((col) => (
                      <TableHead key={col} className="text-[11px] font-black uppercase text-slate-400 text-center border-r border-slate-100/50 px-8 h-16 min-w-[150px] sticky top-0 bg-slate-50/50 backdrop-blur-md z-10">
                        {col || '(Blank)'}
                      </TableHead>
                    ))}
                    {(columns.length > 0 || (rows.length > 0 && values.length > 0)) && (
                      <TableHead className="text-[11px] font-black uppercase text-slate-400 text-center px-8 h-16 min-w-[150px] sticky top-0 bg-slate-50/50 backdrop-blur-md z-10">
                        {columns.length === 0 && values.length === 1 ? availableFields.find(f => f.value === values[0].field)?.label : 'TOTAL'}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotData.rowKeys.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={rows.length + pivotData.columns.length + 1} className="text-center py-48">
                         <div className="flex flex-col items-center gap-6 opacity-30">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                               <Settings2 className="w-10 h-10 text-slate-400" />
                            </div>
                            <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Select dimensions to begin analysis</span>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {pivotData.rowKeys.map((rowKey, rowIdx) => {
                        const rowParts = pivotData.rowKeyMap[rowKey];
                        const rowCells = pivotData.data[rowKey];

                        return (
                          <TableRow key={rowKey} className="hover:bg-slate-50/40 transition-colors border-b border-slate-50 last:border-0 group">
                            {rows.map((_, colIdx) => {
                              const span = pivotData.spans[rowIdx][colIdx];
                              if (span === 0) return null;
                              return (
                                <TableCell
                                  key={colIdx}
                                  rowSpan={span}
                                  className={`text-[13px] font-bold text-slate-700 border-r border-slate-100/50 px-8 bg-white/50 align-top pt-5 group-hover:bg-white transition-all ${colIdx === rows.length - 1 ? 'border-r-4 border-slate-100' : ''}`}
                                >
                                  {rowParts[colIdx]}
                                </TableCell>
                              );
                            })}

                            {columns.length > 0 && pivotData.columns.map((colKey) => {
                              const cellFields = rowCells[colKey] || {};
                              // Sum all values for the cell if multiple value fields exist
                              const val = Object.values(cellFields).reduce((a, b) => a + (b as number), 0);
                              const isPercent = values.some(v => v.showAs !== 'default');

                              return (
                                <TableCell key={colKey} className="text-[13px] text-center border-r border-slate-50/50 px-8 text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                                  {val === 0 ? '-' : isPercent ? `${val.toFixed(1)}%` : val.toLocaleString()}
                                </TableCell>
                              );
                            })}

                            {/* Row Total / Main Value */}
                            {(columns.length > 0 || (rows.length > 0 && values.length > 0)) && (
                              <TableCell className={cn(
                                "text-[13px] text-center font-black px-8 group-hover:text-sky-600 transition-all",
                                columns.length === 0 ? "bg-white" : "bg-slate-50/20 text-slate-900 group-hover:bg-sky-50/30"
                              )}>
                                {(() => {
                                  if (columns.length === 0) {
                                    const cellFields = rowCells["__default__"] || {};
                                    const val = Object.values(cellFields).reduce((a, b) => a + (b as number), 0);
                                    const isPercent = values.some(v => v.showAs !== 'default');
                                    return val === 0 ? '-' : isPercent ? `${val.toFixed(1)}%` : val.toLocaleString();
                                  } else {
                                    // Row Total across all columns
                                    const total = Object.values(pivotData.rowTotals[rowKey]).reduce((a, b) => a + b, 0);
                                    return total.toLocaleString();
                                  }
                                })()}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                      {showTotals && (
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-t-4 border-slate-100">
                          <TableCell colSpan={rows.length} className="text-[11px] font-black uppercase border-r-4 border-slate-100 px-8 h-20 text-slate-500 tracking-[0.1em]">
                            GRAND TOTAL
                          </TableCell>
                          {columns.length > 0 && pivotData.columns.map((colKey) => {
                            const total = Object.values(pivotData.colTotals[colKey] || {}).reduce((a, b) => a + b, 0);
                            return (
                              <TableCell key={colKey} className="text-[14px] text-center font-black border-r border-slate-100/50 px-8 h-20 text-slate-900">
                                {total.toLocaleString()}
                              </TableCell>
                            );
                          })}
                          <TableCell className={cn(
                            "text-[16px] text-center font-black px-8 h-20 text-sky-600 bg-sky-50/50",
                            columns.length === 0 && "border-l border-slate-100/50"
                          )}>
                            {Object.values(pivotData.grandTotals).reduce((a, b) => a + b, 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PivotTable;