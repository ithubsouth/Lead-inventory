import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar } from 'lucide-react';
import { Device } from './types';
import { formatDate } from './utils';

interface OrderSummaryTableProps {
  devices: Device[] | null;
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedAssetType: string;
  setSelectedAssetType: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedConfiguration: string;
  setSelectedConfiguration: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  showDeleted: boolean;
  setShowDeleted: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

interface OrderSummary {
  warehouse: string;
  asset_type: 'Tablet' | 'TV' | 'SD Card' | 'Pendrive' | 'Unknown';
  model: string;
  configuration: string;
  inward: number;
  outward: number;
  stock: number;
}

const OrderSummaryTable: React.FC<OrderSummaryTableProps> = ({
  devices,
  selectedWarehouse,
  setSelectedWarehouse,
  selectedAssetType,
  setSelectedAssetType,
  selectedModel,
  setSelectedModel,
  selectedConfiguration,
  setSelectedConfiguration,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showDatePickerDialog, setShowDatePickerDialog] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  const warehouseOptions = ['All', 'Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur', 'Unknown'];
  const assetTypeOptions = ['All', 'Tablet', 'TV', 'SD Card', 'Pendrive', 'Unknown'];
  const tabletModels = ['Lenovo TB301XU', 'Lenovo TB301FU', 'Lenovo TB-8505F', 'Lenovo TB-7306F', 'Lenovo TB-7306X', 'Lenovo TB-7305X', 'IRA T811', 'Unknown'];
  const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"', 'Unknown'];
  const allModels = devices ? [...new Set(devices.map(d => d.model || 'Unknown'))].filter(m => m) : ['All', 'Unknown'];
  const modelOptions = selectedAssetType === 'All'
    ? ['All', ...allModels]
    : ['All', ...(selectedAssetType === 'Tablet' ? tabletModels : selectedAssetType === 'TV' ? tvModels : ['Unknown']).filter(model => allModels.includes(model))];
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
    'Unknown',
  ];

