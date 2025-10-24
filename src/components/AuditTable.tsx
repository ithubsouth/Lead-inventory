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
import { excludedAuditItems } from './constants';
import MultiSelect from './MultiSelect';

interface AuditTableProps {
  devices: Device[];
  selectedWarehouse: string[];
  setSelectedWarehouse: (value: string[]) => void;
  selectedAssetType: string[];
  setSelectedAssetType: (value: string[]) => void;
  selectedModel: string[];
  setSelectedModel: (value: string[]) => void;
  selectedAssetStatus: string[];
  setSelectedAssetStatus: (value: string[]) => void;
  selectedConfiguration: string[];
  setSelectedConfiguration: (value: string[]) => void;
  selectedProduct: string[];
  setSelectedProduct: (value: string[]) => void;
  selectedOrderType: string[];
  setSelectedOrderType: (value: string[]) => void;
  selectedAssetGroup: string[];
  setSelectedAssetGroup: (value: string[]) => void;
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
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  const propertyMap = {
    warehouse: 'warehouse',
    assetType: 'asset_type',
    model: 'model',
    configuration: 'configuration',
    product: 'product',
    assetStatus: 'asset_status',
    assetGroup: 'asset_group',
    orderType: 'order_type',
  };

  const getEffectiveStatus = (d: Device) => {
    return d.order_id && d.material_type === 'Outward' ? 'Assigned' : 'Stock';
  };

