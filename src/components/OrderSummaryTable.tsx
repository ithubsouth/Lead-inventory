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
  fromDate,
  setFromDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      warehouses: [...new Set(filteredDevices.map(d => d.warehouse).filter(Boolean))].sort() as string[],
      assetTypes: [...new Set(filteredDevices.map(d => d.asset_type).filter(Boolean))].sort() as string[],
      models: [...new Set(filteredDevices.map(d => d.model).filter(Boolean))].sort() as string[],
      products: [...new Set(filteredDevices.map(d => d.product).filter(Boolean))].sort() as string[],
      assetStatuses: [...new Set(filteredDevices.map(d => d.asset_status).filter(Boolean))].sort() as string[],
      assetGroups: [...new Set(filteredDevices.map(d => d.asset_group).filter(Boolean))].sort() as string[],
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

  // Compute summaries
  const summaries = useMemo(() => {
    let filteredDevices = showDeleted ? devices : activeDevices;

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
    if (fromDate?.from) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') >= new Date(fromDate.from));
    }
    if (fromDate?.to) {
      filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') <= new Date(fromDate.to));
    }

    const summaryMap = new Map<string, OrderSummary>();

    filteredDevices.forEach((d) => {
      if (!d.warehouse || !d.asset_type || !d.model) return;

      const key = `${d.warehouse}-${d.asset_type}-${d.model}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          warehouse: d.warehouse,
          asset_type: d.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive',
          model: d.model,
          inward: 0,
          outward: 0,
          stock: 0,
        });
      }
      const s = summaryMap.get(key)!;
      if (d.transaction_type === 'Inward' || (!d.transaction_type && d.status !== 'Assigned')) {
        s.inward += 1;
      }
      if (d.status === 'Assigned') {
        s.outward += 1;
      }

      if (d.asset_type === 'Tablet' && d.sd_card_size && (d.transaction_type === 'Inward' || (!d.transaction_type && d.status !== 'Assigned'))) {
        const sdKey = `${d.warehouse}-SD Card-${d.sd_card_size}`;
        if (!summaryMap.has(sdKey)) {
          summaryMap.set(sdKey, {
            warehouse: d.warehouse,
            asset_type: 'SD Card',
            model: d.sd_card_size,
            inward: 0,
            outward: 0,
            stock: 0,
          });
        }
        const sd = summaryMap.get(sdKey)!;
        sd.inward += 1;
        if (d.status === 'Assigned') {
          sd.outward += 1;
        }
      }
    });

    for (let [, s] of summaryMap) {
      s.stock = s.inward - s.outward;
    }

    let computedSummaries = Array.from(summaryMap.values());

    if (!showDeleted) {
      computedSummaries = computedSummaries.filter(s => s.inward > 0 || s.outward > 0);
    }

    if (searchQuery) {
      computedSummaries = computedSummaries.filter(s =>
        [s.warehouse, s.asset_type, s.model].some(field =>
          field?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

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
    fromDate,
    searchQuery,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    fromDate,
    showDeleted,
    searchQuery,
    rowsPerPage,
  ]);

  const paginatedSummary = useMemo(() => {
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
    const headers = ['Warehouse', 'Asset Type', 'Model', 'Inward', 'Outward', 'Stock'];
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        [
          row.warehouse,
          row.asset_type,
          row.model,
          row.inward,
          row.outward,
          row.stock,
        ].map((value) => (typeof value === 'string' && value.includes(',') ? `"${value}"` : value ?? '')).join(',')
      ),
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
    setFromDate(undefined);
    setSearchQuery('');
    setShowDeleted(false);
    setCurrentPage(1);
  };

  const columnWidths = {
    warehouse: '150px',
    asset_type: '120px',
    model: '150px',
    inward: '80px',
    outward: '80px',
    stock: '80px',
  };

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px' }}>
      <CardHeader style={{ paddingBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '12px' }}>
            Order Summary
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
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
              onClick={() => downloadCSV(summaries, 'order_summary_export.csv')}
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
                  <TableRow>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.warehouse }}>Warehouse</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_type }}>Asset Type</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.model }}>Model</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.inward }}>Inward</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.outward }}>Outward</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.stock }}>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No summary data found with current filters. Try adjusting the filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSummary.map((summary, index) => (
                      <TableRow key={`${summary.warehouse}-${summary.asset_type}-${summary.model}-${index}`}>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{summary.warehouse}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{summary.asset_type}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{summary.model}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.inward }}>{summary.inward}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.outward }}>{summary.outward}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.stock }}>{summary.stock}</TableCell>
                      </TableRow>
                    ))
                  )}
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