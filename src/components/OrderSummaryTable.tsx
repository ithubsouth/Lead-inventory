import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { OrderSummary, Device } from './types';
import { formatDate } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiSelect from './MultiSelect';
import { DatePickerWithRange } from './DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderSummary {
  warehouse: string;
  asset_type: 'Tablet' | 'TV' | 'SD Card' | 'Pendrive';
  model: string;
  inward?: number;
  outward?: number;
  stock?: number;
  inwardAssetStatusCounts?: Record<string, number>;
  outwardAssetStatusCounts?: Record<string, number>;
  stockAssetStatusCounts?: Record<string, number>;
}

interface OrderSummaryTableProps {
  devices: Device[];
  selectedWarehouse: string[];
  setSelectedWarehouse: (value: string[]) => void;
  selectedAssetType: string[];
  setSelectedAssetType: (value: string[]) => void;
  selectedModel: string[];
  setSelectedModel: (value: string[]) => void;
  selectedAssetStatus: string[];
  setSelectedAssetStatus: (value: string[]) => void;
  selectedAssetGroup: string[];
  setSelectedAssetGroup: (value: string[]) => void;
  selectedProduct: string[];
  setSelectedProduct: (value: string[]) => void;
  selectedAssetCondition: string[];
  setSelectedAssetCondition: (value: string[]) => void;
  fromDate: DateRange | undefined;
  setFromDate: (range: DateRange | undefined) => void;
  showDeleted: boolean;
  setShowDeleted: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const OrderSummaryTable: React.FC<OrderSummaryTableProps> = ({
  devices,
  selectedWarehouse,
  setSelectedWarehouse,
  selectedAssetType,
  setSelectedAssetType,
  selectedModel,
  setSelectedModel,
  selectedAssetStatus,
  setSelectedAssetStatus,
  selectedAssetGroup,
  setSelectedAssetGroup,
  selectedProduct,
  setSelectedProduct,
  selectedAssetCondition,
  setSelectedAssetCondition,
  fromDate,
  setFromDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [summaryType, setSummaryType] = useState<'stock' | 'stockSplit'>('stock');

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  // Filter active devices for filter options
  const activeDevices = useMemo(() => devices.filter(d => !d.is_deleted), [devices]);

  // Dynamic filter options
  const uniqueValues = useMemo(() => {
    let filteredDevices = activeDevices;

    if (fromDate?.from) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') >= new Date(fromDate.from));
    }
    if (fromDate?.to) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') <= new Date(fromDate.to));
    }

    return {
      warehouses: [...new Set(filteredDevices.map(d => d.warehouse || '').filter(Boolean))].sort() as string[],
      assetTypes: [...new Set(filteredDevices.map(d => d.asset_type || '').filter(Boolean))].sort() as string[],
      models: [...new Set(filteredDevices.map(d => d.model || '').filter(Boolean))].sort() as string[],
      products: [...new Set(filteredDevices.map(d => d.product || '').filter(Boolean))].sort() as string[],
      assetStatuses: [...new Set(filteredDevices.map(d => d.asset_status || '').filter(Boolean))].sort() as string[],
      assetGroups: [...new Set(filteredDevices.map(d => d.asset_group || '').filter(Boolean))].sort() as string[],
      assetConditions: [...new Set(filteredDevices.map(d => d.asset_condition || '').filter(Boolean))].sort() as string[],
    };
  }, [activeDevices, fromDate]);

  // Reset invalid selections
  useEffect(() => {
    if (selectedWarehouse.length > 0 && !selectedWarehouse.every(w => uniqueValues.warehouses.includes(w))) {
      setSelectedWarehouse([]);
    }
  }, [uniqueValues.warehouses, selectedWarehouse, setSelectedWarehouse]);

  useEffect(() => {
    if (selectedAssetType.length > 0 && !selectedAssetType.every(a => uniqueValues.assetTypes.includes(a))) {
      setSelectedAssetType([]);
      setSelectedModel([]);
    }
  }, [uniqueValues.assetTypes, selectedAssetType, setSelectedAssetType, setSelectedModel]);

  useEffect(() => {
    if (selectedModel.length > 0 && !selectedModel.every(m => uniqueValues.models.includes(m))) {
      setSelectedModel([]);
    }
  }, [uniqueValues.models, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (selectedProduct.length > 0 && !selectedProduct.every(p => uniqueValues.products.includes(p))) {
      setSelectedProduct([]);
    }
  }, [uniqueValues.products, selectedProduct, setSelectedProduct]);