  const uniqueValues = useMemo(() => {
    const latestDevices = new Map<string, Device>();
    devices.forEach((d) => {
      const key = d.serial_number || d.id;
      const existing = latestDevices.get(key);
      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
        latestDevices.set(key, d);
      }
    });

    const stockDevices = Array.from(latestDevices.values()).filter(
      (d) => getEffectiveStatus(d) === 'Stock' && !d.is_deleted &&
             !excludedAuditItems.assetTypes.includes(d.asset_type || '') &&
             !excludedAuditItems.models.includes(d.model || '')
    );

    const getFilteredDevices = (excludeFilter: string) => {
      return stockDevices.filter((d) => {
        const matches = Object.entries({
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
        })
          .filter(([key]) => key !== excludeFilter)
          .every(([key, filterValue]) => {
            if (key === 'fromDate') {
              if (!fromDate?.from || !fromDate?.to) return true;
              const createdAt = new Date(d.created_at);
              const startOfDay = new Date(createdAt);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(createdAt);
              endOfDay.setHours(23, 59, 59, 999);
              const fromStart = new Date(fromDate.from);
              fromStart.setHours(0, 0, 0, 0);
              const toEnd = new Date(fromDate.to);
              toEnd.setHours(23, 59, 59, 999);
              return startOfDay >= fromStart && endOfDay <= toEnd;
            }
            if (key === 'assetCheck') {
              return filterCheck === 'all' ||
                (filterCheck === 'matched' && d.asset_check === 'Matched') ||
                (filterCheck === 'unmatched' && d.asset_check !== 'Matched');
            }
            const prop = propertyMap[key as keyof typeof propertyMap];
            const value = d[prop as keyof Device];
            return (filterValue as string[]).length === 0 || (filterValue as string[]).includes(value);
          });
        const searchMatch = searchQuery.trim() === '' ||
          [d.serial_number, d.model, d.asset_type, d.configuration, d.product, d.asset_status, d.asset_group, d.far_code, d.warehouse, d.order_type, d.sales_order, d.deal_id, d.nucleus_id, d.school_name, d.asset_check || '']
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));
        return matches && searchMatch;
      });
    };

    return {
      warehouses: [...new Set(getFilteredDevices('warehouse').map((d) => d.warehouse || ''))].filter(Boolean).sort(),
      assetTypes: [...new Set(getFilteredDevices('assetType').map((d) => d.asset_type || ''))].filter(Boolean).sort(),
      models: [...new Set(getFilteredDevices('model').map((d) => d.model || ''))].filter(Boolean).sort(),
      configurations: [...new Set(getFilteredDevices('configuration').map((d) => d.configuration || ''))].filter(Boolean).sort(),
      products: [...new Set(getFilteredDevices('product').map((d) => d.product || ''))].filter(Boolean).sort(),
      assetStatuses: [...new Set(getFilteredDevices('assetStatus').map((d) => d.asset_status || ''))].filter(Boolean).sort(),
      assetGroups: [...new Set(getFilteredDevices('assetGroup').map((d) => d.asset_group || ''))].filter(Boolean).sort(),
      orderTypes: [...new Set(getFilteredDevices('orderType').map((d) => d.order_type || ''))].filter(Boolean).sort(),
    };
  }, [devices, selectedWarehouse, selectedAssetType, selectedModel, selectedConfiguration, selectedProduct, selectedAssetStatus, selectedAssetGroup, selectedOrderType, filterCheck, fromDate, searchQuery]);

  const filteredDevices = useMemo(() => {
    const latestDevices = new Map<string, Device>();
    devices.forEach((d) => {
      const key = d.serial_number || d.id;
      const existing = latestDevices.get(key);
      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
        latestDevices.set(key, d);
      }
    });

    return Array.from(latestDevices.values()).filter((d) => {
      const isStock = getEffectiveStatus(d) === 'Stock' && !d.is_deleted &&
                      !excludedAuditItems.assetTypes.includes(d.asset_type || '') &&
                      !excludedAuditItems.models.includes(d.model || '');
      const warehouseMatch = selectedWarehouse.length === 0 || selectedWarehouse.includes(d.warehouse || '');
      const assetTypeMatch = selectedAssetType.length === 0 || selectedAssetType.includes(d.asset_type || '');
      const modelMatch = selectedModel.length === 0 || selectedModel.includes(d.model || '');
      const configMatch = selectedConfiguration.length === 0 || selectedConfiguration.includes(d.configuration || '');
      const productMatch = selectedProduct.length === 0 || selectedProduct.includes(d.product || '');
      const assetStatusMatch = selectedAssetStatus.length === 0 || selectedAssetStatus.includes(d.asset_status || '');
      const assetGroupMatch = selectedAssetGroup.length === 0 || selectedAssetGroup.includes(d.asset_group || '');
      const orderTypeMatch = selectedOrderType.length === 0 || selectedOrderType.includes(d.order_type || '');
      const dateMatch = !fromDate?.from || !fromDate?.to || (() => {
        const createdAt = new Date(d.created_at);
        const startOfDay = new Date(createdAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(createdAt);
        endOfDay.setHours(23, 59, 59, 999);
        const fromStart = new Date(fromDate.from);
        fromStart.setHours(0, 0, 0, 0);
        const toEnd = new Date(fromDate.to);
        toEnd.setHours(23, 59, 59, 999);
        return startOfDay >= fromStart && endOfDay <= toEnd;
      })();
      const searchMatch = searchQuery.trim() === '' ||
        [d.serial_number, d.model, d.asset_type, d.configuration, d.product, d.asset_status, d.asset_group, d.far_code, d.warehouse, d.order_type, d.sales_order, d.deal_id, d.nucleus_id, d.school_name, d.asset_check || '']
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));
      const checkMatch = filterCheck === 'all' ||
        (filterCheck === 'matched' && d.asset_check === 'Matched') ||
        (filterCheck === 'unmatched' && d.asset_check !== 'Matched');

      return isStock && warehouseMatch && assetTypeMatch && modelMatch && configMatch &&
             productMatch && assetStatusMatch && assetGroupMatch && orderTypeMatch &&
             dateMatch && searchMatch && checkMatch;
    });
  }, [devices, selectedWarehouse, selectedAssetType, selectedModel, selectedConfiguration, selectedProduct, selectedAssetStatus, selectedAssetGroup, selectedOrderType, fromDate, searchQuery, filterCheck]);

  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredDevices.slice(start, end).map((d) => ({
      ...d,
      asset_check: d.asset_check || 'Unmatched',
    }));
  }, [filteredDevices, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredDevices.length / rowsPerPage);
  const matchedCount = filteredDevices.filter((d) => d.asset_check === 'Matched').length;
  const unmatchedCount = filteredDevices.length - matchedCount;

  const clearFilters = () => {
    setSelectedWarehouse([]);
    setSelectedAssetType([]);
    setSelectedModel([]);
    setSelectedConfiguration([]);
    setSelectedProduct([]);
    setSelectedAssetStatus([]);
    setSelectedAssetGroup([]);
    setSelectedOrderType([]);
    setFromDate(undefined);
    setSearchQuery('');
    setCurrentPage(1);
    setScannerInput('');
    setFilterCheck('all');
  };

  const handleCheck = useCallback(() => {
    const trimmedInput = scannerInput.trim();
    if (!trimmedInput) return;

    setScannerInput('');
    const matchedDevice = filteredDevices.find(
      (device) => device.serial_number === trimmedInput || device.id === trimmedInput
    );

    if (matchedDevice) {
      const checkStatus = selectedWarehouse.length === 0 || selectedWarehouse.includes(matchedDevice.warehouse || '')
        ? 'Matched'
        : `Found in ${matchedDevice.warehouse}`;
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
  }, [scannerInput, filteredDevices, selectedWarehouse, onUpdateAssetCheck]);

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
      'FAR Code',
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
      d.far_code || '',
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
    const matchedDeviceIds = filteredDevices
      .filter((d) => d.asset_check === 'Matched')
      .map((d) => d.id);
    if (matchedDeviceIds.length === 0) {
      setError('No matched devices to clear.');
      return;
    }
    setIsClearing(true);
    onClearAllChecks(matchedDeviceIds)
      .catch((err) => {
        setError(`Failed to clear checks: ${err.message}`);
      })
      .finally(() => {
        setIsClearing(false);
      });
  };

  const canEdit = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Operator';
  const isAllMatched = matchedCount === filteredDevices.length;

  const siblingCount = 2;
  const pageRange = [];
  for (let i = Math.max(1, currentPage - siblingCount); i <= Math.min(totalPages, currentPage + siblingCount); i++) {
    pageRange.push(i);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalPages) pageRange.push(totalPages);

  if (!devices || devices.length === 0) {
    return <div style={{ fontSize: '12px', padding: '8px' }}>No devices available. Please check your data source.</div>;
  }

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px' }}>
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
              disabled={filteredDevices.length === 0 || isClearing || matchedCount === 0}
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
            <MultiSelect
              id="warehouseFilter"
              label="Warehouse"
              options={uniqueValues.warehouses}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="Select Warehouses"
            />
            <MultiSelect
              id="assetTypeFilter"
              label="Asset Type"
              options={uniqueValues.assetTypes}
              value={selectedAssetType}
              onChange={setSelectedAssetType}
              placeholder="Select Types"
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
              id="configurationFilter"
              label="Configuration"
              options={uniqueValues.configurations}
              value={selectedConfiguration}
              onChange={setSelectedConfiguration}
              placeholder="Select Configurations"
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
              id="orderTypeFilter"
              label="Order Type"
              options={uniqueValues.orderTypes}
              value={selectedOrderType}
              onChange={setSelectedOrderType}
              placeholder="Select Order Types"
            />
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetCheckFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Check</label>
              <Select value={filterCheck} onValueChange={(value) => setFilterCheck(value as 'all' | 'matched' | 'unmatched')}>
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
        <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
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
                <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>FAR Code</TableHead>
                <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Warehouse</TableHead>
                <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20 }}>Asset Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} style={{ textAlign: 'center', fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>
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
                      <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{d.far_code}</TableCell>
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
          <div>
            <span>Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredDevices.length)} of {filteredDevices.length} assets</span>
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
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentPage === 1 ? 0.5 : 1 }}
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
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentPage === totalPages ? 0.5 : 1 }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </div>
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