  useEffect(() => {
    if (!devices) {
      setOrderSummary([]);
      return;
    }

    const summaryMap = new Map<string, OrderSummary>();
    warehouseOptions.filter(w => w !== 'All').forEach(warehouse => {
      assetTypeOptions.filter(a => a !== 'All').forEach(asset_type => {
        const models = asset_type === 'Tablet' ? tabletModels : asset_type === 'TV' ? tvModels : ['Unknown'];
        models.forEach(model => {
          configurationOptions.filter(c => c !== 'All').forEach(configuration => {
            const key = `${warehouse}-${asset_type}-${model}-${configuration}`;
            summaryMap.set(key, {
              warehouse,
              asset_type: asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive' | 'Unknown',
              model,
              configuration,
              inward: 0,
              outward: 0,
              stock: 0,
            });
          });
        });
      });
    });

    devices.forEach(device => {
      // Handle null/undefined fields by using 'Unknown' as a fallback
      const warehouse = device.warehouse || 'Unknown';
      const asset_type = device.asset_type || 'Unknown';
      const model = device.model || 'Unknown';
      const configuration = device.configuration || 'Unknown';

      const key = `${warehouse}-${asset_type}-${model}-${configuration}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          warehouse,
          asset_type: asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive' | 'Unknown',
          model,
          configuration,
          inward: 0,
          outward: 0,
          stock: 0,
        });
      }
      const summary = summaryMap.get(key)!;
      if (device.status === 'Stock' || device.status === 'Return') {
        summary.inward += 1;
      } else {
        summary.outward += 1;
      }
      summary.stock = summary.inward - summary.outward;
    });

    setOrderSummary(Array.from(summaryMap.values()).filter(s => showDeleted || s.stock !== 0));
  }, [devices, showDeleted]);

  const filteredSummary = orderSummary.filter((summary) => {
    const matchesDeleted = showDeleted || summary.stock !== 0;
    const matchesWarehouse = selectedWarehouse === 'All' || summary.warehouse === selectedWarehouse || (selectedWarehouse === 'Unknown' && summary.warehouse === 'Unknown');
    const matchesAssetType = selectedAssetType === 'All' || summary.asset_type === selectedAssetType || (selectedAssetType === 'Unknown' && summary.asset_type === 'Unknown');
    const matchesModel = selectedModel === 'All' || summary.model === selectedModel || (selectedModel === 'Unknown' && summary.model === 'Unknown');
    const matchesConfiguration = selectedConfiguration === 'All' || summary.configuration === selectedConfiguration || (selectedConfiguration === 'Unknown' && summary.configuration === 'Unknown');
    const matchesSearch = searchQuery
      ? [summary.warehouse, summary.asset_type, summary.model, summary.configuration].some((field) =>
          field?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;

    const matchesDate = (!fromDate || !toDate) || devices?.some(device => {
      if (!device.created_at) return false;
      const deviceDate = new Date(device.created_at).getTime();
      const from = new Date(fromDate).getTime();
      const to = new Date(toDate).getTime();
      return (
        deviceDate >= from &&
        deviceDate <= to &&
        (device.warehouse || 'Unknown') === summary.warehouse &&
        (device.asset_type || 'Unknown') === summary.asset_type &&
        (device.model || 'Unknown') === summary.model &&
        (device.configuration || 'Unknown') === summary.configuration
      );
    });

    return matchesDeleted && matchesWarehouse && matchesAssetType && matchesModel && matchesConfiguration && matchesSearch && matchesDate;
  });

  const sortedSummary = [...filteredSummary].sort((a, b) => {
    const warehouseA = a.warehouse || 'Unknown';
    const warehouseB = b.warehouse || 'Unknown';
    if (warehouseA !== warehouseB) {
      return warehouseA.localeCompare(warehouseB);
    }
    const assetTypeA = a.asset_type || 'Unknown';
    const assetTypeB = b.asset_type || 'Unknown';
    if (assetTypeA !== assetTypeB) {
      return assetTypeA.localeCompare(assetTypeB);
    }
    const modelA = a.model || 'Unknown';
    const modelB = b.model || 'Unknown';
    if (modelA !== modelB) {
      return modelA.localeCompare(modelB);
    }
    const configA = a.configuration || 'Unknown';
    const configB = b.configuration || 'Unknown';
    return configA.localeCompare(configB);
  });

  useEffect(() => {
    console.log('OrderSummaryTable props:', {
      devicesLength: devices?.length,
      orderSummaryLength: orderSummary.length,
      deletedSummaries: orderSummary.filter(s => s.stock === 0).length,
      activeSummaries: orderSummary.filter(s => s.stock !== 0).length,
      selectedWarehouse,
      selectedAssetType,
      selectedModel,
      selectedConfiguration,
      fromDate,
      toDate,
      showDeleted,
      searchQuery,
    });
    console.log('Raw summaries (first 5):', orderSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      configuration: s.configuration,
      inward: s.inward,
      outward: s.outward,
      stock: s.stock,
    })));
    console.log('Filtered summaries (first 5):', filteredSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      configuration: s.configuration,
    })));
    console.log('Sorted summaries (first 5):', sortedSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      configuration: s.configuration,
    })));
  }, [devices, orderSummary, selectedWarehouse, selectedAssetType, selectedModel, selectedConfiguration, fromDate, toDate, showDeleted, searchQuery, filteredSummary, sortedSummary]);

  const paginatedSummary = sortedSummary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    console.log('Paginated summaries (first 5):', paginatedSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      configuration: s.configuration,
    })));
    if (sortedSummary.length > 0 && paginatedSummary.length === 0) {
      setCurrentPage(1);
    }
  }, [paginatedSummary, sortedSummary.length]);

  const totalPages = Math.ceil(sortedSummary.length / itemsPerPage);

  const downloadCSV = (data: OrderSummary[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    const headers = ['Warehouse', 'Asset Type', 'Model', 'Configuration', 'Inward', 'Outward', 'Stock'];
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        [
          row.warehouse || 'Unknown',
          row.asset_type || 'Unknown',
          row.model || 'Unknown',
          row.configuration || 'Unknown',
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

  const handleDateRangeSubmit = () => {
    setShowDatePickerDialog(false);
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
                  placeholder="Search by Warehouse, Asset Type, Model, or Configuration"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(sortedSummary, 'order_summary_export.csv')}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Download style={{ width: '12px', height: '12px' }} />
            </button>
            <button
              onClick={() => setShowDatePickerDialog(true)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Calendar style={{ width: '12px', height: '12px' }} />
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
                  setSelectedModel('All');
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
          </div>
        </div>

        {orderSummary.length === 0 ? (
          <div style={{ fontSize: '12px' }}>No order summary available. Check your database or data loading logic.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Warehouse</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Asset Type</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Model</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Configuration</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Inward</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Outward</th>
                  <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                      No summary data found with current filters. Try adjusting the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedSummary.map((summary, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.warehouse}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.asset_type}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.model}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.configuration}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.inward}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.outward}</td>
                      <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db' }}>{summary.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
              <div>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, sortedSummary.length)} of{' '}
                {sortedSummary.length} summaries
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>

            {showDatePickerDialog && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', maxWidth: '400px', width: '100%' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Select Date Range</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label htmlFor="fromDate" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>From Date</label>
                      <input
                        type="date"
                        id="fromDate"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                      />
                    </div>
                    <div>
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
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

export default OrderSummaryTable;