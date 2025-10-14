import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { OrderSummary } from './types';
import { formatDate } from './utils';

interface OrderSummaryTableProps {
  orderSummary: OrderSummary[];
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
  orderSummary,
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

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  // Dynamic filter options for asset_status and asset_group
  const assetStatusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(
        orderSummary
          .map(s => s.asset_status)
          .filter(status => status != null && status.trim() !== '')
      )
    ).sort();
    const options = ['All', ...statuses];
    console.log('Asset Status Options:', options); // Debugging
    return options;
  }, [orderSummary]);

  const assetGroupOptions = useMemo(() => {
    const groups = Array.from(
      new Set(
        orderSummary
          .map(s => s.asset_group)
          .filter(group => group != null && group.trim() !== '')
      )
    ).sort();
    const options = ['All', ...groups];
    console.log('Asset Group Options:', options); // Debugging
    return options;
  }, [orderSummary]);

  useEffect(() => {
    console.log('OrderSummaryTable props:', {
      orderSummaryLength: orderSummary.length,
      deletedSummaries: orderSummary.filter(s => s.inward === 0 && s.outward === 0).length,
      activeSummaries: orderSummary.filter(s => s.inward !== 0 || s.outward !== 0).length,
      selectedWarehouse,
      selectedAssetType,
      selectedModel,
      selectedAssetStatus,
      selectedAssetGroup,
      showDeleted,
      searchQuery,
    });
    console.log('Raw summaries (first 5):', orderSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      asset_status: s.asset_status,
      asset_group: s.asset_group,
    })));
  }, [orderSummary, selectedWarehouse, selectedAssetType, selectedModel, selectedAssetStatus, selectedAssetGroup, showDeleted, searchQuery]);

  const warehouseOptions = ['All', 'Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const assetTypeOptions = ['All', 'Tablet', 'TV', 'SD Card', 'Pendrive'];
  const modelOptions = [
    'All',
    'Lenovo TB301XU',
    'Lenovo TB301FU',
    'Lenovo TB-8505F',
    'Lenovo TB-7306F',
    'Lenovo TB-7306X',
    'Lenovo TB-7305X',
    'IRA T811',
    'Hyundai TV - 39"',
    'Hyundai TV - 43"',
    'Hyundai TV - 50"',
    'Hyundai TV - 55"',
    'Hyundai TV - 65"',
    'Xentec TV - 39"',
    'Xentec TV - 43"',
    '64 GB',
    '128 GB',
    '256 GB',
    '512 GB',
    'Pendrive',
  ];

  const filteredSummary = orderSummary.filter((summary) => {
    const matchesDeleted = showDeleted || (summary.inward !== 0 || summary.outward !== 0);
    const matchesWarehouse = selectedWarehouse === 'All' || summary.warehouse === selectedWarehouse;
    const matchesAssetType = selectedAssetType === 'All' || summary.asset_type === selectedAssetType;
    const matchesModel = selectedModel === 'All' || summary.model === selectedModel;
    const matchesAssetStatus = selectedAssetStatus === 'All' || summary.asset_status === selectedAssetStatus;
    const matchesAssetGroup = selectedAssetGroup === 'All' || summary.asset_group === selectedAssetGroup;
    const matchesDateRange = true; // OrderSummary doesn't have order_date field
    const matchesSearch = searchQuery
      ? [summary.warehouse, summary.asset_type, summary.model, summary.asset_status, summary.asset_group].some((field) =>
          field?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;

    return matchesDeleted && matchesWarehouse && matchesAssetType && matchesModel && matchesAssetStatus && matchesAssetGroup && matchesDateRange && matchesSearch;
  });

  const sortedSummary = [...filteredSummary].sort((a, b) => {
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
    return modelA.localeCompare(modelB);
  });

  useEffect(() => {
    console.log('Filtered summaries (first 5):', filteredSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      asset_status: s.asset_status,
      asset_group: s.asset_group,
    })));
    console.log('Sorted summaries (first 5):', sortedSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      asset_status: s.asset_status,
      asset_group: s.asset_group,
    })));
    console.log('Filtered and sorted summaries summary:', {
      filteredLength: filteredSummary.length,
      sortedLength: sortedSummary.length,
      deletedSummaries: sortedSummary.filter(s => s.inward === 0 && s.outward === 0).length,
      activeSummaries: sortedSummary.filter(s => s.inward !== 0 || s.outward !== 0).length,
    });
  }, [filteredSummary, sortedSummary]);

  const paginatedSummary = sortedSummary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    console.log('Paginated summaries (first 5):', paginatedSummary.slice(0, 5).map(s => ({
      warehouse: s.warehouse,
      asset_type: s.asset_type,
      model: s.model,
      asset_status: s.asset_status,
      asset_group: s.asset_group,
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
                  placeholder="Search by Warehouse, Asset Type, Model, Status, or Group"
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
              <label htmlFor="assetStatusFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Asset Status</label>
              <select
                id="assetStatusFilter"
                value={selectedAssetStatus}
                onChange={(e) => setSelectedAssetStatus(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                {assetStatusOptions.length <= 1 ? (
                  <option value="All">No statuses available</option>
                ) : (
                  assetStatusOptions.map(status => (
                    <option key={status} value={status} style={{ fontSize: '12px' }}>
                      {status}
                    </option>
                  ))
                )}
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
                {assetGroupOptions.length <= 1 ? (
                  <option value="All">No groups available</option>
                ) : (
                  assetGroupOptions.map(group => (
                    <option key={group} value={group} style={{ fontSize: '12px' }}>
                      {group}
                    </option>
                  ))
                )}
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

        {orderSummary.length === 0 ? (
          <div style={{ fontSize: '12px' }}>No order summary available. Create an order or check your database.</div>
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
          </>
        )}
      </div>
    </div>
  );
};

export default OrderSummaryTable;