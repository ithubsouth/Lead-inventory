import React, { useState, useEffect } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { Device } from './types';
import { formatDate } from './utils';

interface DevicesTableProps {
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
  const [devicesPerPage] = useState(20);
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  // Log props for debugging
  useEffect(() => {
    console.log('DevicesTable props:', {
      devicesLength: devices.length,
      deletedDevices: devices.filter(d => d.is_deleted).length,
      activeDevices: devices.filter(d => !d.is_deleted).length,
      selectedWarehouse,
      selectedAssetType,
      selectedModel,
      selectedAssetStatus,
      selectedConfiguration,
      selectedProduct,
      showDeleted,
      searchQuery,
    });
    console.log('Raw devices (first 5):', devices.slice(0, 5).map(d => ({
      id: d.id,
      warehouse: d.warehouse || 'N/A',
      asset_type: d.asset_type || 'N/A',
      model: d.model || 'N/A',
      configuration: d.configuration || 'N/A',
      asset_status: d.asset_status || 'N/A',
      product: d.product || 'N/A',
      created_at: d.created_at || 'N/A',
    })));
  }, [devices, selectedWarehouse, selectedAssetType, selectedModel, selectedAssetStatus, selectedConfiguration, selectedProduct, showDeleted, searchQuery]);

  const warehouseOptions = ['All', 'Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const assetTypeOptions = ['All', 'Tablet', 'TV'];
  const tabletModels = ['Lenovo TB301XU', 'Lenovo TB301FU', 'Lenovo TB-8505F', 'Lenovo TB-7306F', 'Lenovo TB-7306X', 'Lenovo TB-7305X', 'IRA T811'];
  const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];
  const allModels = [...new Set(devices.map(d => d.model || ''))].filter(m => m);
  const modelOptions = selectedAssetType === 'All'
    ? ['All', ...allModels]
    : ['All', ...(selectedAssetType === 'Tablet' ? tabletModels : tvModels).filter(model => allModels.includes(model))];
  const assetStatusOptions = ['All', 'Fresh', 'Refurb', 'Scrap'];
  const configurationOptions = [
    'All',
    '1G+8 GB (Android-7)',
    '1G+16 GB (Android-9)',
    '1G+32 GB (Android-9)',
    '2G+16 GB (Android-9)',
    '2G+32 GB (Android-9)',
    '2G+32 GB (Android-10)',
    '3G+32 GB (Android-10)',
    '3G+32 GB (Android-13)',
    '4G+64 GB (Android-13)',
  ];
  const productOptions = ['All', 'Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];

  // Filter devices with null checks
  const filteredDevices = devices.filter((device) => {
    const matchesDeleted = showDeleted ? true : !device.is_deleted;
    const matchesWarehouse = selectedWarehouse === 'All' || (device.warehouse || '') === selectedWarehouse;
    const matchesAssetType = selectedAssetType === 'All' || (device.asset_type || '') === selectedAssetType;
    const matchesModel = selectedModel === 'All' || (device.model || '') === selectedModel;
    const matchesAssetStatus = selectedAssetStatus === 'All' || (device.asset_status || '') === selectedAssetStatus;
    const matchesConfiguration = selectedConfiguration === 'All' || (device.configuration || '') === selectedConfiguration;
    const matchesProduct = selectedProduct === 'All' || (device.product || '') === selectedProduct;
    const matchesDateRange =
      (!fromDate || !device.created_at || new Date(device.created_at) >= new Date(fromDate)) &&
      (!toDate || !device.created_at || new Date(device.created_at) <= new Date(toDate));
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
        ].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    return matchesDeleted && matchesWarehouse && matchesAssetType && matchesModel && matchesAssetStatus && matchesConfiguration && matchesProduct && matchesDateRange && matchesSearch;
  });

  // Sort devices by created_at (descending), then warehouse, sales_order, asset_type, model, product, asset_status (ascending)
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    // Primary: created_at (descending)
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (dateA !== dateB) {
      return dateB - dateA; // Descending order
    }

    // Secondary: warehouse (ascending)
    const warehouseA = a.warehouse || '';
    const warehouseB = b.warehouse || '';
    if (warehouseA !== warehouseB) {
      return warehouseA.localeCompare(warehouseB);
    }

    // Tertiary: sales_order (ascending)
    const salesOrderA = a.sales_order || '';
    const salesOrderB = b.sales_order || '';
    if (salesOrderA !== salesOrderB) {
      return salesOrderA.localeCompare(salesOrderB);
    }

    // Quaternary: asset_type (ascending)
    const assetTypeA = a.asset_type || '';
    const assetTypeB = b.asset_type || '';
    if (assetTypeA !== assetTypeB) {
      return assetTypeA.localeCompare(assetTypeB);
    }

