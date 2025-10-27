import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Eye, Edit, Trash2, RotateCcw, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import EditOrderForm from './EditOrderForm';
import { Order } from './types';
import { formatDate } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiSelect from './MultiSelect';
import { DatePickerWithRange } from './DatePickerWithRange';
import { DateRange } from 'react-day-picker';

interface OrdersTableProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  selectedWarehouse: string[];
  setSelectedWarehouse: (value: string[]) => void;
  selectedAssetType: string[];
  setSelectedAssetType: (value: string[]) => void;
  selectedModel: string[];
  setSelectedModel: (value: string[]) => void;
  selectedConfiguration: string[];
  setSelectedConfiguration: (value: string[]) => void;
  selectedOrderType: string[];
  setSelectedOrderType: (value: string[]) => void;
  selectedProduct: string[];
  setSelectedProduct: (value: string[]) => void;
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
  selectedSdCardSize: string[];
  setSelectedSdCardSize: (value: string[]) => void;
  fromDate: DateRange | undefined;
  setFromDate: (range: DateRange | undefined) => void;
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
  selectedSdCardSize,
  setSelectedSdCardSize,
  fromDate,
  setFromDate,
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusDialogOrder, setStatusDialogOrder] = useState<Order | null>(null);
  const [statusError, setStatusError] = useState<string>('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Mock toast for error/success messages
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
    console.log('OrdersTable props:', {
      ordersLength: orders.length,
      deletedOrders: orders.filter(o => o.is_deleted).length,
      activeOrders: orders.filter(o => !o.is_deleted).length,
      selectedWarehouse,
      selectedAssetType,
      selectedModel,
      selectedConfiguration,
      selectedOrderType,
      selectedProduct,
      selectedStatus,
      selectedSdCardSize,
      fromDate,
      showDeleted,
      searchQuery,
    });
    console.log('Raw orders (first 5):', orders.slice(0, 5).map(o => ({
      id: o.id,
      order_date: o.order_date,
      sales_order: o.sales_order || '',
      order_type: o.order_type || '',
      asset_type: o.asset_type || '',
      model: o.model || '',
      configuration: o.configuration || '',
      quantity: o.quantity || 0,
      sd_card_size: o.sd_card_size || '',
      profile_id: o.profile_id || '',
      product: o.product || '',
      warehouse: o.warehouse || '',
      school_name: o.school_name || '',
      deal_id: o.deal_id || '',
      nucleus_id: o.nucleus_id || '',
      status: o.status || '',
      updated_by: o.updated_by || '',
    })));
  }, [
    orders,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedOrderType,
    selectedProduct,
    selectedStatus,
    selectedSdCardSize,
    fromDate,
    showDeleted,
    searchQuery,
  ]);

  // Compute unique values for dropdown options based on filtered orders
  const uniqueValues = useMemo(() => {
    const filteredOrdersForOptions = orders.filter((order) => {
      const matchesDeleted = showDeleted ? true : !order.is_deleted;
      const matchesDateRange =
        (!fromDate?.from || !order.order_date || new Date(order.order_date) >= new Date(fromDate.from)) &&
        (!fromDate?.to || !order.order_date || new Date(order.order_date) <= new Date(fromDate.to));

      return matchesDeleted && matchesDateRange;
    });

    return {
      warehouses: [...new Set(filteredOrdersForOptions.map(o => o.warehouse || ''))].filter(w => w).sort(),
      assetTypes: [...new Set(filteredOrdersForOptions.map(o => o.asset_type || ''))].filter(a => a).sort(),
      models: [...new Set(filteredOrdersForOptions.map(o => o.model || ''))].filter(m => m).sort(),
      configurations: [...new Set(filteredOrdersForOptions.map(o => o.configuration || ''))].filter(c => c).sort(),
      orderTypes: [...new Set(filteredOrdersForOptions.map(o => o.order_type || ''))].filter(o => o).sort(),
      products: [...new Set(filteredOrdersForOptions.map(o => o.product || ''))].filter(p => p).sort(),
      statuses: [...new Set(filteredOrdersForOptions.map(o => o.status || ''))].filter(s => s).sort(),
      sdCardSizes: [...new Set(filteredOrdersForOptions.map(o => o.sd_card_size || ''))].filter(s => s).sort(),
    };
  }, [orders, showDeleted, fromDate]);

  // Reset dependent filters when any filter changes
  useEffect(() => {
    const validWarehouses = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.warehouse || ''))].filter(w => w);
    if (selectedWarehouse.length > 0 && !selectedWarehouse.every(w => validWarehouses.includes(w))) {
      setSelectedWarehouse([]);
    }

    const validAssetTypes = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.asset_type || ''))].filter(a => a);
    if (selectedAssetType.length > 0 && !selectedAssetType.every(a => validAssetTypes.includes(a))) {
      setSelectedAssetType([]);
    }

    const validModels = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.model || ''))].filter(m => m);
    if (selectedModel.length > 0 && !selectedModel.every(m => validModels.includes(m))) {
      setSelectedModel([]);
    }

    const validConfigurations = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.configuration || ''))].filter(c => c);
    if (selectedConfiguration.length > 0 && !selectedConfiguration.every(c => validConfigurations.includes(c))) {
      setSelectedConfiguration([]);
    }

    const validOrderTypes = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.order_type || ''))].filter(o => o);
    if (selectedOrderType.length > 0 && !selectedOrderType.every(o => validOrderTypes.includes(o))) {
      setSelectedOrderType([]);
    }

    const validProducts = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.product || ''))].filter(p => p);
    if (selectedProduct.length > 0 && !selectedProduct.every(p => validProducts.includes(p))) {
      setSelectedProduct([]);
    }

    const validStatuses = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.status || ''))].filter(s => s);
    if (selectedStatus.length > 0 && !selectedStatus.every(s => validStatuses.includes(s))) {
      setSelectedStatus([]);
    }

    const validSdCardSizes = [...new Set(orders.filter(o => showDeleted ? true : !o.is_deleted).map(o => o.sd_card_size || ''))].filter(s => s);
    if (selectedSdCardSize.length > 0 && !selectedSdCardSize.every(s => validSdCardSizes.includes(s))) {
      setSelectedSdCardSize([]);
    }
  }, [
    orders,
    showDeleted,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedOrderType,
    selectedProduct,
    selectedStatus,
    selectedSdCardSize,
    setSelectedWarehouse,
    setSelectedAssetType,
    setSelectedModel,
    setSelectedConfiguration,
    setSelectedOrderType,
    setSelectedProduct,
    setSelectedStatus,
    setSelectedSdCardSize,
  ]);

  // Filter orders based on all active filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesDeleted = showDeleted ? true : !order.is_deleted;
      const matchesWarehouse = selectedWarehouse.length === 0 || selectedWarehouse.includes(order.warehouse || '');
      const matchesAssetType = selectedAssetType.length === 0 || selectedAssetType.includes(order.asset_type || '');
      const matchesModel = selectedModel.length === 0 || selectedModel.includes(order.model || '');
      const matchesConfiguration = selectedConfiguration.length === 0 || selectedConfiguration.includes(order.configuration || '');
      const matchesOrderType = selectedOrderType.length === 0 || selectedOrderType.includes(order.order_type || '');
      const matchesProduct = selectedProduct.length === 0 || selectedProduct.includes(order.product || '');
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(order.status || '');
      const matchesSdCardSize = selectedSdCardSize.length === 0 || selectedSdCardSize.includes(order.sd_card_size || '');
      const matchesDateRange =
        (!fromDate?.from || !order.order_date || new Date(order.order_date) >= new Date(fromDate.from)) &&
        (!fromDate?.to || !order.order_date || new Date(order.order_date) <= new Date(fromDate.to));
      const matchesSearch = searchQuery
        ? [
            order.sales_order || '',
            order.deal_id || '',
            order.school_name || '',
            order.nucleus_id || '',
            order.profile_id || '',
            ...(order.serial_numbers || []).map(serial => serial || ''),
          ].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
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
        matchesSdCardSize &&
        matchesDateRange &&
        matchesSearch
      );
    });
  }, [
    orders,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedOrderType,
    selectedProduct,
    selectedStatus,
    selectedSdCardSize,
    fromDate,
    showDeleted,
    searchQuery,
  ]);

  // Sort filteredOrders by order_date (descending) and sales_order (ascending)
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

  // Debug sorting and check for invalid dates
  useEffect(() => {
    const invalidDates = filteredOrders.filter(o => o.order_date && isNaN(new Date(o.order_date).getTime())).map(o => ({
      id: o.id,
      order_date: o.order_date,
      sales_order: o.sales_order || '',
    }));
    if (invalidDates.length > 0) {
      console.warn('Invalid order_date values detected:', invalidDates);
    }

    console.log('Filtered orders (first 5):', filteredOrders.slice(0, 5).map(o => ({
      id: o.id,
      order_date: o.order_date,
      sales_order: o.sales_order || '',
    })));
    console.log('Sorted orders (first 5):', sortedOrders.slice(0, 5).map(o => ({
      id: o.id,
      order_date: o.order_date,
      sales_order: o.sales_order || '',
    })));
    console.log('Filtered and sorted orders summary:', {
      filteredLength: filteredOrders.length,
      sortedLength: sortedOrders.length,
      deletedOrders: sortedOrders.filter(o => o.is_deleted).length,
      activeOrders: sortedOrders.filter(o => !o.is_deleted).length,
    });
  }, [filteredOrders, sortedOrders]);

  // Group orders by sales_order while preserving sort order
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
      const found = allSerials.filter((serial, index, arr) => serial && arr.indexOf(serial) !== index);
      found.forEach(serial => duplicates.add(serial));
    });
    return duplicates;
  }, [ordersBySalesOrder]);

  useEffect(() => {
    setCurrentOrdersPage(1);
  }, [
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedProduct,
    selectedStatus,
    selectedOrderType,
    selectedSdCardSize,
    fromDate,
    showDeleted,
    searchQuery,
    rowsPerPage,
  ]);

  const paginatedOrders = useMemo(() => {
    return ordersWithCounts.slice(
      (currentOrdersPage - 1) * rowsPerPage,
      currentOrdersPage * rowsPerPage
    );
  }, [ordersWithCounts, currentOrdersPage, rowsPerPage]);

  useEffect(() => {
    console.log('Paginated orders (first 5):', paginatedOrders.slice(0, 5).map(o => ({
      id: o.id,
      order_date: o.order_date,
      sales_order: o.sales_order || '',
      orderCount: o.orderCount,
    })));
    console.log('Pagination info:', {
      currentOrdersPage,
      rowsPerPage,
      sortedOrdersLength: ordersWithCounts.length,
      totalOrdersPages: Math.ceil(ordersWithCounts.length / rowsPerPage),
    });
  }, [paginatedOrders, currentOrdersPage, rowsPerPage, ordersWithCounts]);

  const totalOrdersPages = Math.ceil(ordersWithCounts.length / rowsPerPage);

  // Pagination logic for dynamic page range
  const siblingCount = 2;
  const pageRange = [];
  for (let i = Math.max(1, currentOrdersPage - siblingCount); i <= Math.min(totalOrdersPages, currentOrdersPage + siblingCount); i++) {
    pageRange.push(i);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalOrdersPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalOrdersPages) pageRange.push(totalOrdersPages);

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

      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
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

      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
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

  const clearFilters = () => {
    setSelectedWarehouse([]);
    setSelectedAssetType([]);
    setSelectedModel([]);
    setSelectedConfiguration([]);
    setSelectedOrderType([]);
    setSelectedProduct([]);
    setSelectedStatus([]);
    setSelectedSdCardSize([]);
    setFromDate(undefined);
    setSearchQuery('');
    setCurrentOrdersPage(1);
    setShowDeleted(false);
  };

  // Define column widths to ensure header and body alignment
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
    return <div style={{ fontSize: '12px', padding: '8px' }}>Loading orders...</div>;
  }

  return (
    <Card style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px', minHeight: '200px' }}>
      <CardHeader style={{ paddingBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '12px' }}>
            <Calendar style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Order Filters
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
                  placeholder="       Search by Sales Order, Deal ID, School, Nucleus ID, Profile ID, or Serial Number"
                  style={{ paddingLeft: '28px', fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px' }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', height: '28px' }}
              onClick={() => downloadCSV(ordersWithCounts, 'orders_export.csv')}
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
              id="configurationFilter"
              label="Configuration"
              options={uniqueValues.configurations}
              value={selectedConfiguration}
              onChange={setSelectedConfiguration}
              placeholder="Select Configurations"
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
                style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px' }}
              />
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={{ fontSize: '12px', padding: '8px' }}>No orders available. Create an order or check your database.</div>
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
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sales_order }}>Sales Order</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.order_type }}>Order Type</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.warehouse }}>Warehouse</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.deal_id }}>Deal ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.nucleus_id }}>Nucleus ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.school_name }}>School Name</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.asset_type }}>Asset Type</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.model }}>Model</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.configuration }}>Configuration</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.quantity }}>Quantity</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.sd_card_size }}>SD Card Size</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.profile_id }}>Profile ID</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.product }}>Product</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.status }}>Status</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.order_date }}>Order Date</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.updated_by }}>Updated By</TableHead>
                    <TableHead style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 20, width: columnWidths.actions }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} style={{ textAlign: 'center', fontSize: '12px', padding: '8px' }}>
                        No orders found with current filters. Try adjusting the filters or check loadOrders.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sales_order }}>{order.sales_order || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_type }}>{order.order_type || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.warehouse }}>{order.warehouse || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.deal_id }}>{order.deal_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.nucleus_id }}>{order.nucleus_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.school_name }}>{order.school_name || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.asset_type }}>{order.asset_type || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.model }}>{order.model || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.configuration }}>{order.configuration || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.quantity }}>{order.quantity || 0}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.sd_card_size }}>{order.sd_card_size || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.profile_id }}>{order.profile_id || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.product }}>{order.product || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.status }}>
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
                        </TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.order_date }}>{formatDate(order.order_date) || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.updated_by }}>{order.updated_by || ''}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #d1d5db', width: columnWidths.actions }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingOrder(order);
                                setShowViewDialog(true);
                              }}
                              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', height: '28px' }}
                            >
                              <Eye style={{ width: '12px', height: '12px' }} />
                            </Button>
                            {!order.is_deleted && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setShowEditDialog(true);
                                  }}
                                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', height: '28px' }}
                                >
                                  <Edit style={{ width: '12px', height: '12px' }} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => softDeleteOrder(order.id)}
                                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', height: '28px' }}
                                >
                                  <Trash2 style={{ width: '12px', height: '12px' }} />
                                </Button>
                              </>
                            )}
                            {order.is_deleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreOrder(order.id)}
                                style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', height: '28px' }}
                              >
                                <RotateCcw style={{ width: '12px', height: '12px' }} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
              <div>
                <span>Showing {((currentOrdersPage - 1) * rowsPerPage) + 1} to {Math.min(currentOrdersPage * rowsPerPage, ordersWithCounts.length)} of {ordersWithCounts.length} orders</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentOrdersPage(1);
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
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentOrdersPage === 1 ? 0.5 : 1 }}
                  disabled={currentOrdersPage === 1}
                  onClick={() => setCurrentOrdersPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                {pageRange.map((page, index) => (
                  <Button
                    key={index}
                    variant={currentOrdersPage === page ? 'default' : 'outline'}
                    size="sm"
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      background: currentOrdersPage === page ? '#3b82f6' : '#fff',
                      color: currentOrdersPage === page ? '#fff' : '#000',
                      cursor: typeof page === 'number' ? 'pointer' : 'default',
                      fontSize: '12px',
                      opacity: typeof page === 'number' ? 1 : 0.5,
                    }}
                    disabled={typeof page !== 'number'}
                    onClick={() => typeof page === 'number' && setCurrentOrdersPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', opacity: currentOrdersPage === totalOrdersPages ? 0.5 : 1 }}
                  disabled={currentOrdersPage === totalOrdersPages}
                  onClick={() => setCurrentOrdersPage((prev) => Math.min(prev + 1, totalOrdersPages))}
                >
                  Next
                </Button>
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
                    <p><strong>Deleted:</strong> {viewingOrder.is_deleted ? 'Yes' : 'No'}</p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusDialog(false)}
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

export default OrdersTable;