import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Eye, Edit, Trash2, RotateCcw, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import EditOrderForm from './EditOrderForm';
import { Order } from './types';
import { formatDate } from './utils';
import { debounce } from 'lodash';

interface OrdersTableProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedAssetType: string;
  setSelectedAssetType: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedConfiguration: string;
  setSelectedConfiguration: (value: string) => void;
  selectedOrderType: string;
  setSelectedOrderType: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  showDeleted: boolean;
  setShowDeleted: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  loadOrders: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrderSummary: () => Promise<void>;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  setOrders,
  selectedWarehouse,
  setSelectedWarehouse,
  selectedAssetType,
  setSelectedAssetType,
  selectedModel,
  setSelectedModel,
  selectedConfiguration,
  setSelectedConfiguration,
  selectedOrderType,
  setSelectedOrderType,
  selectedProduct,
  setSelectedProduct,
  selectedStatus,
  setSelectedStatus,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  showDeleted,
  setShowDeleted,
  searchQuery,
  setSearchQuery,
  loading,
  setLoading,
  loadOrders,
  loadDevices,
  loadOrderSummary,
}) => {
  const [currentOrdersPage, setCurrentOrdersPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDatePickerDialog, setShowDatePickerDialog] = useState(false);
  const [statusDialogOrder, setStatusDialogOrder] = useState<Order | null>(null);
  const [statusError, setStatusError] = useState<string>('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Mock toast for error/success messages
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  // Debounce search input
  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => setSearchQuery(value.trim()), 300),
    []
  );

  // Handle keyboard and mouse scroll for horizontal scrolling
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
        container.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' });
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

  // Reset page on filter or search changes
  useEffect(() => {
    setCurrentOrdersPage(1);
  }, [searchQuery, showDeleted, selectedWarehouse, selectedAssetType, selectedModel, selectedConfiguration, selectedOrderType, selectedProduct, selectedStatus, fromDate, toDate]);

  // Debug logging
  useEffect(() => {
    console.log('OrdersTable props:', {
      ordersLength: orders.length,
      deletedOrders: orders.filter(o => o.is_deleted).length,
      activeOrders: orders.filter(o => !o.is_deleted).length,
      showDeleted,
      searchQuery,
    });
    console.log('Raw orders (first 5):', orders.slice(0, 5).map(o => ({
      id: o.id,
      sales_order: o.sales_order || '',
      is_deleted: o.is_deleted,
    })));
  }, [orders, showDeleted, searchQuery]);

  // Memoize orders to prevent unnecessary re-renders
  const memoizedOrders = useMemo(() => orders, [orders]);

  // Dynamically generate dropdown options
  const warehouseOptions = useMemo(() => ['All', ...[...new Set(memoizedOrders.map(o => o.warehouse || ''))].filter(w => w).sort()], [memoizedOrders]);
  const assetTypeOptions = useMemo(() => ['All', ...[...new Set(memoizedOrders.map(o => o.asset_type || ''))].filter(a => a).sort()], [memoizedOrders]);
  const modelOptions = useMemo(() => ['All', ...[...new Set(
    selectedAssetType === 'All'
      ? memoizedOrders.map(o => o.model || '')
      : memoizedOrders.filter(o => o.asset_type === selectedAssetType).map(o => o.model || '')
  )].filter(m => m).sort()], [memoizedOrders, selectedAssetType]);
  const configurationOptions = useMemo(() => ['All', ...[...new Set(
    selectedModel === 'All'
      ? memoizedOrders.map(o => o.configuration || '')
      : memoizedOrders.filter(o => o.model === selectedModel).map(o => o.configuration || '')
  )].filter(c => c).sort()], [memoizedOrders, selectedModel]);
  const orderTypeOptions = useMemo(() => ['All', ...[...new Set(memoizedOrders.map(o => o.order_type || ''))].filter(o => o).sort()], [memoizedOrders]);
  const productOptions = useMemo(() => ['All', ...[...new Set(memoizedOrders.map(o => o.product || ''))].filter(p => p).sort()], [memoizedOrders]);
  const statusOptions = useMemo(() => ['All', ...[...new Set(memoizedOrders.map(o => o.status || ''))].filter(s => s).sort()], [memoizedOrders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return memoizedOrders.filter((order) => {
      const matchesDeleted = showDeleted ? order.is_deleted : !order.is_deleted;
      const matchesWarehouse = selectedWarehouse === 'All' || (order.warehouse || '') === selectedWarehouse;
      const matchesAssetType = selectedAssetType === 'All' || (order.asset_type || '') === selectedAssetType;
      const matchesModel = selectedModel === 'All' || (order.model || '') === selectedModel;
      const matchesConfiguration = selectedConfiguration === 'All' || (order.configuration || '') === selectedConfiguration;
      const matchesOrderType = selectedOrderType === 'All' || (order.order_type || '') === selectedOrderType;
      const matchesProduct = selectedProduct === 'All' || (order.product || '') === selectedProduct;
      const matchesStatus = selectedStatus === 'All' || (order.status || '') === selectedStatus;
      const matchesDateRange =
        (!fromDate || !order.order_date || new Date(order.order_date) >= new Date(fromDate)) &&
        (!toDate || !order.order_date || new Date(order.order_date) <= new Date(toDate));
      const matchesSearch = searchQuery
        ? [
            (order.sales_order || '').trim(),
            (order.deal_id || '').trim(),
            (order.school_name || '').trim(),
            (order.nucleus_id || '').trim(),
            (order.profile_id || '').trim(),
          ].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        : true;

      return (
        matchesDeleted &&
        matchesWarehouse &&
        matchesAssetType &&
        matchesModel &&
        matchesConfiguration &&
        matchesOrderType &&
        matchesProduct &&
        matchesStatus &&
        matchesDateRange &&
        matchesSearch
      );
    });
  }, [
    memoizedOrders,
    showDeleted,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedOrderType,
    selectedProduct,
    selectedStatus,
    fromDate,
    toDate,
    searchQuery,
  ]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const dateA = a.order_date ? new Date(a.order_date).getTime() : -Infinity;
      const dateB = b.order_date ? new Date(b.order_date).getTime() : -Infinity;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      const salesOrderA = a.sales_order || '';
      const salesOrderB = b.sales_order || '';
      return salesOrderA.localeCompare(salesOrderB);
    });
  }, [filteredOrders]);

  // Debug sorting and filtering
  useEffect(() => {
    console.log('Filtered orders (first 5):', filteredOrders.slice(0, 5).map(o => ({
      id: o.id,
      sales_order: o.sales_order || '',
      is_deleted: o.is_deleted,
    })));
    console.log('Sorted orders (first 5):', sortedOrders.slice(0, 5).map(o => ({
      id: o.id,
      sales_order: o.sales_order || '',
      is_deleted: o.is_deleted,
    })));
  }, [filteredOrders, sortedOrders]);

  // Group orders by sales_order
  const ordersBySalesOrder = useMemo(() => {
    return sortedOrders.reduce((acc, order, index) => {
      const salesOrder = order.sales_order || 'No Sales Order';
      if (!acc[salesOrder]) {
        acc[salesOrder] = [];
      }
      acc[salesOrder].push({ ...order, originalIndex: index });
      return acc;
    }, {} as Record<string, (Order & { originalIndex: number })[]>);
  }, [sortedOrders]);

  const ordersWithCounts = useMemo(() => {
    return Object.entries(ordersBySalesOrder)
      .flatMap(([salesOrder, orders]) =>
        orders
          .sort((a, b) => a.originalIndex - b.originalIndex)
          .map((order, index) => ({
            ...order,
            orderCount: `${index + 1}/${orders.length}`,
          }))
      )
      .sort((a, b) => a.originalIndex - b.originalIndex);
  }, [ordersBySalesOrder]);

  const duplicateSerials = useMemo(() => {
    const duplicates = new Set<string>();
    Object.values(ordersBySalesOrder).forEach(salesOrderGroup => {
      const allSerials = salesOrderGroup.flatMap(order => order.serial_numbers || []);
      const seen = new Set();
      allSerials.forEach(serial => {
        if (serial && seen.has(serial)) {
          duplicates.add(serial);
        }
        seen.add(serial);
      });
    });
    return duplicates;
  }, [ordersBySalesOrder]);

  const paginatedOrders = useMemo(() => {
    return ordersWithCounts.slice(
      (currentOrdersPage - 1) * ordersPerPage,
      currentOrdersPage * ordersPerPage
    );
  }, [ordersWithCounts, currentOrdersPage, ordersPerPage]);

  const totalOrdersPages = Math.ceil(ordersWithCounts.length / ordersPerPage);

  const handleStatusClick = (order: Order) => {
    if (order.status === 'Pending' || order.status === 'Failed') {
      setStatusError(order.statusDetails || 'No status details available');
      setStatusDialogOrder(order);
      setShowStatusDialog(true);
    }
  };

  const softDeleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const { error: orderError } = await supabase
        .from('orders')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (orderError) throw orderError;

      const { error: deviceError } = await supabase
        .from('devices')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
      if (deviceError) throw deviceError;

      await Promise.all([loadOrders(), loadDevices(), loadOrderSummary()]);
      toast({ title: 'Success', description: 'Order soft deleted successfully' });
    } catch (error) {
      console.error('Error soft deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to soft delete order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const { error: orderError } = await supabase
        .from('orders')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (orderError) throw orderError;

      const { error: deviceError } = await supabase
        .from('devices')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
      if (deviceError) throw deviceError;

      await Promise.all([loadOrders(), loadDevices(), loadOrderSummary()]);
      toast({ title: 'Success', description: 'Order restored successfully' });
    } catch (error) {
      console.error('Error restoring order:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    const headers = [
      'id',
      'sales_order',
      'order_type',
      'warehouse',
      'deal_id',
      'nucleus_id',
      'school_name',
      'asset_type',
      'model',
      'configuration',
      'quantity',
      'sd_card_size',
      'profile_id',
      'product',
      'status',
      'order_date',
      'updated_by',
      'serial_numbers',
      'is_deleted',
    ];
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (header === 'serial_numbers') {
              return `"${(value || []).join(';')}"`;
            }
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

  const handleEditSave = (updatedOrder: Order) => {
    setOrders(orders.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
    setShowEditDialog(false);
    setEditingOrder(null);
    loadOrders();
    loadDevices();
    loadOrderSummary();
  };

  const handleDateRangeSubmit = () => {
    setShowDatePickerDialog(false);
  };

  const columnWidths = {
    sales_order: '150px',
    order_type: '120px',
    warehouse: '120px',
    deal_id: '120px',
    nucleus_id: '120px',
    school_name: '150px',
    asset_type: '100px',
    model: '150px',
    configuration: '150px',
    quantity: '80px',
    sd_card_size: '100px',
    profile_id: '120px',
    product: '150px',
    status: '100px',
    order_date: '150px',
    updated_by: '120px',
    actions: '120px',
  };

  if (loading) {
    return <div style={{ fontSize: '12px' }}>Loading orders...</div>;
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px', overflowY: 'auto', maxHeight: '600px' }}>
      <div style={{ padding: '8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ flex: 1, maxWidth: '1200px' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '8px', width: '12px', height: '12px', color: '#6b7280' }} />
                <input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                  placeholder="Search by Sales Order, Deal ID, School, Nucleus ID, or Profile ID"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px' }}
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(ordersWithCounts, 'orders_export.csv')}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', maxWidth: '1200px' }}>
            <div style={{ flex: '1 1 150px' }}>
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
            <div style={{ flex: '1 1 150px' }}>
              <label htmlFor="assetTypeFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Asset Type</label>
              <select
                id="assetTypeFilter"
                value={selectedAssetType}
                onChange={(e) => {
                  setSelectedAssetType(e.target.value);
                  setSelectedModel('All');
                  setSelectedConfiguration('All');
                }}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {assetTypeOptions.map(assetType => (
                  <option key={assetType} value={assetType} style={{ fontSize: '12px' }}>
                    {assetType}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label htmlFor="modelFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Model</label>
              <select
                id="modelFilter"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedConfiguration('All');
                }}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {modelOptions.map(model => (
                  <option key={model} value={model} style={{ fontSize: '12px' }}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label htmlFor="configurationFilter" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Configuration</label>
              <select
                id="configurationFilter"
                value={selectedConfiguration}
                onChange={(e) => setSelectedConfiguration(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {configurationOptions.map(configuration => (
                  <option key={configuration} value={configuration} style={{ fontSize: '12px' }}>
                    {configuration}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
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
            <div style={{ flex: '1 1 150px' }}>
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
            <div style={{ flex: '1 1 150px' }}>
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

        {memoizedOrders.length === 0 ? (
          <div style={{ fontSize: '12px' }}>No orders available. Create an order or check your database.</div>
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
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sales_order }}>Sales Order</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.order_type }}>Order Type</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.warehouse }}>Warehouse</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.deal_id }}>Deal ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.nucleus_id }}>Nucleus ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.school_name }}>School Name</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_type }}>Asset Type</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.model }}>Model</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.configuration }}>Configuration</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.quantity }}>Quantity</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sd_card_size }}>SD Card Size</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.profile_id }}>Profile ID</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.product }}>Product</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.status }}>Status</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.order_date }}>Order Date</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.updated_by }}>Updated By</th>
                    <th style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.actions }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={17} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No orders found with current filters. Try adjusting the filters or check loadOrders.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sales_order }}>{order.sales_order || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_type }}>{order.order_type || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{order.warehouse || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.deal_id }}>{order.deal_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.nucleus_id }}>{order.nucleus_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.school_name }}>{order.school_name || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{order.asset_type || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{order.model || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.configuration }}>{order.configuration || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.quantity }}>{order.quantity || 0}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sd_card_size }}>{order.sd_card_size || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.profile_id }}>{order.profile_id || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.product }}>{order.product || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.status }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background:
                                order.status === 'Success' ? '#3b82f6' :
                                order.status === 'Failed' ? '#ef4444' : '#6b7280',
                              color: '#fff',
                              cursor: order.status === 'Pending' || order.status === 'Failed' ? 'pointer' : 'default',
                              fontSize: '12px',
                            }}
                            onClick={() => handleStatusClick(order)}
                          >
                            {order.status || ''}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_date }}>{formatDate(order.order_date) || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.updated_by }}>{order.updated_by || ''}</td>
                        <td style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.actions }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => {
                                setViewingOrder(order);
                                setShowViewDialog(true);
                              }}
                              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                            >
                              <Eye style={{ width: '12px', height: '12px' }} />
                            </button>
                            {!order.is_deleted && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setShowEditDialog(true);
                                  }}
                                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                                >
                                  <Edit style={{ width: '12px', height: '12px' }} />
                                </button>
                                <button
                                  onClick={() => softDeleteOrder(order.id)}
                                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                                >
                                  <Trash2 style={{ width: '12px', height: '12px' }} />
                                </button>
                              </>
                            )}
                            {order.is_deleted && (
                              <button
                                onClick={() => restoreOrder(order.id)}
                                style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                              >
                                <RotateCcw style={{ width: '12px', height: '12px' }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
              <div>
                Showing {(currentOrdersPage - 1) * ordersPerPage + 1} to{' '}
                {Math.min(currentOrdersPage * ordersPerPage, ordersWithCounts.length)} of{' '}
                {ordersWithCounts.length} orders
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentOrdersPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentOrdersPage === 1}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentOrdersPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentOrdersPage(prev => Math.min(prev + 1, totalOrdersPages))}
                  disabled={currentOrdersPage === totalOrdersPages}
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', opacity: currentOrdersPage === totalOrdersPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>

            {showViewDialog && viewingOrder && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto', padding: '8px', maxWidth: '600px', width: '100%' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Order Details</h2>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p><strong>Sales Order:</strong> {viewingOrder.sales_order || ''}</p>
                    <p><strong>Order Type:</strong> {viewingOrder.order_type || ''}</p>
                    <p><strong>Warehouse:</strong> {viewingOrder.warehouse || ''}</p>
                    <p><strong>Deal ID:</strong> {viewingOrder.deal_id || ''}</p>
                    <p><strong>Nucleus ID:</strong> {viewingOrder.nucleus_id || ''}</p>
                    <p><strong>School Name:</strong> {viewingOrder.school_name || ''}</p>
                    <p><strong>Asset Type:</strong> {viewingOrder.asset_type || ''}</p>
                    <p><strong>Model:</strong> {viewingOrder.model || ''}</p>
                    <p><strong>Configuration:</strong> {viewingOrder.configuration || ''}</p>
                    <p><strong>Quantity:</strong> {viewingOrder.quantity || 0}</p>
                    <p><strong>SD Card Size:</strong> {viewingOrder.sd_card_size || ''}</p>
                    <p><strong>Profile ID:</strong> {viewingOrder.profile_id || ''}</p>
                    <p><strong>Product:</strong> {viewingOrder.product || ''}</p>
                    <p><strong>Status:</strong> {viewingOrder.status || ''}</p>
                    <p><strong>Order Date:</strong> {formatDate(viewingOrder.order_date) || ''}</p>
                    <p><strong>Updated By:</strong> {viewingOrder.updated_by || ''}</p>
                    <p><strong>Serial Numbers:</strong></p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                      {(viewingOrder.serial_numbers || []).map((serial, index) => (
                        <li key={index} style={{ color: duplicateSerials.has(serial) ? '#ef4444' : 'inherit', fontSize: '12px' }}>
                          {serial || `Missing Serial ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                    {viewingOrder.editHistory && viewingOrder.editHistory.length > 0 && (
                      <>
                        <p><strong>Edit History:</strong></p>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                          {[...viewingOrder.editHistory]
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((entry, index) => (
                              <li key={index} style={{ fontSize: '12px' }}>
                                {formatDate(entry.timestamp)}: {entry.changes}
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                    <p><strong>Deleted:</strong> {viewingOrder.is_deleted ? 'Yes' : 'No'}</p>
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

            {showEditDialog && editingOrder && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto', padding: '8px', maxWidth: '80vw', width: '100%' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Edit Order</h2>
                  <EditOrderForm
                    order={editingOrder}
                    onSave={handleEditSave}
                    onCancel={() => {
                      setShowEditDialog(false);
                      setEditingOrder(null);
                    }}
                  />
                </div>
              </div>
            )}

            {showStatusDialog && statusDialogOrder && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px', maxWidth: '600px', width: '100%' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Order Status Details</h2>
                  <p style={{ fontSize: '12px' }}>{statusError}</p>
                  <button
                    onClick={() => setShowStatusDialog(false)}
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

export default OrdersTable;