    // Quinary: model (ascending)
    const modelA = a.model || '';
    const modelB = b.model || '';
    if (modelA !== modelB) {
      return modelA.localeCompare(modelB);
    }

    // Senary: product (ascending)
    const productA = a.product || '';
    const productB = b.product || '';
    if (productA !== productB) {
      return productA.localeCompare(productB);
    }

    // Septenary: asset_status (ascending)
    const assetStatusA = a.asset_status || '';
    const assetStatusB = b.asset_status || '';
    return assetStatusA.localeCompare(assetStatusB);
  });

  // Log filtering and sorting for debugging
  useEffect(() => {
    const invalidDates = filteredDevices.filter(d => d.created_at && isNaN(new Date(d.created_at).getTime())).map(d => ({
      id: d.id,
      warehouse: d.warehouse || 'N/A',
      asset_type: d.asset_type || 'N/A',
      model: d.model || 'N/A',
      configuration: d.configuration || 'N/A',
      asset_status: d.asset_status || 'N/A',
    }));
    if (invalidDates.length > 0) {
      console.warn('Invalid created_at values detected:', invalidDates);
    }
    console.log('Filtered devices (first 5):', filteredDevices.slice(0, 5).map(d => ({
      id: d.id,
      warehouse: d.warehouse || 'N/A',
      asset_type: d.asset_type || 'N/A',
      model: d.model || 'N/A',
      configuration: d.configuration || 'N/A',
      asset_status: d.asset_status || 'N/A',
      created_at: d.created_at || 'N/A',
    })));
    console.log('Sorted devices (first 5):', sortedDevices.slice(0, 5).map(d => ({
      id: d.id,
      created_at: d.created_at || 'N/A',
      warehouse: d.warehouse || 'N/A',
      sales_order: d.sales_order || 'N/A',
      asset_type: d.asset_type || 'N/A',
      model: d.model || 'N/A',
      product: d.product || 'N/A',
      asset_status: d.asset_status || 'N/A',
    })));
    console.log('Filtered and sorted devices summary:', {
      filteredLength: filteredDevices.length,
      sortedLength: sortedDevices.length,
      deletedDevices: sortedDevices.filter(d => d.is_deleted).length,
      activeDevices: sortedDevices.filter(d => !d.is_deleted).length,
    });
  }, [filteredDevices, sortedDevices]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentDevicesPage(1);
  }, [selectedWarehouse, selectedAssetType, selectedModel, selectedAssetStatus, selectedConfiguration, selectedProduct, fromDate, toDate, showDeleted, searchQuery]);

  const paginatedDevices = sortedDevices.slice(
    (currentDevicesPage - 1) * devicesPerPage,
    currentDevicesPage * devicesPerPage
  );

  // Log pagination for debugging
  useEffect(() => {
    console.log('Paginated devices (first 5):', paginatedDevices.slice(0, 5).map(d => ({
      id: d.id,
      created_at: d.created_at || 'N/A',
      warehouse: d.warehouse || 'N/A',
      sales_order: d.sales_order || 'N/A',
      asset_type: d.asset_type || 'N/A',
      model: d.model || 'N/A',
      product: d.product || 'N/A',
      asset_status: d.asset_status || 'N/A',
    })));
    console.log('Pagination info:', {
      currentDevicesPage,
      devicesPerPage,
      sortedDevicesLength: sortedDevices.length,
      totalDevicesPages: Math.ceil(sortedDevices.length / devicesPerPage),
    });
  }, [paginatedDevices, sortedDevices.length, currentDevicesPage]);

  const totalDevicesPages = Math.ceil(sortedDevices.length / devicesPerPage);

  const downloadCSV = (data: Device[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    const headers = [
      'id',
      'asset_type',
      'model',
      'configuration',
      'asset_status',
      'product',
      'serial_number',
      'warehouse',
      'sales_order',
      'deal_id',
      'school_name',
      'nucleus_id',
      'status',
      'created_at',
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

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '16px' }}>
      <div style={{ padding: '8px 0' }}></div>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, maxWidth: '1200px' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '8px', width: '12px', height: '12px', color: '#6b7280' }} />
                <input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Serial, Sales Order, Deal ID, School, Nucleus ID, Asset Type, Model, Configuration, Asset Status, or Product"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(sortedDevices, 'devices_export.csv')}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Download style={{ width: '12px', height: '12px' }} />
            </button>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
            >
              {showDeleted ? 'Show Active' : 'Show Deleted'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="warehouseFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Warehouse</label>
              <select
                id="warehouseFilter"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {warehouseOptions.map(warehouse => (
                  <option key={warehouse} value={warehouse} style={{ fontSize: '12px' }}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="assetTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Asset Type</label>
              <select
                id="assetTypeFilter"
                value={selectedAssetType}
                onChange={(e) => {
                  setSelectedAssetType(e.target.value);
                  setSelectedModel('All'); // Reset model when asset type changes
                }}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {assetTypeOptions.map(assetType => (
                  <option key={assetType} value={assetType} style={{ fontSize: '12px' }}>
                    {assetType}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="modelFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Model</label>
              <select
                id="modelFilter"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {modelOptions.map(model => (
                  <option key={model} value={model} style={{ fontSize: '12px' }}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="assetStatusFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Asset Status</label>
              <select
                id="assetStatusFilter"
                value={selectedAssetStatus}
                onChange={(e) => setSelectedAssetStatus(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {assetStatusOptions.map(status => (
                  <option key={status} value={status} style={{ fontSize: '12px' }}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="configurationFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Configuration</label>
              <select
                id="configurationFilter"
                value={selectedConfiguration}
                onChange={(e) => setSelectedConfiguration(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {configurationOptions.map(config => (
                  <option key={config} value={config} style={{ fontSize: '12px' }}>
                    {config}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="productFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Product</label>
              <select
                id="productFilter"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {productOptions.map(product => (
                  <option key={product} value={product} style={{ fontSize: '12px' }}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="fromDate" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>From Date</label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label htmlFor="toDate" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>To Date</label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
          </div>
        </div>

        {devices.length === 0 ? (
          <div style={{ fontSize: '12px' }}>No devices available. Check your database or data loading logic.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Asset Type</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Model</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Configuration</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Asset Status</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Product</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Serial Number</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Warehouse</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Sales Order</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Deal ID</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>School Name</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Nucleus ID</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Status</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Created At</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                      No devices found with current filters. Try adjusting the filters or check data loading.
                    </td>
                  </tr>
                ) : (
                  paginatedDevices.map((device) => (
                    <tr key={device.id}>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.asset_type || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.model || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.configuration || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.asset_status || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.product || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.serial_number || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.warehouse || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.sales_order || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.deal_id || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.school_name || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{device.nucleus_id || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: device.status === 'Available' ? '#3b82f6' : '#6b7280',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        >
                          {device.status || 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{formatDate(device.created_at) || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
              <div>
                Showing {(currentDevicesPage - 1) * devicesPerPage + 1} to{' '}
                {Math.min(currentDevicesPage * devicesPerPage, sortedDevices.length)} of{' '}
                {sortedDevices.length} devices
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentDevicesPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentDevicesPage === 1}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentDevicesPage(prev => Math.min(prev + 1, totalDevicesPages))}
                  disabled={currentDevicesPage === totalDevicesPages}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentDevicesPage === totalDevicesPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>

            {showViewDialog && viewingDevice && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto', padding: '16px', maxWidth: '600px', width: '100%' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Device Details</h2>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p><strong>ID:</strong> {viewingDevice.id}</p>
                    <p><strong>Asset Type:</strong> {viewingDevice.asset_type || 'N/A'}</p>
                    <p><strong>Model:</strong> {viewingDevice.model || 'N/A'}</p>
                    <p><strong>Configuration:</strong> {viewingDevice.configuration || 'N/A'}</p>
                    <p><strong>Asset Status:</strong> {viewingDevice.asset_status || 'N/A'}</p>
                    <p><strong>Product:</strong> {viewingDevice.product || 'N/A'}</p>
                    <p><strong>Serial Number:</strong> {viewingDevice.serial_number || 'N/A'}</p>
                    <p><strong>Warehouse:</strong> {viewingDevice.warehouse || 'N/A'}</p>
                    <p><strong>Sales Order:</strong> {viewingDevice.sales_order || 'N/A'}</p>
                    <p><strong>Deal ID:</strong> {viewingDevice.deal_id || 'N/A'}</p>
                    <p><strong>School Name:</strong> {viewingDevice.school_name || 'N/A'}</p>
                    <p><strong>Nucleus ID:</strong> {viewingDevice.nucleus_id || 'N/A'}</p>
                    <p><strong>Status:</strong> {viewingDevice.status || 'N/A'}</p>
                    <p><strong>Created At:</strong> {formatDate(viewingDevice.created_at) || 'N/A'}</p>
                    <p><strong>Deleted:</strong> {viewingDevice.is_deleted ? 'Yes' : 'No'}</p>
                  </div>
                  <button
                    onClick={() => setShowViewDialog(false)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', marginTop: '16px' }}
                  >
                    Close
                  </button>
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