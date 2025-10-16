import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Eye, Calendar } from 'lucide-react';
import { Device } from './types';
import { formatDate } from './utils';

interface DevicesTableProps {
  devices: Device[] | null;
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
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedOrderType: string;
  setSelectedOrderType: (value: string) => void;
  selectedAssetGroup: string;
  setSelectedAssetGroup: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
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
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
}) => {
  const [currentDevicesPage, setCurrentDevicesPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDatePickerDialog, setShowDatePickerDialog] = useState(false);
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

  useEffect(() => {
    console.log('DevicesTable props:', {
      devicesLength: devices?.length || 0,
      deletedDevices: devices?.filter(d => d.is_deleted).length || 0,
      activeDevices: devices?.filter(d => !d.is_deleted).length || 0,
      selectedWarehouse,
      selectedAssetType,
      selectedModel,
      selectedAssetStatus,
      selectedConfiguration,
      selectedProduct,
      selectedStatus,
      selectedOrderType,
      selectedAssetGroup,
      fromDate,
      toDate,
      showDeleted,
      searchQuery,
    });
    console.log('Raw devices (first 5):', devices?.slice(0, 5).map(d => ({
      id: d.id,
      sales_order: d.sales_order || '',
      order_type: d.order_type || '',
      warehouse: d.warehouse || '',
      deal_id: d.deal_id || '',
      nucleus_id: d.nucleus_id || '',
      school_name: d.school_name || '',
      asset_type: d.asset_type || '',
      model: d.model || '',
      configuration: d.configuration || '',
      serial_number: d.serial_number || '',
      sd_card_size: d.sd_card_size || '',
      profile_id: d.profile_id || '',
      product: d.product || '',
      asset_status: d.asset_status || '',
      asset_group: d.asset_group || '',
      far_code: d.far_code || '',
      status: d.status || '',
      updated_at: d.updated_at || '',
      updated_by: d.updated_by || '',
    })) || []);
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
    fromDate,
    toDate,
    showDeleted,
    searchQuery,
  ]);

  // Filter devices for dropdown options based on all active filters
  const filteredDevicesForOptions = devices?.filter((device) => {
    const matchesDeleted = showDeleted ? true : !device.is_deleted;
    const matchesWarehouse = selectedWarehouse === 'All' || (device.warehouse || '') === selectedWarehouse;
    const matchesAssetType = selectedAssetType === 'All' || (device.asset_type || '') === selectedAssetType;
    const matchesModel = selectedModel === 'All' || (device.model || '') === selectedModel;
    const matchesAssetStatus = selectedAssetStatus === 'All' || (device.asset_status || '') === selectedAssetStatus;
    const matchesConfiguration = selectedConfiguration === 'All' || (device.configuration || '') === selectedConfiguration;
    const matchesProduct = selectedProduct === 'All' || (device.product || '') === selectedProduct;
    const matchesStatus = selectedStatus === 'All' || (device.status || '') === selectedStatus;
    const matchesOrderType = selectedOrderType === 'All' || (device.order_type || '') === selectedOrderType;
    const matchesAssetGroup = selectedAssetGroup === 'All' || (device.asset_group || '') === selectedAssetGroup;
    const matchesDate =
      (!fromDate || !device.updated_at || new Date(device.updated_at) >= new Date(fromDate)) &&
      (!toDate || !device.updated_at || new Date(device.updated_at) <= new Date(toDate));

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
      matchesDate
    );
  }) || [];

  // Dynamically generate dropdown options from filtered devices
  const warehouseOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.warehouse || ''))].filter(w => w).sort()];
  const assetTypeOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.asset_type || ''))].filter(a => a).sort()];
  const modelOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.model || ''))].filter(m => m).sort()];
  const configurationOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.configuration || ''))].filter(c => c).sort()];
  const orderTypeOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.order_type || ''))].filter(o => o).sort()];
  const productOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.product || ''))].filter(p => p).sort()];
  const assetStatusOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.asset_status || ''))].filter(s => s).sort()];
  const assetGroupOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.asset_group || ''))].filter(g => g).sort()];
  const statusOptions = ['All', ...[...new Set(filteredDevicesForOptions.map(d => d.status || ''))].filter(s => s).sort()];

  // Reset dependent filters when any filter changes
  useEffect(() => {
    if (!devices) return;

    const validWarehouses = [...new Set(devices.filter(d => showDeleted ? true : !d.is_deleted).map(d => d.warehouse || ''))].filter(w => w);
    if (selectedWarehouse !== 'All' && !validWarehouses.includes(selectedWarehouse)) {
      setSelectedWarehouse('All');
    }

    const validAssetTypes = [...new Set(filteredDevicesForOptions.map(d => d.asset_type || ''))].filter(a => a);
    if (selectedAssetType !== 'All' && !validAssetTypes.includes(selectedAssetType)) {
      setSelectedAssetType('All');
    }

    const validModels = [...new Set(filteredDevicesForOptions.map(d => d.model || ''))].filter(m => m);
    if (selectedModel !== 'All' && !validModels.includes(selectedModel)) {
      setSelectedModel('All');
    }

    const validAssetStatuses = [...new Set(filteredDevicesForOptions.map(d => d.asset_status || ''))].filter(s => s);
    if (selectedAssetStatus !== 'All' && !validAssetStatuses.includes(selectedAssetStatus)) {
      setSelectedAssetStatus('All');
    }

    const validConfigurations = [...new Set(filteredDevicesForOptions.map(d => d.configuration || ''))].filter(c => c);
    if (selectedConfiguration !== 'All' && !validConfigurations.includes(selectedConfiguration)) {
      setSelectedConfiguration('All');
    }

    const validProducts = [...new Set(filteredDevicesForOptions.map(d => d.product || ''))].filter(p => p);
    if (selectedProduct !== 'All' && !validProducts.includes(selectedProduct)) {
      setSelectedProduct('All');
    }

    const validStatuses = [...new Set(filteredDevicesForOptions.map(d => d.status || ''))].filter(s => s);
    if (selectedStatus !== 'All' && !validStatuses.includes(selectedStatus)) {
      setSelectedStatus('All');
    }

    const validOrderTypes = [...new Set(filteredDevicesForOptions.map(d => d.order_type || ''))].filter(o => o);
    if (selectedOrderType !== 'All' && !validOrderTypes.includes(selectedOrderType)) {
      setSelectedOrderType('All');
    }

    const validAssetGroups = [...new Set(filteredDevicesForOptions.map(d => d.asset_group || ''))].filter(g => g);
    if (selectedAssetGroup !== 'All' && !validAssetGroups.includes(selectedAssetGroup)) {
      setSelectedAssetGroup('All');
    }
  }, [
    devices,
    filteredDevicesForOptions,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedAssetStatus,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedAssetGroup,
    fromDate,
    toDate,
    showDeleted,
    setSelectedWarehouse,
    setSelectedAssetType,
    setSelectedModel,
    setSelectedAssetStatus,
    setSelectedConfiguration,
    setSelectedProduct,
    setSelectedStatus,
    setSelectedOrderType,
    setSelectedAssetGroup,
  ]);

  const filteredDevices = devices?.filter((device) => {
    const matchesDeleted = showDeleted ? true : !device.is_deleted;
    const matchesWarehouse = selectedWarehouse === 'All' || (device.warehouse || '') === selectedWarehouse;
    const matchesAssetType = selectedAssetType === 'All' || (device.asset_type || '') === selectedAssetType;
    const matchesModel = selectedModel === 'All' || (device.model || '') === selectedModel;
    const matchesAssetStatus = selectedAssetStatus === 'All' || (device.asset_status || '') === selectedAssetStatus;
    const matchesConfiguration = selectedConfiguration === 'All' || (device.configuration || '') === selectedConfiguration;
    const matchesProduct = selectedProduct === 'All' || (device.product || '') === selectedProduct;
    const matchesStatus = selectedStatus === 'All' || (device.status || '') === selectedStatus;
    const matchesOrderType = selectedOrderType === 'All' || (device.order_type || '') === selectedOrderType;
    const matchesAssetGroup = selectedAssetGroup === 'All' || (device.asset_group || '') === selectedAssetGroup;
    const matchesDate =
      (!fromDate || !device.updated_at || new Date(device.updated_at) >= new Date(fromDate)) &&
      (!toDate || !device.updated_at || new Date(device.updated_at) <= new Date(toDate));
    const matchesSearch = searchQuery
      ? [
          device.serial_number || '',
          device.sales_order || '',
          device.deal_id || '',
          device.school_name || '',
          device.nucleus_id || '',
          device.asset_type || '',
          device.model || '',
          device.configuration || '',
          device.asset_status || '',
          device.product || '',
          device.status || '',
          device.order_type || '',
          device.asset_group || '',
          device.far_code || '',
          device.sd_card_size || '',
          device.profile_id || '',
          device.updated_by || '',
        ].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

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
      matchesDate &&
      matchesSearch
    );
  }) || [];

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
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

  useEffect(() => {
    const invalidDates = filteredDevices.filter(d => d.updated_at && isNaN(new Date(d.updated_at).getTime())).map(d => ({
      id: d.id,
      sales_order: d.sales_order || '',
      order_type: d.order_type || '',
      warehouse: d.warehouse || '',
      deal_id: d.deal_id || '',
      nucleus_id: d.nucleus_id || '',
      school_name: d.school_name || '',
      asset_type: d.asset_type || '',
      model: d.model || '',
      configuration: d.configuration || '',
      serial_number: d.serial_number || '',
      sd_card_size: d.sd_card_size || '',
      profile_id: d.profile_id || '',
      product: d.product || '',
      asset_status: d.asset_status || '',
      asset_group: d.asset_group || '',
      far_code: d.far_code || '',
      status: d.status || '',
      updated_at: d.updated_at || '',
      updated_by: d.updated_by || '',
    }));
    if (invalidDates.length > 0) {
      console.warn('Invalid updated_at values detected:', invalidDates);
    }
    console.log('Filtered devices (first 5):', filteredDevices.slice(0, 5).map(d => ({
      id: d.id,
      sales_order: d.sales_order || '',
      order_type: d.order_type || '',
      warehouse: d.warehouse || '',
      deal_id: d.deal_id || '',
      nucleus_id: d.nucleus_id || '',
      school_name: d.school_name || '',
      asset_type: d.asset_type || '',
      model: d.model || '',
      configuration: d.configuration || '',
      serial_number: d.serial_number || '',
      sd_card_size: d.sd_card_size || '',
      profile_id: d.profile_id || '',
      product: d.product || '',
      asset_status: d.asset_status || '',
      asset_group: d.asset_group || '',
      far_code: d.far_code || '',
      status: d.status || '',
      updated_at: d.updated_at || '',
      updated_by: d.updated_by || '',
    })));
    console.log('Sorted devices (first 5):', sortedDevices.slice(0, 5).map(d => ({
      id: d.id,
      sales_order: d.sales_order || '',
      order_type: d.order_type || '',
      warehouse: d.warehouse || '',
      deal_id: d.deal_id || '',
      nucleus_id: d.nucleus_id || '',
      school_name: d.school_name || '',
      asset_type: d.asset_type || '',
      model: d.model || '',
      configuration: d.configuration || '',
      serial_number: d.serial_number || '',
      sd_card_size: d.sd_card_size || '',
      profile_id: d.profile_id || '',
      product: d.product || '',
      asset_status: d.asset_status || '',
      asset_group: d.asset_group || '',
      far_code: d.far_code || '',
      status: d.status || '',
      updated_at: d.updated_at || '',
      updated_by: d.updated_by || '',
    })));
    console.log('Filtered and sorted devices summary:', {
      filteredLength: filteredDevices.length,
      sortedLength: sortedDevices.length,
      deletedDevices: sortedDevices.filter(d => d.is_deleted).length,
      activeDevices: sortedDevices.filter(d => !d.is_deleted).length,
      stockDevices: sortedDevices.filter(d => d.status === 'Stock').length,
      assignedDevices: sortedDevices.filter(d => d.status === 'Assigned').length,
    });
  }, [filteredDevices, sortedDevices]);

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
    fromDate,
    toDate,
    showDeleted,
    searchQuery,
  ]);

  const paginatedDevices = sortedDevices.slice(
    (currentDevicesPage - 1) * rowsPerPage,
    currentDevicesPage * rowsPerPage
  );

  useEffect(() => {
    console.log('Paginated devices (first 5):', paginatedDevices.slice(0, 5).map(d => ({
      id: d.id,
      sales_order: d.sales_order || '',
      order_type: d.order_type || '',
      warehouse: d.warehouse || '',
      deal_id: d.deal_id || '',
      nucleus_id: d.nucleus_id || '',
      school_name: d.school_name || '',
      asset_type: d.asset_type || '',
      model: d.model || '',
      configuration: d.configuration || '',
      serial_number: d.serial_number || '',
      sd_card_size: d.sd_card_size || '',
      profile_id: d.profile_id || '',
      product: d.product || '',
      asset_status: d.asset_status || '',
      asset_group: d.asset_group || '',
      far_code: d.far_code || '',
      status: d.status || '',
      updated_at: d.updated_at || '',
      updated_by: d.updated_by || '',
    })));
    console.log('Pagination info:', {
      currentDevicesPage,
      rowsPerPage,
      sortedDevicesLength: sortedDevices.length,
      totalDevicesPages: Math.ceil(sortedDevices.length / rowsPerPage),
    });
  }, [paginatedDevices, sortedDevices.length, currentDevicesPage, rowsPerPage]);

  const totalDevicesPages = Math.ceil(sortedDevices.length / rowsPerPage);

  // Pagination logic for dynamic page range
  const siblingCount = 2; // Number of pages to show on each side of the current page
  const pageRange = [];
  for (let i = Math.max(1, currentDevicesPage - siblingCount); i <= Math.min(totalDevicesPages, currentDevicesPage + siblingCount); i++) {
    pageRange.push(i);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalDevicesPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalDevicesPages) pageRange.push(totalDevicesPages);

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
      'asset_group',
      'far_code',
      'status',
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
            const value = row[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
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

  const handleDateRangeSubmit = () => {
    setShowDatePickerDialog(false);
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
    asset_group: '120px',
    far_code: '120px',
    status: '100px',
    updated_at: '150px',
    updated_by: '120px',
    actions: '80px',
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px' }}>
      <div style={{ padding: '8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ flex: 1, maxWidth: '1200px' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '8px', width: '12px', height: '12px', color: '#6b7280' }} />
                <input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Serial, Sales Order, Deal ID, School, Nucleus ID, Asset Type, Model, Configuration, Asset Status, Product, Status, Order Type, Asset Group, FAR Code, SD Card Size, Profile ID, Updated By"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px' }}
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(sortedDevices, 'devices_export.csv')}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Download style={{ width: '12px', height: '12px' }} />
            </button>
            <button
              onClick={() => setShowDatePickerDialog(true)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Calendar style={{ width: '12px', height: '12px' }} />
            </button>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px' }}
            >
              {showDeleted ? 'Show Active' : 'Show Deleted'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', maxWidth: '1200px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="warehouseFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Warehouse</label>
              <select
                id="warehouseFilter"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {warehouseOptions.map(warehouse => (
                  <option key={warehouse} value={warehouse} style={{ fontSize: '12px' }}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Type</label>
              <select
                id="assetTypeFilter"
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {assetTypeOptions.map(assetType => (
                  <option key={assetType} value={assetType} style={{ fontSize: '12px' }}>
                    {assetType}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="modelFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Model</label>
              <select
                id="modelFilter"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {modelOptions.map(model => (
                  <option key={model} value={model} style={{ fontSize: '12px' }}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="configurationFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Configuration</label>
              <select
                id="configurationFilter"
                value={selectedConfiguration}
                onChange={(e) => setSelectedConfiguration(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {configurationOptions.map(config => (
                  <option key={config} value={config} style={{ fontSize: '12px' }}>
                    {config}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="orderTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Order Type</label>
              <select
                id="orderTypeFilter"
                value={selectedOrderType}
                onChange={(e) => setSelectedOrderType(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {orderTypeOptions.map(orderType => (
                  <option key={orderType} value={orderType} style={{ fontSize: '12px' }}>
                    {orderType}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="productFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Product</label>
              <select
                id="productFilter"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {productOptions.map(product => (
                  <option key={product} value={product} style={{ fontSize: '12px' }}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetStatusFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Status</label>
              <select
                id="assetStatusFilter"
                value={selectedAssetStatus}
                onChange={(e) => setSelectedAssetStatus(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {assetStatusOptions.map(status => (
                  <option key={status} value={status} style={{ fontSize: '12px' }}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="assetGroupFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Group</label>
              <select
                id="assetGroupFilter"
                value={selectedAssetGroup}
                onChange={(e) => setSelectedAssetGroup(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {assetGroupOptions.map(group => (
                  <option key={group} value={group} style={{ fontSize: '12px' }}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="statusFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Status</label>
              <select
                id="statusFilter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status} style={{ fontSize: '12px' }}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!devices || devices.length === 0 ? (
          <div style={{ fontSize: '12px' }}>No devices available. Check your database or data loading logic.</div>
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
              <table style={{ width: '100%', minWidth: '2000px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.s_no }}>S.No.</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.sales_order }}>Sales Order</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.order_type }}>Order Type</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.warehouse }}>Warehouse</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.deal_id }}>Deal ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.nucleus_id }}>Nucleus ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.school_name }}>School Name</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.asset_type }}>Asset Type</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.model }}>Model</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.configuration }}>Configuration</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.serial_number }}>Serial Number</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.sd_card_size }}>SD Card Size</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.profile_id }}>Profile ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.product }}>Product</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.asset_status }}>Asset Status</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.asset_group }}>Asset Group</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.far_code }}>FAR Code</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.status }}>Status</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.updated_at }}>Updated At</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.updated_by }}>Updated By</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, width: columnWidths.actions }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={21} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No devices found with current filters. Try adjusting the filters or check data loading.
                      </td>
                    </tr>
                  ) : (
                    paginatedDevices.map((device, index) => (
                      <tr key={device.id}>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.s_no }}>
                          {(currentDevicesPage - 1) * rowsPerPage + index + 1}
                        </td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sales_order }}>{device.sales_order || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_type }}>{device.order_type || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{device.warehouse || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.deal_id }}>{device.deal_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.nucleus_id }}>{device.nucleus_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.school_name }}>{device.school_name || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{device.asset_type || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{device.model || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.configuration }}>{device.configuration || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.serial_number }}>{device.serial_number || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sd_card_size }}>{device.sd_card_size || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.profile_id }}>{device.profile_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.product }}>{device.product || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_status }}>{device.asset_status || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_group }}>{device.asset_group || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.far_code }}>{device.far_code || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.status }}>
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
                        </td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.updated_at }}>{formatDate(device.updated_at) || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.updated_by }}>{device.updated_by || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.actions }}>
                          <button
                            onClick={() => {
                              setViewingDevice(device);
                              setShowViewDialog(true);
                            }}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                <button
                  onClick={() => setCurrentDevicesPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentDevicesPage === 1}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                {pageRange.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && setCurrentDevicesPage(page)}
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
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentDevicesPage((prev) => Math.min(prev + 1, totalDevicesPages))}
                  disabled={currentDevicesPage === totalDevicesPages}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === totalDevicesPages ? 0.5 : 1 }}
                >
                  Next
                </button>
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
                    <p><strong>Updated At:</strong> {formatDate(viewingDevice.updated_at) || ''}</p>
                    <p><strong>Updated By:</strong> {viewingDevice.updated_by || ''}</p>
                    <p><strong>Deleted:</strong> {viewingDevice.is_deleted ? 'Yes' : 'No'}</p>
                  </div>
                  <button
                    onClick={() => setShowViewDialog(false)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', marginTop: '8px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {showDatePickerDialog && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px', maxWidth: '400px', width: '100%' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Select Date Range</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <label htmlFor="fromDate" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>From Date</label>
                      <input
                        type="date"
                        id="fromDate"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="toDate" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>To Date</label>
                      <input
                        type="date"
                        id="toDate"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    <button
                      onClick={handleDateRangeSubmit}
                      style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', background: '#3b82f6', color: '#fff' }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowDatePickerDialog(false)}
                      style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DevicesTable;