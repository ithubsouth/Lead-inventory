import React, { useMemo, useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Search } from 'lucide-react';
import { DatePickerWithRange } from './DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { Device } from './types';
import debounce from 'lodash/debounce';

interface AuditTableProps {
  devices: Device[];
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedAssetType: string;
  setSelectedAssetType: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedAssetStatus: string;
  setSelectedAssetStatus: (value: string) => void;
  selectedConfiguration: string;
  setSelectedConfiguration: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
  selectedOrderType: string;
  setSelectedOrderType: (value: string) => void;
  selectedAssetGroup: string;
  setSelectedAssetGroup: (value: string) => void;
  fromDate: DateRange | undefined;
  setFromDate: (range: DateRange | undefined) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onUpdateAssetCheck: (deviceId: string, checkStatus: string) => Promise<void>;
  onClearAllChecks: (ids: string[]) => Promise<void>;
  userRole: string;
}

const AuditTable: React.FC<AuditTableProps> = ({
  devices,
  selectedWarehouse,
  setSelectedWarehouse,
  selectedAssetType,
  setSelectedAssetType,
  selectedModel,
  setSelectedModel,
  selectedAssetStatus,
  setSelectedAssetStatus,
  selectedConfiguration,
  setSelectedConfiguration,
  selectedProduct,
  setSelectedProduct,
  selectedOrderType,
  setSelectedOrderType,
  selectedAssetGroup,
  setSelectedAssetGroup,
  fromDate,
  setFromDate,
  searchQuery,
  setSearchQuery,
  onUpdateAssetCheck,
  onClearAllChecks,
  userRole,
}) => {
  const [scannerInput, setScannerInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCheck, setFilterCheck] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [showPopup, setShowPopup] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingDeviceId, setUpdatingDeviceId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const rowsPerPage = 10;

  React.useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => setScanResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const uniqueValues = useMemo(() => {
    // Pre-filter devices for status and deletion
    const latestDevices = new Map<string, Device>();
    devices.forEach((d) => {
      const key = d.serial_number || d.id;
      const existing = latestDevices.get(key);
      if (!existing || new Date(d.updated_at) > new Date(existing.updated_at)) {
        latestDevices.set(key, d);
      }
    });
    const stockDevices = Array.from(latestDevices.values()).filter(
      (d) => d.status === 'Stock' && !d.is_deleted
    );

    // Apply all filters except the one being computed to get relevant devices
    const getFilteredDevices = (
      excludeFilter: keyof typeof selectedFilters
    ) => {
      const selectedFilters = {
        warehouse: selectedWarehouse,
        assetType: selectedAssetType,
        model: selectedModel,
        configuration: selectedConfiguration,
        product: selectedProduct,
        assetStatus: selectedAssetStatus,
        assetGroup: selectedAssetGroup,
        orderType: selectedOrderType,
        assetCheck: filterCheck,
        fromDate,
      };

      return stockDevices.filter((d) => {
        const matches = Object.keys(selectedFilters)
          .filter((key) => key !== excludeFilter)
          .every((key) => {
            if (key === 'fromDate') {
              if (!fromDate?.from || !fromDate?.to) return true;
              const updatedAt = new Date(d.updated_at);
              return updatedAt >= new Date(fromDate.from!) && updatedAt <= new Date(fromDate.to!);
            }
            if (key === 'assetCheck') {
              return filterCheck === 'all' ||
                (filterCheck === 'matched' && d.asset_check === 'Matched') ||
                (filterCheck === 'unmatched' && d.asset_check !== 'Matched');
            }
            const filterValue = selectedFilters[key as keyof typeof selectedFilters];
            return filterValue === 'All' || d[key as keyof Device] === filterValue;
          });
        const searchMatch =
          searchQuery.trim() === '' ||
          [
            d.serial_number,
            d.model,
            d.asset_type,
            d.configuration,
            d.product,
            d.asset_status,
            d.asset_group,
            d.warehouse,
            d.order_type,
            d.sales_order,
            d.deal_id,
            d.nucleus_id,
            d.school_name,
            d.asset_check || '',
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));
        return matches && searchMatch;
      });
    };

    return {
      warehouses: ['All', ...[...new Set(getFilteredDevices('warehouse').map((d) => d.warehouse || ''))].filter(Boolean).sort()],
      assetTypes: ['All', ...[...new Set(getFilteredDevices('assetType').map((d) => d.asset_type || ''))].filter(Boolean).sort()],
      models: ['All', ...[...new Set(getFilteredDevices('model').map((d) => d.model || ''))].filter(Boolean).sort()],
      configurations: ['All', ...[...new Set(getFilteredDevices('configuration').map((d) => d.configuration || ''))].filter(Boolean).sort()],
      products: ['All', ...[...new Set(getFilteredDevices('product').map((d) => d.product || ''))].filter(Boolean).sort()],
      assetStatuses: ['All', ...[...new Set(getFilteredDevices('assetStatus').map((d) => d.asset_status || ''))].filter(Boolean).sort()],
      assetGroups: ['All', ...[...new Set(getFilteredDevices('assetGroup').map((d) => d.asset_group || ''))].filter(Boolean).sort()],
      orderTypes: ['All', ...[...new Set(getFilteredDevices('orderType').map((d) => d.order_type || ''))].filter(Boolean).sort()],
    };
  }, [
    devices,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    selectedOrderType,
    filterCheck,
    fromDate,
    searchQuery,
  ]);

  const filteredDevices = useMemo(() => {
    const latestDevices = new Map<string, Device>();
    devices.forEach((d) => {
      const key = d.serial_number || d.id;
      const existing = latestDevices.get(key);
      if (!existing || new Date(d.updated_at) > new Date(existing.updated_at)) {
        latestDevices.set(key, d);
      }
    });

    const latestStockDevices = Array.from(latestDevices.values()).filter(
      (d) => d.status === 'Stock' && !d.is_deleted
    );

    return latestStockDevices.filter((d) => {
      const warehouseMatch = selectedWarehouse === 'All' || d.warehouse === selectedWarehouse;
      const assetTypeMatch = selectedAssetType === 'All' || d.asset_type === selectedAssetType;
      const modelMatch = selectedModel === 'All' || d.model === selectedModel;
      const configMatch = selectedConfiguration === 'All' || d.configuration === selectedConfiguration;
      const productMatch = selectedProduct === 'All' || d.product === selectedProduct;
      const assetStatusMatch = selectedAssetStatus === 'All' || d.asset_status === selectedAssetStatus;
      const assetGroupMatch = selectedAssetGroup === 'All' || d.asset_group === selectedAssetGroup;
      const orderTypeMatch = selectedOrderType === 'All' || d.order_type === selectedOrderType;
      const dateMatch =
        !fromDate?.from || !fromDate?.to
          ? true
          : new Date(d.updated_at).setHours(0, 0, 0, 0) >= new Date(fromDate.from).setHours(0, 0, 0, 0) &&
            new Date(d.updated_at).setHours(23, 59, 59, 999) <= new Date(fromDate.to).setHours(23, 59, 59, 999);
      const searchMatch =
        searchQuery.trim() === '' ||
        [
          d.serial_number,
          d.model,
          d.asset_type,
          d.configuration,
          d.product,
          d.asset_status,
          d.asset_group,
          d.warehouse,
          d.order_type,
          d.sales_order,
          d.deal_id,
          d.nucleus_id,
          d.school_name,
          d.asset_check || '',
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));
      const checkMatch =
        filterCheck === 'all' ||
        (filterCheck === 'matched' && d.asset_check === 'Matched') ||
        (filterCheck === 'unmatched' && d.asset_check !== 'Matched');

      return (
        warehouseMatch &&
        assetTypeMatch &&
        modelMatch &&
        configMatch &&
        productMatch &&
        assetStatusMatch &&
        assetGroupMatch &&
        orderTypeMatch &&
        dateMatch &&
        searchMatch &&
        checkMatch
      );
    });
  }, [
    devices,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    selectedOrderType,
    fromDate,
    searchQuery,
    filterCheck,
  ]);

  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredDevices.slice(start, end).map((d) => ({
      ...d,
      asset_check: d.asset_check || 'Unmatched',
    }));
  }, [filteredDevices, currentPage]);

  const totalPages = Math.ceil(filteredDevices.length / rowsPerPage);
  const matchedCount = filteredDevices.filter((d) => d.asset_check === 'Matched').length;
  const unmatchedCount = filteredDevices.length - matchedCount;

  const clearFilters = () => {
    setSelectedWarehouse('All');
    setSelectedAssetType('All');
    setSelectedModel('All');
    setSelectedConfiguration('All');
    setSelectedProduct('All');
    setSelectedAssetStatus('All');
    setSelectedAssetGroup('All');
    setSelectedOrderType('All');
    setFromDate(undefined);
    setSearchQuery('');
    setCurrentPage(1);
    setScannerInput('');
    setFilterCheck('all');
  };

  const handleCheck = useCallback(() => {
    const trimmedInput = scannerInput.trim();
    if (!trimmedInput) return;

    setScannerInput(''); // Clear input immediately

    const matchedDevice = devices.find(
      (device) => (device.serial_number === trimmedInput || device.id === trimmedInput) && device.status === 'Stock' && !device.is_deleted
    );

    if (matchedDevice) {
      const checkStatus = selectedWarehouse === 'All' || matchedDevice.warehouse === selectedWarehouse ? 'Matched' : `Found in ${matchedDevice.warehouse}`;
      setUpdatingDeviceId(matchedDevice.id);
      onUpdateAssetCheck(matchedDevice.id, checkStatus)
        .then(() => {
          setScanResult(checkStatus);
        })
        .catch((err) => {
          setError(`Failed to update asset check: ${err.message}`);
          setScanResult('Error');
        })
        .finally(() => {
          setUpdatingDeviceId(null);
        });
    } else {
      setScanResult('Not Found');
    }
  }, [scannerInput, devices, selectedWarehouse, onUpdateAssetCheck]);

  const debouncedHandleCheck = useCallback(debounce(handleCheck, 300), [handleCheck]);

  const exportToCSV = () => {
    const headers = [
      'Asset Type',
      'Model',
      'Configuration',
      'Serial Number',
      'Product',
      'Asset Status',
      'Asset Group',
      'Warehouse',
      'Asset Check',
    ];
    const csvRows = filteredDevices.map((d) => [
      d.asset_type || '',
      d.model || '',
      d.configuration || '',
      d.serial_number || '',
      d.product || '',
      d.asset_status || '',
      d.asset_group || '',
      d.warehouse || '',
      d.asset_check || 'Unmatched',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'audit_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllChecks = () => {
    if (filteredDevices.length === 0) return;
    setIsClearing(true);
    onClearAllChecks(filteredDevices.map((d) => d.id))
      .catch((err) => {
        setError(`Failed to clear checks: ${err.message}`);
      })
      .finally(() => {
        setIsClearing(false);
      });
  };

  const canEdit = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Operator';
  const isAllMatched = matchedCount === filteredDevices.length;

  if (!devices || devices.length === 0) {
    return <div style={{ fontSize: '12px', padding: '8px' }}>No devices available. Please check your data source.</div>;
  }

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px', overflowY: 'auto', maxHeight: '600px' }}>
      <CardHeader style={{ paddingBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '12px' }}>
            <Filter style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Audit Filters
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
                  type="text"
                  placeholder="     Enter Serial number"
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px' }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={debouncedHandleCheck}
            >
              Check
            </Button>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={() => setShowPopup(true)}
            >
              Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px', background: '#fff', color: '#ef4444' }}
              onClick={handleClearAllChecks}
              disabled={filteredDevices.length === 0 || isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#22c55e' }}>Matched: {matchedCount}</span>
            <span>|</span>
            <span style={{ color: '#ef4444' }}>Unmatched: {unmatchedCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', maxWidth: '1200px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="warehouseFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Warehouse</label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger id="warehouseFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.warehouses.map((w) => (
                    <SelectItem key={w} value={w} style={{ fontSize: '12px' }}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Type</label>
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger id="assetTypeFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.assetTypes.map((at) => (
                    <SelectItem key={at} value={at} style={{ fontSize: '12px' }}>{at}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="modelFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="modelFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.models.map((m) => (
                    <SelectItem key={m} value={m} style={{ fontSize: '12px' }}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="configurationFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Configuration</label>
              <Select value={selectedConfiguration} onValueChange={setSelectedConfiguration}>
                <SelectTrigger id="configurationFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Configurations" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.configurations.map((c) => (
                    <SelectItem key={c} value={c} style={{ fontSize: '12px' }}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="productFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="productFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.products.map((p) => (
                    <SelectItem key={p} value={p} style={{ fontSize: '12px' }}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetStatusFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Status</label>
              <Select value={selectedAssetStatus} onValueChange={setSelectedAssetStatus}>
                <SelectTrigger id="assetStatusFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Asset Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.assetStatuses.map((as) => (
                    <SelectItem key={as} value={as} style={{ fontSize: '12px' }}>{as}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetGroupFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Group</label>
              <Select value={selectedAssetGroup} onValueChange={setSelectedAssetGroup}>
                <SelectTrigger id="assetGroupFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Asset Groups" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.assetGroups.map((ag) => (
                    <SelectItem key={ag} value={ag} style={{ fontSize: '12px' }}>{ag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="orderTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Order Type</label>
              <Select value={selectedOrderType} onValueChange={setSelectedOrderType}>
                <SelectTrigger id="orderTypeFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Order Types" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.orderTypes.map((ot) => (
                    <SelectItem key={ot} value={ot} style={{ fontSize: '12px' }}>{ot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetCheckFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Check</label>
              <Select value={filterCheck} onValueChange={(value) => setFilterCheck(value as "all" | "matched" | "unmatched")}>
                <SelectTrigger id="assetCheckFilter" style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', height: '28px' }}>
                  <SelectValue placeholder="All Asset Checks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" style={{ fontSize: '12px' }}>All</SelectItem>
                  <SelectItem value="matched" style={{ fontSize: '12px' }}>Matched</SelectItem>
                  <SelectItem value="unmatched" style={{ fontSize: '12px' }}>Unmatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>S.No.</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Asset Type</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Model</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Configuration</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Serial Number</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Product</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Asset Status</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Asset Group</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Warehouse</TableHead>
              <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Asset Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} style={{ textAlign: 'center', fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>
                  No devices found with current filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedDevices.map((d, index) => {
                const checkText = d.asset_check || 'Unmatched';
                const checkColor = checkText === 'Matched' ? '#22c55e' : checkText.startsWith('Found in') ? '#f59e0b' : '#ef4444';
                return (
                  <TableRow key={d.id}>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{(currentPage - 1) * rowsPerPage + index + 1}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.asset_type}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.model}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.configuration}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.serial_number}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.product}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.asset_status}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.asset_group}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.warehouse}</TableCell>
                    <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Checkbox
                          id={`check-${d.id}`}
                          checked={checkText === 'Matched'}
                          onCheckedChange={(checked) => {
                            setUpdatingDeviceId(d.id);
                            onUpdateAssetCheck(d.id, checked ? 'Matched' : 'Unmatched')
                              .catch((err) => {
                                setError(`Failed to update asset check: ${err.message}`);
                              })
                              .finally(() => {
                                setUpdatingDeviceId(null);
                              });
                          }}
                          disabled={!canEdit || updatingDeviceId === d.id}
                        />
                        <Label
                          htmlFor={`check-${d.id}`}
                          style={{ color: checkColor, fontSize: '12px' }}
                        >
                          {updatingDeviceId === d.id ? 'Updating...' : checkText}
                        </Label>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentPage === 1 ? 0.5 : 1 }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentPage === totalPages ? 0.5 : 1 }}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      </CardContent>
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '16px',
            zIndex: 50,
            width: '300px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Asset Check Status</h3>
            <button onClick={() => setShowPopup(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
          </div>
          <p style={{ fontSize: '12px', color: isAllMatched ? '#22c55e' : '#ef4444', marginBottom: '16px' }}>
            {isAllMatched ? 'All assets are matched.' : `Matched: ${matchedCount}, Unmatched: ${unmatchedCount}`}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCSV();
                setShowPopup(false);
              }}
              style={{ fontSize: '12px' }}
            >
              Generate Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPopup(false)}
              style={{ fontSize: '12px' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      {scanResult && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '16px',
            zIndex: 50,
            width: '300px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Scan Result</h3>
            <button onClick={() => setScanResult(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
          </div>
          <p style={{ fontSize: '12px', color: scanResult === 'Matched' ? '#22c55e' : scanResult === 'Not Found' ? '#ef4444' : '#f59e0b', marginBottom: '16px' }}>
            {scanResult}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScanResult(null)}
              style={{ fontSize: '12px' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '16px',
            zIndex: 50,
            width: '300px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Error</h3>
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
          </div>
          <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '16px' }}>{error}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              style={{ fontSize: '12px' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AuditTable;