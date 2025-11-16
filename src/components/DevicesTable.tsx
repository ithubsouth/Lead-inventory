import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Eye, Calendar } from 'lucide-react';
import { Device } from './types';
import { formatDate } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiSelect from './MultiSelect';
import { DatePickerWithRange } from './DatePickerWithRange';
import { DateRange } from 'react-day-picker';

interface DevicesTableProps {
  devices: Device[] | null;
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
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
  selectedOrderType: string[];
  setSelectedOrderType: (value: string[]) => void;
  selectedAssetGroup: string[];
  setSelectedAssetGroup: (value: string[]) => void;
  selectedAssetCondition: string[];
  setSelectedAssetCondition: (value: string[]) => void;
  selectedSdCardSize: string[];
  setSelectedSdCardSize: (value: string[]) => void;
  fromDate: DateRange | undefined;
  setFromDate: (range: DateRange | undefined) => void;
  showDeleted: boolean;
  setShowDeleted: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const DevicesTable: React.FC<DevicesTableProps> = ({
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
  selectedStatus,
  setSelectedStatus,
  selectedOrderType,
  setSelectedOrderType,
  selectedAssetGroup,
  setSelectedAssetGroup,
  selectedAssetCondition,
  setSelectedAssetCondition,
  selectedSdCardSize,
  setSelectedSdCardSize,
  fromDate,
  setFromDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
}) => {
  const [currentDevicesPage, setCurrentDevicesPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        container.scrollBy({ left: -50, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        container.scrollBy({ left: 50, behavior: 'smooth' });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        container.scrollBy({ top: e.deltaY * 2, behavior: 'smooth' });
        e.preventDefault();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('wheel', handleWheel);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const propertyMap = {
    warehouse: 'warehouse',
    assetType: 'asset_type',
    model: 'model',
    assetStatus: 'asset_status',
    configuration: 'configuration',
    product: 'product',
    status: 'status',
    orderType: 'order_type',
    assetGroup: 'asset_group',
    assetCondition: 'asset_condition',
    sdCardSize: 'sd_card_size',
  };

  // Compute unique values for dropdown options with dependent filtering
  const uniqueValues = useMemo(() => {
    if (!devices) return {
      warehouses: [],
      assetTypes: [],
      models: [],
      assetStatuses: [],
      configurations: [],
      products: [],
      statuses: [],
      orderTypes: [],
      assetGroups: [],
      assetConditions: [],
      sdCardSizes: [],
    };

    const filteredBaseDevices = devices.filter((device) => showDeleted ? true : !device.is_deleted);

    const getFilteredDevices = (excludeFilter: string) => {
      return filteredBaseDevices.filter((d) => {
        return Object.entries({
          warehouse: selectedWarehouse,
          assetType: selectedAssetType,
          model: selectedModel,
          assetStatus: selectedAssetStatus,
          configuration: selectedConfiguration,
          product: selectedProduct,
          status: selectedStatus,
          orderType: selectedOrderType,
          assetGroup: selectedAssetGroup,
          assetCondition: selectedAssetCondition,
          sdCardSize: selectedSdCardSize,
          fromDate,
        })
          .filter(([key]) => key !== excludeFilter)
          .every(([key, filterValue]) => {
            if (key === 'fromDate') {
              if (!fromDate?.from || !fromDate?.to) return true;
              if (!d.created_at) return false;
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
            const prop = propertyMap[key as keyof typeof propertyMap];
            const value = d[prop as keyof Device] || '';
            return (filterValue as string[]).length === 0 || (filterValue as string[]).includes(value as string);
          });
      });
    };

    return {
      warehouses: [...new Set(getFilteredDevices('warehouse').map(d => d.warehouse || ''))].filter(Boolean).sort(),
      assetTypes: [...new Set(getFilteredDevices('assetType').map(d => d.asset_type || ''))].filter(Boolean).sort(),
      models: [...new Set(getFilteredDevices('model').map(d => d.model || ''))].filter(Boolean).sort(),
      assetStatuses: [...new Set(getFilteredDevices('assetStatus').map(d => d.asset_status || ''))].filter(Boolean).sort(),
      configurations: [...new Set(getFilteredDevices('configuration').map(d => d.configuration || ''))].filter(Boolean).sort(),
      products: [...new Set(getFilteredDevices('product').map(d => d.product || ''))].filter(Boolean).sort(),
      statuses: [...new Set(getFilteredDevices('status').map(d => d.status || ''))].filter(Boolean).sort(),
      orderTypes: [...new Set(getFilteredDevices('orderType').map(d => d.order_type || ''))].filter(Boolean).sort(),
      assetGroups: [...new Set(getFilteredDevices('assetGroup').map(d => d.asset_group || ''))].filter(Boolean).sort(),
      assetConditions: [...new Set(getFilteredDevices('assetCondition').map(d => d.asset_condition || ''))].filter(Boolean).sort(),
      sdCardSizes: [...new Set(getFilteredDevices('sdCardSize').map(d => d.sd_card_size || ''))].filter(Boolean).sort(),
    };
  }, [
    devices,
    showDeleted,
    fromDate,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedAssetStatus,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedAssetGroup,
    selectedAssetCondition,
    selectedSdCardSize,
  ]);

  // Reset invalid filter selections
  useEffect(() => {
    if (!devices) return;

    const resetIfInvalid = (selected: string[], validOptions: string[], setter: (value: string[]) => void) => {
      if (selected.length > 0 && !selected.every(s => validOptions.includes(s))) {
        setter(selected.filter(s => validOptions.includes(s)));
      }
    };

    resetIfInvalid(selectedWarehouse, uniqueValues.warehouses, setSelectedWarehouse);
    resetIfInvalid(selectedAssetType, uniqueValues.assetTypes, setSelectedAssetType);
    resetIfInvalid(selectedModel, uniqueValues.models, setSelectedModel);
    resetIfInvalid(selectedAssetStatus, uniqueValues.assetStatuses, setSelectedAssetStatus);
    resetIfInvalid(selectedConfiguration, uniqueValues.configurations, setSelectedConfiguration);
    resetIfInvalid(selectedProduct, uniqueValues.products, setSelectedProduct);
    resetIfInvalid(selectedStatus, uniqueValues.statuses, setSelectedStatus);
    resetIfInvalid(selectedOrderType, uniqueValues.orderTypes, setSelectedOrderType);
    resetIfInvalid(selectedAssetGroup, uniqueValues.assetGroups, setSelectedAssetGroup);
    resetIfInvalid(selectedAssetCondition, uniqueValues.assetConditions, setSelectedAssetCondition);
    resetIfInvalid(selectedSdCardSize, uniqueValues.sdCardSizes, setSelectedSdCardSize);
  }, [
    devices,
    uniqueValues,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedAssetStatus,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedAssetGroup,
    selectedAssetCondition,
    selectedSdCardSize,
    setSelectedWarehouse,
    setSelectedAssetType,
    setSelectedModel,
    setSelectedAssetStatus,
    setSelectedConfiguration,
    setSelectedProduct,
    setSelectedStatus,
    setSelectedOrderType,
    setSelectedAssetGroup,
    setSelectedAssetCondition,
    setSelectedSdCardSize,
  ]);

  // Filter devices based on all active filters
  const filteredDevices = useMemo(() => {
    if (!devices) return [];

    return devices.filter((device) => {
      const matchesDeleted = showDeleted ? true : !device.is_deleted;
      const matchesWarehouse = selectedWarehouse.length === 0 || selectedWarehouse.includes(device.warehouse || '');
      const matchesAssetType = selectedAssetType.length === 0 || selectedAssetType.includes(device.asset_type || '');
      const matchesModel = selectedModel.length === 0 || selectedModel.includes(device.model || '');
      const matchesAssetStatus = selectedAssetStatus.length === 0 || selectedAssetStatus.includes(device.asset_status || '');
      const matchesConfiguration = selectedConfiguration.length === 0 || selectedConfiguration.includes(device.configuration || '');
      const matchesProduct = selectedProduct.length === 0 || selectedProduct.includes(device.product || '');
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(device.status || '');
      const matchesOrderType = selectedOrderType.length === 0 || selectedOrderType.includes(device.order_type || '');
      const matchesAssetGroup = selectedAssetGroup.length === 0 || selectedAssetGroup.includes(device.asset_group || '');
      const matchesAssetCondition = selectedAssetCondition.length === 0 || selectedAssetCondition.includes(device.asset_condition || '');
      const matchesSdCardSize = selectedSdCardSize.length === 0 || selectedSdCardSize.includes(device.sd_card_size || '');
      const matchesDateRange =
        (!fromDate?.from || !device.created_at || new Date(device.created_at) >= new Date(fromDate.from.setHours(0, 0, 0, 0))) &&
        (!fromDate?.to || !device.created_at || new Date(device.created_at) <= new Date(fromDate.to.setHours(23, 59, 59, 999)));
      const matchesSearch = searchQuery.trim() === ''
        ? true
        : [
            device.serial_number || '',
            device.sales_order || '',
            device.deal_id || '',
            device.school_name || '',
            device.nucleus_id || '',
            device.asset_type || '',
            device.model || '',
            device.configuration || '',
            device.asset_status || '',
            device.asset_condition || '',
            device.product || '',
            device.status || '',
            device.order_type || '',
            device.asset_group || '',
            device.far_code || '',
            device.sd_card_size || '',
            device.profile_id || '',
            device.updated_by || '',
          ].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        matchesDeleted &&
        matchesWarehouse &&
        matchesAssetType &&
        matchesModel &&
        matchesAssetStatus &&
        matchesConfiguration &&
        matchesProduct &&
        matchesStatus &&
        matchesOrderType &&
        matchesAssetGroup &&
        matchesAssetCondition &&
        matchesSdCardSize &&
        matchesDateRange &&
        matchesSearch
      );
    });
  }, [
    devices,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedAssetStatus,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedAssetGroup,
    selectedAssetCondition,
    selectedSdCardSize,
    fromDate,
    showDeleted,
    searchQuery,
  ]);

  // Sort devices by created_at (descending), then by other fields
  const sortedDevices = useMemo(() => {
    return [...filteredDevices].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : -Infinity;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : -Infinity;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      const salesOrderA = a.sales_order || '';
      const salesOrderB = b.sales_order || '';
      if (salesOrderA !== salesOrderB) {
        return salesOrderA.localeCompare(salesOrderB);
      }
      const orderTypeA = a.order_type || '';
      const orderTypeB = b.order_type || '';
      if (orderTypeA !== orderTypeB) {
        return orderTypeA.localeCompare(orderTypeB);
      }
      const warehouseA = a.warehouse || '';
      const warehouseB = b.warehouse || '';
      if (warehouseA !== warehouseB) {
        return warehouseA.localeCompare(warehouseB);
      }
      const assetTypeA = a.asset_type || '';
      const assetTypeB = b.asset_type || '';
      if (assetTypeA !== assetTypeB) {
        return assetTypeA.localeCompare(assetTypeB);
      }
      const modelA = a.model || '';
      const modelB = b.model || '';
      if (modelA !== modelB) {
        return modelA.localeCompare(modelB);
      }
      const productA = a.product || '';
      const productB = b.product || '';
      if (productA !== productB) {
        return productA.localeCompare(productB);
      }
      const assetStatusA = a.asset_status || '';
      const assetStatusB = b.asset_status || '';
      if (assetStatusA !== assetStatusB) {
        return assetStatusA.localeCompare(assetStatusB);
      }
      const statusA = a.status || '';
      const statusB = b.status || '';
      return statusA.localeCompare(statusB);
    });
  }, [filteredDevices]);

  // Log for debugging
  useEffect(() => {
    if (devices) {
      console.log('DevicesTable Summary:', {
        totalDevices: devices.length,
        filteredDevices: filteredDevices.length,
        sortedDevices: sortedDevices.length,
        deletedDevices: sortedDevices.filter(d => d.is_deleted).length,
        activeDevices: sortedDevices.filter(d => !d.is_deleted).length,
        stockDevices: sortedDevices.filter(d => d.status === 'Stock').length,
        assignedDevices: sortedDevices.filter(d => d.status === 'Assigned').length,
      });
    }
  }, [devices, filteredDevices, sortedDevices]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentDevicesPage(1);
  }, [
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedAssetStatus,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedAssetGroup,
    selectedAssetCondition,
    selectedSdCardSize,
    fromDate,
    showDeleted,
    searchQuery,
    rowsPerPage,
  ]);

  // Paginate devices
  const paginatedDevices = useMemo(() => {
    return sortedDevices.slice(
      (currentDevicesPage - 1) * rowsPerPage,
      currentDevicesPage * rowsPerPage
    );
  }, [sortedDevices, currentDevicesPage, rowsPerPage]);

  const totalDevicesPages = Math.ceil(sortedDevices.length / rowsPerPage);

  // Pagination logic for dynamic page range
  const siblingCount = 2;
  const pageRange = [];
  for (let i = Math.max(1, currentDevicesPage - siblingCount); i <= Math.min(totalDevicesPages, currentDevicesPage + siblingCount); i++) {
    pageRange.push(i);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalDevicesPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalDevicesPages && totalDevicesPages > 0) pageRange.push(totalDevicesPages);

  const downloadCSV = (data: Device[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    const headers = [
      'sales_order',
      'order_type',
      'warehouse',
      'deal_id',
      'nucleus_id',
      'school_name',
      'asset_type',
      'model',
      'configuration',
      'serial_number',
      'sd_card_size',
      'profile_id',
      'product',
      'asset_status',
      'asset_condition',
      'asset_group',
      'far_code',
      'status',
      'created_at',
      'updated_at',
      'updated_by',
      'id',
      'is_deleted',
    ];
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof Device];
            return typeof value === 'string' && value.includes(',')
              ? `"${value.replace(/"/g, '""')}"`
              : value ?? '';
          })
          .join(',')
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
    setSelectedConfiguration([]);
    setSelectedProduct([]);
    setSelectedStatus([]);
    setSelectedOrderType([]);
    setSelectedAssetGroup([]);
    setSelectedAssetCondition([]);
    setSelectedSdCardSize([]);
    setFromDate(undefined);
    setSearchQuery('');
    setCurrentDevicesPage(1);
    setShowDeleted(false);
  };

  // Define column widths to ensure header and body alignment
  const columnWidths = {
    s_no: '60px',
    sales_order: '150px',
    order_type: '120px',
    warehouse: '120px',
    deal_id: '120px',
    nucleus_id: '120px',
    school_name: '150px',
    asset_type: '100px',
    model: '150px',
    configuration: '150px',
    serial_number: '150px',
    sd_card_size: '100px',
    profile_id: '120px',
    product: '120px',
    asset_status: '100px',
    asset_condition: '120px',
    asset_group: '120px',
    far_code: '120px',
    status: '100px',
    created_at: '150px',
    updated_by: '120px',
    actions: '80px',
  };

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px' }}>
      <CardHeader style={{ paddingBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '12px' }}>
            <Calendar style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Device Filters
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
                  placeholder="        Search by Serial, Sales Order, Deal ID, School, Nucleus ID, Asset Type, Model, Configuration, Asset Status, Asset Condition, Product, Status, Order Type, Asset Group, FAR Code, SD Card Size, Profile ID, Updated By"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px' }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={() => downloadCSV(sortedDevices, 'devices_export.csv')}
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
              id="assetStatusFilter"
              label="Asset Status"
              options={uniqueValues.assetStatuses}
              value={selectedAssetStatus}
              onChange={setSelectedAssetStatus}
              placeholder="Select Asset Statuses"
            />
            <MultiSelect
              id="assetConditionFilter"
              label="Asset Condition"
              options={uniqueValues.assetConditions}
              value={selectedAssetCondition}
              onChange={setSelectedAssetCondition}
              placeholder="Select Asset Conditions"
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
              id="statusFilter"
              label="Status"
              options={uniqueValues.statuses}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Select Statuses"
            />
            <MultiSelect
              id="orderTypeFilter"
              label="Order Type"
              options={uniqueValues.orderTypes}
              value={selectedOrderType}
              onChange={setSelectedOrderType}
              placeholder="Select Order Types"
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
              id="sdCardSizeFilter"
              label="SD Card Size"
              options={uniqueValues.sdCardSizes}
              value={selectedSdCardSize}
              onChange={setSelectedSdCardSize}
              placeholder="Select SD Card Sizes"
            />
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="dateRangeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Date Range</label>
              <DatePickerWithRange
                date={fromDate}
                setDate={setFromDate}
                className="h-7 w-full"
              />
            </div>
          </div>
        </div>

        {!devices || devices.length === 0 ? (
          <div style={{ fontSize: '12px', padding: '8px' }}>No devices available. Check your database or data loading logic.</div>
        ) : (
          <>
            <div
              style={{
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: '400px',
                position: 'relative',
              }}
              ref={tableContainerRef}
              tabIndex={0}
            >
              <Table style={{ minWidth: '2000px' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.s_no }}>S.No.</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sales_order }}>Sales Order</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.order_type }}>Order Type</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.warehouse }}>Warehouse</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.deal_id }}>Deal ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.nucleus_id }}>Nucleus ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.school_name }}>School Name</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_type }}>Asset Type</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.model }}>Model</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.configuration }}>Configuration</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.serial_number }}>Serial Number</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sd_card_size }}>SD Card Size</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.profile_id }}>Profile ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.product }}>Product</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_status }}>Asset Status</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_condition }}>Asset Condition</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_group }}>Asset Group</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.far_code }}>FAR Code</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.status }}>Status</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.created_at }}>Created At</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.updated_by }}>Updated By</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.actions }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={22} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No devices found with current filters. Try adjusting the filters or check data loading.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDevices.map((device, index) => (
                      <TableRow key={device.id}>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.s_no }}>
                          {(currentDevicesPage - 1) * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sales_order }}>{device.sales_order || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_type }}>{device.order_type || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{device.warehouse || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.deal_id }}>{device.deal_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.nucleus_id }}>{device.nucleus_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.school_name }}>{device.school_name || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{device.asset_type || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{device.model || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.configuration }}>{device.configuration || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.serial_number }}>{device.serial_number || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sd_card_size }}>{device.sd_card_size || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.profile_id }}>{device.profile_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.product }}>{device.product || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_status }}>{device.asset_status || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_condition }}>{device.asset_condition || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_group }}>{device.asset_group || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.far_code }}>{device.far_code || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.status }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: device.status === 'Stock' ? '#3b82f6' : '#6b7280',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                          >
                            {device.status || ''}
                          </span>
                        </TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.created_at }}>{formatDate(device.created_at) || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.updated_by }}>{device.updated_by || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.actions }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewingDevice(device);
                              setShowViewDialog(true);
                            }}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', height: '28px' }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
              <div>
                <span>Showing {((currentDevicesPage - 1) * rowsPerPage) + 1} to {Math.min(currentDevicesPage * rowsPerPage, sortedDevices.length)} of {sortedDevices.length} devices</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentDevicesPage(1);
                  }}
                  style={{ 
                    fontSize: '12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '4px', 
                    padding: '4px', 
                    marginLeft: '8px', 
                    height: '28px' 
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === 1 ? 0.5 : 1 }}
                  disabled={currentDevicesPage === 1}
                  onClick={() => setCurrentDevicesPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                {pageRange.map((page, index) => (
                  <Button
                    key={index}
                    variant={currentDevicesPage === page ? 'default' : 'outline'}
                    size="sm"
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      background: currentDevicesPage === page ? '#3b82f6' : '#fff',
                      color: currentDevicesPage === page ? '#fff' : '#000',
                      cursor: typeof page === 'number' ? 'pointer' : 'default',
                      fontSize: '12px',
                      opacity: typeof page === 'number' ? 1 : 0.5,
                    }}
                    disabled={typeof page !== 'number'}
                    onClick={() => typeof page === 'number' && setCurrentDevicesPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === totalDevicesPages ? 0.5 : 1 }}
                  disabled={currentDevicesPage === totalDevicesPages}
                  onClick={() => setCurrentDevicesPage((prev) => Math.min(prev + 1, totalDevicesPages))}
                >
                  Next
                </Button>
              </div>
            </div>

            {showViewDialog && viewingDevice && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto', padding: '8px', maxWidth: '600px', width: '100%' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Device Details</h2>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p><strong>ID:</strong> {viewingDevice.id}</p>
                    <p><strong>Sales Order:</strong> {viewingDevice.sales_order || ''}</p>
                    <p><strong>Order Type:</strong> {viewingDevice.order_type || ''}</p>
                    <p><strong>Warehouse:</strong> {viewingDevice.warehouse || ''}</p>
                    <p><strong>Deal ID:</strong> {viewingDevice.deal_id || ''}</p>
                    <p><strong>Nucleus ID:</strong> {viewingDevice.nucleus_id || ''}</p>
                    <p><strong>School Name:</strong> {viewingDevice.school_name || ''}</p>
                    <p><strong>Asset Type:</strong> {viewingDevice.asset_type || ''}</p>
                    <p><strong>Model:</strong> {viewingDevice.model || ''}</p>
                    <p><strong>Configuration:</strong> {viewingDevice.configuration || ''}</p>
                    <p><strong>Serial Number:</strong> {viewingDevice.serial_number || ''}</p>
                    <p><strong>SD Card Size:</strong> {viewingDevice.sd_card_size || ''}</p>
                    <p><strong>Profile ID:</strong> {viewingDevice.profile_id || ''}</p>
                    <p><strong>Product:</strong> {viewingDevice.product || ''}</p>
                    <p><strong>Asset Status:</strong> {viewingDevice.asset_status || ''}</p>
                    <p><strong>Asset Condition:</strong> {viewingDevice.asset_condition || ''}</p>
                    <p><strong>Asset Group:</strong> {viewingDevice.asset_group || ''}</p>
                    <p><strong>FAR Code:</strong> {viewingDevice.far_code || ''}</p>
                    <p><strong>Status:</strong> {viewingDevice.status || ''}</p>
                    <p><strong>Created At:</strong> {formatDate(viewingDevice.created_at) || ''}</p>
                    <p><strong>Updated At:</strong> {formatDate(viewingDevice.updated_at) || ''}</p>
                    <p><strong>Updated By:</strong> {viewingDevice.updated_by || ''}</p>
                    <p><strong>Deleted:</strong> {viewingDevice.is_deleted ? 'Yes' : 'No'}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViewDialog(false)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', marginTop: '8px' }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DevicesTable;