  useEffect(() => {
    if (selectedAssetStatus.length > 0 && !selectedAssetStatus.every(s => uniqueValues.assetStatuses.includes(s))) {
      setSelectedAssetStatus([]);
    }
  }, [uniqueValues.assetStatuses, selectedAssetStatus, setSelectedAssetStatus]);

  useEffect(() => {
    if (selectedAssetGroup.length > 0 && !selectedAssetGroup.every(g => uniqueValues.assetGroups.includes(g))) {
      setSelectedAssetGroup([]);
    }
  }, [uniqueValues.assetGroups, selectedAssetGroup, setSelectedAssetGroup]);

  useEffect(() => {
    if (selectedAssetCondition.length > 0 && !selectedAssetCondition.every(c => uniqueValues.assetConditions.includes(c))) {
      setSelectedAssetCondition([]);
    }
  }, [uniqueValues.assetConditions, selectedAssetCondition, setSelectedAssetCondition]);

  // Compute summaries
  const summaries = useMemo(() => {
    console.log('Computing summaries with devices:', devices.length);
    let filteredDevices = showDeleted ? devices : activeDevices;

    // Apply filters
    if (selectedWarehouse.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedWarehouse.includes(d.warehouse || ''));
    }
    if (selectedAssetType.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedAssetType.includes(d.asset_type || ''));
    }
    if (selectedModel.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedModel.includes(d.model || ''));
    }
    if (selectedProduct.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedProduct.includes(d.product || ''));
    }
    if (selectedAssetStatus.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedAssetStatus.includes(d.asset_status || ''));
    }
    if (selectedAssetGroup.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedAssetGroup.includes(d.asset_group || ''));
    }
    if (selectedAssetCondition.length > 0) {
      filteredDevices = filteredDevices.filter(d => selectedAssetCondition.includes(d.asset_condition || ''));
    }
    if (fromDate?.from) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') >= new Date(fromDate.from));
    }
    if (fromDate?.to) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') <= new Date(fromDate.to));
    }

    const summaryMap = new Map<string, OrderSummary>();

    filteredDevices.forEach((d) => {
      if (!d.warehouse || !d.asset_type || !d.model) return;

      // Main device summary
      const key = `${d.warehouse}-${d.asset_type}-${d.model}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          warehouse: d.warehouse,
          asset_type: d.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive',
          model: d.model,
          inward: 0,
          outward: 0,
          stock: 0,
          inwardAssetStatusCounts: {},
          outwardAssetStatusCounts: {},
          stockAssetStatusCounts: {},
        });
      }
      const s = summaryMap.get(key)!;
      const status = d.asset_status || 'Unknown';
      const isInward = d.transaction_type === 'Inward' || (!d.transaction_type && d.status !== 'Assigned');

      if (isInward) {
        s.inward! += 1;
        s.inwardAssetStatusCounts![status] = (s.inwardAssetStatusCounts![status] || 0) + 1;
      }
      if (d.status === 'Assigned') {
        s.outward! += 1;
        s.outwardAssetStatusCounts![status] = (s.outwardAssetStatusCounts![status] || 0) + 1;
      }
      s.stock = s.inward! - s.outward!;
      s.stockAssetStatusCounts![status] = (s.inwardAssetStatusCounts![status] || 0) - (s.outwardAssetStatusCounts![status] || 0);

      // SD Card summary (only for Tablets with sd_card_size)
      if (d.asset_type === 'Tablet' && d.sd_card_size) {
        const sdKey = `${d.warehouse}-SD Card-${d.sd_card_size}`;
        if (!summaryMap.has(sdKey)) {
          summaryMap.set(sdKey, {
            warehouse: d.warehouse,
            asset_type: 'SD Card',
            model: d.sd_card_size,
            inward: 0,
            outward: 0,
            stock: 0,
            inwardAssetStatusCounts: {},
            outwardAssetStatusCounts: {},
            stockAssetStatusCounts: {},
          });
        }
        const sd = summaryMap.get(sdKey)!;
        const sdStatus = d.asset_status || 'Unknown'; // SD Card inherits Tablet's status
        if (isInward) {
          sd.inward! += 1;
          sd.inwardAssetStatusCounts![sdStatus] = (sd.inwardAssetStatusCounts![sdStatus] || 0) + 1;
        }
        if (d.status === 'Assigned') {
          sd.outward! += 1;
          sd.outwardAssetStatusCounts![sdStatus] = (sd.outwardAssetStatusCounts![sdStatus] || 0) + 1;
        }
        sd.stock = sd.inward! - sd.outward!;
        sd.stockAssetStatusCounts![sdStatus] = (sd.inwardAssetStatusCounts![sdStatus] || 0) - (sd.outwardAssetStatusCounts![sdStatus] || 0);
      }
    });

    let computedSummaries = Array.from(summaryMap.values());
    console.log('Computed Summaries:', computedSummaries);

    // Filter out zero counts for non-deleted view
    if (!showDeleted) {
      computedSummaries = computedSummaries.filter(s =>
        summaryType === 'stock'
          ? s.inward! > 0 || s.outward! > 0
          : s.stock! > 0 || Object.values(s.inwardAssetStatusCounts || {}).some(count => count > 0) || Object.values(s.outwardAssetStatusCounts || {}).some(count => count > 0) || Object.values(s.stockAssetStatusCounts || {}).some(count => count > 0)
      );
    }

    // Apply search query
    if (searchQuery) {
      computedSummaries = computedSummaries.filter(s =>
        [s.warehouse, s.asset_type, s.model].some(field =>
          field?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Sort summaries
    computedSummaries.sort((a, b) =>
      (a.warehouse || '').localeCompare(b.warehouse || '') ||
      (a.asset_type || '').localeCompare(b.asset_type || '') ||
      (a.model || '').localeCompare(b.model || '')
    );

    return computedSummaries;
  }, [
    devices,
    showDeleted,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    selectedAssetCondition,
    fromDate,
    searchQuery,
    summaryType,
  ]);

  // Get unique asset statuses for Stock Split columns
  const assetStatusColumns = useMemo(() => {
    if (summaryType === 'stockSplit') {
      const cols = [...new Set([
        ...summaries.flatMap(s => Object.keys(s.inwardAssetStatusCounts || {})),
        ...summaries.flatMap(s => Object.keys(s.outwardAssetStatusCounts || {})),
        ...summaries.flatMap(s => Object.keys(s.stockAssetStatusCounts || {})),
      ])].sort();
      console.log('Asset Status Columns:', cols);
      return cols;
    }
    return [];
  }, [summaries, summaryType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    selectedAssetCondition,
    fromDate,
    showDeleted,
    searchQuery,
    rowsPerPage,
    summaryType,
  ]);

  const paginatedSummary = useMemo(() => {
    console.log('Paginating summaries:', summaries.length, 'from', (currentPage - 1) * rowsPerPage, 'to', currentPage * rowsPerPage);
    return summaries.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [summaries, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(summaries.length / rowsPerPage);

  const siblingCount = 2;
  const pageRange = [];
  for (let i = Math.max(1, currentPage - siblingCount); i <= Math.min(totalPages, currentPage + siblingCount); i++) {
    pageRange.push(i);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalPages) pageRange.push(totalPages);

  const downloadCSV = (data: OrderSummary[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    let headers: string[];
    let rows: string[];

    if (summaryType === 'stock') {
      headers = ['Warehouse', 'Asset Type', 'Model', 'Inward', 'Outward', 'Stock'];
      rows = data.map((row) =>
        [
          row.warehouse,
          row.asset_type,
          row.model,
          row.inward,
          row.outward,
          row.stock,
        ].map((value) => (typeof value === 'string' && value.includes(',') ? `"${value}"` : value ?? '')).join(',')
      );
    } else {
      headers = ['Warehouse', 'Asset Type', 'Model', ...assetStatusColumns.map(s => `Inward ${s}`), ...assetStatusColumns.map(s => `Outward ${s}`), ...assetStatusColumns.map(s => `Stock ${s}`)];
      rows = data.map((row) =>
        [
          row.warehouse,
          row.asset_type,
          row.model,
          ...assetStatusColumns.map(status => row.inwardAssetStatusCounts?.[status] || 0),
          ...assetStatusColumns.map(status => row.outwardAssetStatusCounts?.[status] || 0),
          ...assetStatusColumns.map(status => row.stockAssetStatusCounts?.[status] || 0),
        ].map((value) => (typeof value === 'string' && value.includes(',') ? `"${value}"` : value ?? '')).join(',')
      );
    }

    const csvContent = [
      headers.join(','),
      ...rows,
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedWarehouse([]);
    setSelectedAssetType([]);
    setSelectedModel([]);
    setSelectedAssetStatus([]);
    setSelectedAssetGroup([]);
    setSelectedProduct([]);
    setSelectedAssetCondition([]);
    setFromDate(undefined);
    setSearchQuery('');
    setShowDeleted(false);
    setSummaryType('stockSplit');
    setCurrentPage(1);
  };

  const columnWidths = {
    warehouse: '150px',
    asset_type: '120px',
    model: '150px',
    inward: '80px',
    outward: '80px',
    stock: '80px',
    assetStatus: '100px',
  };

  const headerStyle = (top: string | number) => ({
    fontSize: '12px',
    padding: '8px',
    borderBottom: '1px solid #d1d5db',
    textAlign: 'left',
    position: 'sticky',
    top: typeof top === 'number' ? `${top}px` : top,
    background: '#fff',
    zIndex: 20,
  });

  const subHeaderStyle = (top: string | number) => ({
    ...headerStyle(top),
    textAlign: 'center',
  });

  const groupHeaderHeight = '28px';

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px' }}>
      <CardHeader style={{ paddingBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '12px' }}>
            {summaryType === 'stock' ? 'Order Summary' : 'Stock Split'}
          </CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Select
              value={summaryType}
              onValueChange={(value: 'stock' | 'stockSplit') => setSummaryType(value)}
            >
              <SelectTrigger style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', height: '28px', width: '120px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="stockSplit">Stock Split</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ paddingTop: '2px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: '#6b7280' }} />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Warehouse, Asset Type, or Model"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', height: '28px' }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={() => downloadCSV(summaries, `order_summary_${summaryType}.csv`)}
            >
              <Download style={{ width: '12px', height: '12px' }} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? 'Show Active' : 'Show Deleted'}
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', maxWidth: '1200px', overflowX: 'auto', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
            <MultiSelect
              id="warehouseFilter"
              label="Warehouse"
              options={uniqueValues.warehouses}
              value={selectedWarehouse}
              onChange={(value) => {
                setSelectedWarehouse(value);
                setSelectedAssetType([]);
                setSelectedModel([]);
                setSelectedAssetStatus([]);
                setSelectedAssetGroup([]);
                setSelectedProduct([]);
                setSelectedAssetCondition([]);
              }}
              placeholder="Select Warehouses"
            />
            <MultiSelect
              id="assetTypeFilter"
              label="Asset Type"
              options={uniqueValues.assetTypes}
              value={selectedAssetType}
              onChange={(value) => {
                setSelectedAssetType(value);
                setSelectedModel([]);
                setSelectedAssetCondition([]);
              }}
              placeholder="Select Asset Types"
            />
            <MultiSelect
              id="modelFilter"
              label="Model"
              options={uniqueValues.models}
              value={selectedModel}
              onChange={setSelectedModel}
              placeholder="Select Models"
            />
            <MultiSelect
              id="productFilter"
              label="Product"
              options={uniqueValues.products}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Select Products"
            />
            <MultiSelect
              id="assetStatusFilter"
              label="Asset Status"
              options={uniqueValues.assetStatuses}
              value={selectedAssetStatus}
              onChange={setSelectedAssetStatus}
              placeholder="Select Asset Statuses"
            />
            <MultiSelect
              id="assetGroupFilter"
              label="Asset Group"
              options={uniqueValues.assetGroups}
              value={selectedAssetGroup}
              onChange={setSelectedAssetGroup}
              placeholder="Select Asset Groups"
            />
            <MultiSelect
              id="assetConditionFilter"
              label="Asset Condition"
              options={uniqueValues.assetConditions}
              value={selectedAssetCondition}
              onChange={setSelectedAssetCondition}
              placeholder="Select Asset Conditions"
            />
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label htmlFor="dateRangeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Date Range</label>
              <DatePickerWithRange
                date={fromDate}
                setDate={setFromDate}
                className="h-7 w-full"
                style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px' }}
              />
            </div>
          </div>
        </div>

        {devices.length === 0 ? (
          <div style={{ fontSize: '12px', padding: '8px' }}>No devices available. Load devices or check your database.</div>
        ) : summaries.length === 0 ? (
          <div style={{ fontSize: '12px', padding: '8px' }}>No summary data found with current filters. Try adjusting the filters.</div>
        ) : (
          <>
            <div
              style={{
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: '400px',
                position: 'relative',
              }}
            >
              <Table style={{ minWidth: '800px' }}>
                <TableHeader>
                  {summaryType === 'stock' ? (
                    <TableRow>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.warehouse }}>Warehouse</TableHead>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.asset_type }}>Asset Type</TableHead>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.model }}>Model</TableHead>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.inward, textAlign: 'center' }}>Inward</TableHead>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.outward, textAlign: 'center' }}>Outward</TableHead>
                      <TableHead style={{ ...headerStyle(0), width: columnWidths.stock, textAlign: 'center' }}>Stock</TableHead>
                    </TableRow>
                  ) : (
                    <>
                      <TableRow>
                        <TableHead rowSpan={2} style={{ ...headerStyle(0), width: columnWidths.warehouse }}>Warehouse</TableHead>
                        <TableHead rowSpan={2} style={{ ...headerStyle(0), width: columnWidths.asset_type }}>Asset Type</TableHead>
                        <TableHead rowSpan={2} style={{ ...headerStyle(0), width: columnWidths.model, borderRight: '1px solid #d1d5db' }}>Model</TableHead>
                        <TableHead colSpan={assetStatusColumns.length} style={{ ...headerStyle(0), textAlign: 'center', borderRight: '1px solid #d1d5db' }}>Inward</TableHead>
                        <TableHead colSpan={assetStatusColumns.length} style={{ ...headerStyle(0), textAlign: 'center', borderRight: '1px solid #d1d5db' }}>Outward</TableHead>
                        <TableHead colSpan={assetStatusColumns.length} style={{ ...headerStyle(0), textAlign: 'center' }}>Stock</TableHead>
                      </TableRow>
                      <TableRow>
                        {assetStatusColumns.map((status, idx) => (
                          <TableHead
                            key={`inward-${status}`}
                            style={{
                              ...subHeaderStyle(groupHeaderHeight),
                              width: columnWidths.assetStatus,
                              borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                            }}
                          >
                            {status}
                          </TableHead>
                        ))}
                        {assetStatusColumns.map((status, idx) => (
                          <TableHead
                            key={`outward-${status}`}
                            style={{
                              ...subHeaderStyle(groupHeaderHeight),
                              width: columnWidths.assetStatus,
                              borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                            }}
                          >
                            {status}
                          </TableHead>
                        ))}
                        {assetStatusColumns.map((status, idx) => (
                          <TableHead
                            key={`stock-${status}`}
                            style={{
                              ...subHeaderStyle(groupHeaderHeight),
                              width: columnWidths.assetStatus,
                              borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                            }}
                          >
                            {status}
                          </TableHead>
                        ))}
                      </TableRow>
                    </>
                  )}
                </TableHeader>
                <TableBody>
                  {paginatedSummary.map((summary, index) => (
                    <TableRow key={`${summary.warehouse}-${summary.asset_type}-${summary.model}-${index}`}>
                      <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{summary.warehouse}</TableCell>
                      <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{summary.asset_type}</TableCell>
                      <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model, borderRight: '1px solid #d1d5db' }}>{summary.model}</TableCell>
                      {summaryType === 'stock' ? (
                        <>
                          <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.inward, textAlign: 'center' }}>{summary.inward}</TableCell>
                          <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.outward, textAlign: 'center' }}>{summary.outward}</TableCell>
                          <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.stock, textAlign: 'center' }}>{summary.stock}</TableCell>
                        </>
                      ) : (
                        <>
                          {assetStatusColumns.map((status, idx) => (
                            <TableCell
                              key={`inward-${status}`}
                              style={{
                                fontSize: '12px',
                                padding: '8px',
                                borderBottom: '1px solid #d1d5db',
                                width: columnWidths.assetStatus,
                                textAlign: 'center',
                                borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                              }}
                            >
                              {summary.inwardAssetStatusCounts?.[status] || 0}
                            </TableCell>
                          ))}
                          {assetStatusColumns.map((status, idx) => (
                            <TableCell
                              key={`outward-${status}`}
                              style={{
                                fontSize: '12px',
                                padding: '8px',
                                borderBottom: '1px solid #d1d5db',
                                width: columnWidths.assetStatus,
                                textAlign: 'center',
                                borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                              }}
                            >
                              {summary.outwardAssetStatusCounts?.[status] || 0}
                            </TableCell>
                          ))}
                          {assetStatusColumns.map((status, idx) => (
                            <TableCell
                              key={`stock-${status}`}
                              style={{
                                fontSize: '12px',
                                padding: '8px',
                                borderBottom: '1px solid #d1d5db',
                                width: columnWidths.assetStatus,
                                textAlign: 'center',
                                borderRight: idx === assetStatusColumns.length - 1 ? '1px solid #d1d5db' : 'none',
                              }}
                            >
                              {summary.stockAssetStatusCounts?.[status] || 0}
                            </TableCell>
                          ))}
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, summaries.length)} of {summaries.length} summaries</span>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', height: '28px' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1 }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                {pageRange.map((page, index) => (
                  <Button
                    key={index}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      background: currentPage === page ? '#3b82f6' : '#fff',
                      color: currentPage === page ? '#fff' : '#000',
                      cursor: typeof page === 'number' ? 'pointer' : 'default',
                      fontSize: '12px',
                      opacity: typeof page === 'number' ? 1 : 0.5,
                    }}
                    disabled={typeof page !== 'number'}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderSummaryTable;