import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { OrderSummary, Device } from './types';
import { formatDate } from './utils';

interface OrderSummaryTableProps {
  devices: Device[];
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedAssetType: string;
  setSelectedAssetType: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedAssetStatus: string;
  setSelectedAssetStatus: (value: string) => void;
  selectedAssetGroup: string;
  setSelectedAssetGroup: (value: string) => void;
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
  toDate,
  setToDate,
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
  const warehouseOptions = useMemo(() => 
    ['All', ...new Set(activeDevices.map(d => d.warehouse).filter(Boolean))].sort(), 
    [activeDevices]
  );

  const assetTypeOptions = useMemo(() => {
    const filteredDevices = selectedWarehouse === 'All' 
      ? activeDevices 
      : activeDevices.filter(d => d.warehouse === selectedWarehouse);
    return ['All', ...new Set(filteredDevices.map(d => d.asset_type).filter(Boolean))].sort();
  }, [activeDevices, selectedWarehouse]);

  const modelOptions = useMemo(() => {
    let filteredDevices = selectedWarehouse === 'All' 
      ? activeDevices 
      : activeDevices.filter(d => d.warehouse === selectedWarehouse);
    if (selectedAssetType !== 'All') {
      filteredDevices = filteredDevices.filter(d => d.asset_type === selectedAssetType);
    }
    return ['All', ...new Set(filteredDevices.map(d => d.model).filter(Boolean))].sort();
  }, [activeDevices, selectedWarehouse, selectedAssetType]);

  const productOptions = useMemo(() => {
    const filteredDevices = selectedWarehouse === 'All' 
      ? activeDevices 
      : activeDevices.filter(d => d.warehouse === selectedWarehouse);
    return ['All', ...new Set(filteredDevices.map(d => d.product).filter(Boolean))].sort();
  }, [activeDevices, selectedWarehouse]);

  const assetStatusOptions = useMemo(() => {
    const filteredDevices = selectedWarehouse === 'All' 
      ? activeDevices 
      : activeDevices.filter(d => d.warehouse === selectedWarehouse);
    return ['All', ...new Set(filteredDevices.map(d => d.asset_status).filter(Boolean))].sort();
  }, [activeDevices, selectedWarehouse]);

  const assetGroupOptions = useMemo(() => {
    const filteredDevices = selectedWarehouse === 'All' 
      ? activeDevices 
      : activeDevices.filter(d => d.warehouse === selectedWarehouse);
    return ['All', ...new Set(filteredDevices.map(d => d.asset_group).filter(Boolean))].sort();
  }, [activeDevices, selectedWarehouse]);

  // Reset invalid selections
  useEffect(() => {
    if (selectedAssetType !== 'All' && !assetTypeOptions.includes(selectedAssetType)) {
      setSelectedAssetType('All');
    }
  }, [assetTypeOptions, selectedAssetType, setSelectedAssetType]);

  useEffect(() => {
    if (selectedModel !== 'All' && !modelOptions.includes(selectedModel)) {
      setSelectedModel('All');
    }
  }, [modelOptions, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (selectedProduct !== 'All' && !productOptions.includes(selectedProduct)) {
      setSelectedProduct('All');
    }
  }, [productOptions, selectedProduct, setSelectedProduct]);

  useEffect(() => {
    if (selectedAssetStatus !== 'All' && !assetStatusOptions.includes(selectedAssetStatus)) {
      setSelectedAssetStatus('All');
    }
  }, [assetStatusOptions, selectedAssetStatus, setSelectedAssetStatus]);

  useEffect(() => {
    if (selectedAssetGroup !== 'All' && !assetGroupOptions.includes(selectedAssetGroup)) {
      setSelectedAssetGroup('All');
    }
  }, [assetGroupOptions, selectedAssetGroup, setSelectedAssetGroup]);

  // Compute summaries
  const summaries = useMemo(() => {
    let filteredDevices = showDeleted ? devices : activeDevices;

    if (selectedWarehouse !== 'All') filteredDevices = filteredDevices.filter(d => d.warehouse === selectedWarehouse);
    if (selectedAssetType !== 'All') filteredDevices = filteredDevices.filter(d => d.asset_type === selectedAssetType);
    if (selectedModel !== 'All') filteredDevices = filteredDevices.filter(d => d.model === selectedModel);
    if (selectedProduct !== 'All') filteredDevices = filteredDevices.filter(d => d.product === selectedProduct);
    if (selectedAssetStatus !== 'All') filteredDevices = filteredDevices.filter(d => d.asset_status === selectedAssetStatus);
    if (selectedAssetGroup !== 'All') filteredDevices = filteredDevices.filter(d => d.asset_group === selectedAssetGroup);
    if (fromDate) filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') >= new Date(fromDate));
    if (toDate) filteredDevices = filteredDevices.filter(d => new Date(d.created_at || d.updated_at || '1970-01-01') <= new Date(toDate));

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
      s.inward += 1;
      if (d.status === 'Assigned') s.outward += 1;
      else s.stock += 1;

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
          });
        }
        const sd = summaryMap.get(sdKey)!;
        sd.inward += 1;
        if (d.status === 'Assigned') sd.outward += 1;
        else sd.stock += 1;
      }
    });

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
    toDate,
    searchQuery,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWarehouse, selectedAssetType, selectedModel, selectedProduct, selectedAssetStatus, selectedAssetGroup, fromDate, toDate, showDeleted, searchQuery, rowsPerPage]);

  const paginatedSummary = summaries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

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

  const columnWidths = {
    warehouse: '150px',
    asset_type: '120px',
    model: '150px',
    inward: '80px',
    outward: '80px',
    stock: '80px',
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
                  placeholder="Search by Warehouse, Asset Type, or Model"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(summaries, 'order_summary_export.csv')}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Download style={{ width: '12px', height: '12px' }} />
            </button>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
            >
              {showDeleted ? 'Hide Zero Stock' : 'Show Zero Stock'}
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
              <label htmlFor="assetGroupFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Asset Group</label>
              <select
                id="assetGroupFilter"
                value={selectedAssetGroup}
                onChange={(e) => setSelectedAssetGroup(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {assetGroupOptions.map(group => (
                  <option key={group} value={group} style={{ fontSize: '12px' }}>
                    {group}
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
          <div style={{ fontSize: '12px' }}>No devices available. Load devices or check your database.</div>
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
              <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.warehouse }}>Warehouse</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_type }}>Asset Type</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.model }}>Model</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.inward }}>Inward</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.outward }}>Outward</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.stock }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No summary data found with current filters. Try adjusting the filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedSummary.map((summary, index) => (
                      <tr key={index}>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{summary.warehouse}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{summary.asset_type}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{summary.model}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.inward }}>{summary.inward}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.outward }}>{summary.outward}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.stock }}>{summary.stock}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
              <div>
                <span>Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, summaries.length)} of {summaries.length} summaries</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
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
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                {pageRange.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
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
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderSummaryTable;