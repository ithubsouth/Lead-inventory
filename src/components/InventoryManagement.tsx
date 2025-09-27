import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, BarChart3, Archive } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CreateOrderForm from './CreateOrderForm';
import OrdersTable from './OrdersTable';
import DevicesTable from './DevicesTable';
import OrderSummaryTable from './OrderSummaryTable';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Order, Device, OrderSummary, TabletItem, TVItem } from './types';
import { UserProfile } from '@/components/UserProfile';

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<{ itemId: string; index: number; type: 'tablet' | 'tv' } | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<string>('All');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('All');
  const [selectedAssetGroup, setSelectedAssetGroup] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderType, setOrderType] = useState('');
  const [salesOrder, setSalesOrder] = useState('');
  const [dealId, setDealId] = useState('');
  const [nucleusId, setNucleusId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [tablets, setTablets] = useState<TabletItem[]>([]);
  const [tvs, setTvs] = useState<TVItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
    loadDevices();
    loadOrderSummary();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let allOrders: any[] = [];
      const batchSize = 1000;
      let page = 0;
      let hasMoreOrders = true;

      while (hasMoreOrders) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) throw error;
        allOrders = [...allOrders, ...data];
        hasMoreOrders = data.length === batchSize;
        page += 1;
      }

      let allDevices: any[] = [];
      page = 0;
      let hasMoreDevices = true;

      while (hasMoreDevices) {
        const { data, error } = await supabase
          .from('devices')
          .select('order_id, serial_number')
          .range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) throw error;
        allDevices = [...allDevices, ...data];
        hasMoreDevices = data.length === batchSize;
        page += 1;
      }

      const devicesByOrderId = new Map<string, string[]>();
      allDevices.forEach((device: { order_id: string; serial_number: string }) => {
        if (device.order_id && device.serial_number) {
          const normalizedSerial = device.serial_number.trim().toUpperCase();
          if (!devicesByOrderId.has(device.order_id)) {
            devicesByOrderId.set(device.order_id, []);
          }
          devicesByOrderId.get(device.order_id)!.push(normalizedSerial);
        }
      });

      const orderGroups = new Map<string, Order[]>();
      allOrders.forEach((order: any) => {
        const salesOrder = order.sales_order || '';
        const groupKey = `${salesOrder}-${order.asset_type}-${order.model}-${order.warehouse}`;
        if (!orderGroups.has(groupKey)) {
          orderGroups.set(groupKey, []);
        }
        orderGroups.get(groupKey)!.push({
          ...order,
          material_type: order.material_type as 'Inward' | 'Outward',
          asset_type: order.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive',
          serial_numbers: (order.serial_numbers || []).map((sn: string) => sn.trim().toUpperCase()),
        });
      });

      const ordersWithStatus = allOrders.map((order: any) => {
        const salesOrder = order.sales_order || '';
        const groupKey = `${salesOrder}-${order.asset_type}-${order.model}-${order.warehouse}`;
        const groupOrders = orderGroups.get(groupKey) || [];
        const orderSerials = (order.serial_numbers || []).map((sn: string) => sn.trim().toUpperCase()).filter((sn: string) => sn);
        const orderDeviceCount = devicesByOrderId.get(order.id)?.length || 0;

        const orderSerialSet = new Set<string>();
        const duplicateSerialsInOrder = new Set<string>();
        orderSerials.forEach((serial: string) => {
          if (orderSerialSet.has(serial)) {
            duplicateSerialsInOrder.add(serial);
          } else {
            orderSerialSet.add(serial);
          }
        });

        let status: 'Success' | 'Failed' | 'Pending' = 'Pending';
        let statusDetails = '';

        if (orderSerials.length === 0) {
          status = 'Pending';
          statusDetails = 'No serial numbers provided';
        } else if (duplicateSerialsInOrder.size > 0) {
          status = 'Failed';
          statusDetails = `Duplicate serial numbers found within this order: ${[...duplicateSerialsInOrder].join(', ')}`;
        } else if (orderSerials.length !== order.quantity) {
          const missingCount = order.quantity - orderSerials.length;
          const missingPositions = Array.from({ length: order.quantity }, (_, i) => i)
            .filter(i => !orderSerials[i])
            .map(p => p + 1);
          status = 'Failed';
          statusDetails = `Missing ${missingCount} serial number${missingCount > 1 ? 's' : ''} at position${missingCount > 1 ? 's' : ''} ${missingPositions.join(', ')} (Expected ${order.quantity}, got ${orderSerials.length})`;
        } else if (orderDeviceCount !== order.quantity) {
          status = 'Failed';
          statusDetails = `Device count mismatch: Expected ${order.quantity}, got ${orderDeviceCount}`;
        } else {
          const deviceSerials = devicesByOrderId.get(order.id) || [];
          const mismatchedSerials = orderSerials.filter(sn => !deviceSerials.includes(sn));
          if (mismatchedSerials.length > 0) {
            status = 'Failed';
            statusDetails = `Mismatched serial numbers: ${mismatchedSerials.join(', ')} not found in devices`;
          } else {
            status = 'Success';
            statusDetails = `All ${order.quantity} serial numbers present and valid`;
          }
        }

        return {
          ...order,
          material_type: order.material_type as 'Inward' | 'Outward',
          asset_type: order.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive',
          serial_numbers: order.serial_numbers || [],
          status,
          statusDetails,
        } as Order & { statusDetails: string };
      });

      ordersWithStatus.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      setOrders(ordersWithStatus);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({ title: 'Error', description: 'Failed to load orders. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      let allDevices: any[] = [];
      const batchSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('devices')
          .select(`
            id,
            sales_order,
            order_type,
            warehouse,
            deal_id,
            nucleus_id,
            school_name,
            asset_type,
            model,
            configuration,
            serial_number,
            sd_card_size,
            profile_id,
            product,
            asset_status,
            asset_group,
            updated_at,
            updated_by,
            is_deleted,
            order_id,
            orders!left(material_type)
          `)
          .order('updated_at', { ascending: false })
          .range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) throw error;
        allDevices = [...allDevices, ...data];
        hasMore = data.length === batchSize;
        page += 1;
      }

      console.log('Fetched devices (first 5):', allDevices.slice(0, 5).map(d => ({
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
        updated_at: d.updated_at || '',
        updated_by: d.updated_by || '',
        is_deleted: d.is_deleted,
        order_id: d.order_id || '',
        material_type: d.orders?.material_type || '',
      })));

      const updatedDevices = allDevices.map((device: any) => ({
        id: device.id,
        sales_order: device.sales_order,
        order_type: device.order_type,
        warehouse: device.warehouse,
        deal_id: device.deal_id,
        nucleus_id: device.nucleus_id,
        school_name: device.school_name,
        asset_type: device.asset_type,
        model: device.model,
        configuration: device.configuration,
        serial_number: device.serial_number,
        sd_card_size: device.sd_card_size,
        profile_id: device.profile_id,
        product: device.product,
        asset_status: device.asset_status,
        asset_group: device.asset_group,
        status: device.order_id && device.orders?.material_type === 'Outward' ? 'Assigned' : 'Stock',
        updated_at: device.updated_at,
        updated_by: device.updated_by,
        is_deleted: device.is_deleted,
      })) as Device[];

      console.log('Processed devices count:', updatedDevices.length);
      console.log('Status summary:', {
        stock: updatedDevices.filter(d => d.status === 'Stock').length,
        assigned: updatedDevices.filter(d => d.status === 'Assigned').length,
      });
      setDevices(updatedDevices);
      if (updatedDevices.length === 0) {
        toast({ title: 'Warning', description: 'No devices loaded from database. Please check your data source or filters.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({ title: 'Error', description: 'Failed to load devices. Please check your database connection or schema.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderSummary = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('warehouse, asset_type, model, material_type, quantity')
        .eq('is_deleted', false);
      if (ordersError) throw ordersError;

      const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
      const assetTypeOptions = ['Tablet', 'TV', 'SD Card', 'Pendrive'];
      const tabletModels = ['Lenovo TB301XU', 'Lenovo TB301FU', 'Lenovo TB-8505F', 'Lenovo TB-7306F', 'Lenovo TB-7306X', 'Lenovo TB-7305X', 'IRA T811'];
      const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];

      const summaryMap = new Map<string, OrderSummary>();
      locations.forEach(warehouse => {
        assetTypeOptions.forEach(asset_type => {
          const models = asset_type === 'Tablet' ? tabletModels : tvModels;
          models.forEach(model => {
            const key = `${warehouse}-${asset_type}-${model}`;
            if (!summaryMap.has(key)) {
              summaryMap.set(key, { 
                warehouse, 
                asset_type: asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive', 
                model, 
                inward: 0, 
                outward: 0, 
                stock: 0 
              });
            }
          });
        });
      });

      ordersData?.forEach((order: any) => {
        const key = `${order.warehouse}-${order.asset_type}-${order.model}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, { 
            warehouse: order.warehouse, 
            asset_type: order.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive', 
            model: order.model, 
            inward: 0, 
            outward: 0, 
            stock: 0 
          });
        }
        const summary = summaryMap.get(key)!;
        if (order.material_type === 'Inward') summary.inward += order.quantity;
        else if (order.material_type === 'Outward') summary.outward += order.quantity;
        summary.stock = summary.inward - summary.outward;
      });

      setOrderSummary(Array.from(summaryMap.values()));
    } catch (error) {
      console.error('Error loading order summary:', error);
      toast({ title: 'Error', description: 'Failed to load order summary. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = (scannedValue: string) => {
    if (currentSerialIndex) {
      const { itemId, index, type } = currentSerialIndex;
      if (type === 'tablet') {
        setTablets(prev =>
          prev.map(tablet => {
            if (tablet.id === itemId) {
              const newSerialNumbers = [...tablet.serialNumbers];
              newSerialNumbers[index] = scannedValue.trim();
              return { ...tablet, serialNumbers: newSerialNumbers };
            }
            return tablet;
          })
        );
      } else {
        setTvs(prev =>
          prev.map(tv => {
            if (tv.id === itemId) {
              const newSerialNumbers = [...tv.serialNumbers];
              newSerialNumbers[index] = scannedValue.trim();
              return { ...tv, serialNumbers: newSerialNumbers };
            }
            return tv;
          })
        );
      }
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <div className='sticky top-0 z-20 bg-background border-b border-gray-200'>
        <div className='container mx-auto p-4 flex justify-between items-center'>
          <div className='flex items-center space-x-4'>
            <img src='/logo.png' alt='Logo' className='h-11 w-auto' />
            <h1 className='text-2xl font-bold'>Inventory Management</h1>
          </div>
          <div className='flex items-center space-x-4'>
            <UserProfile />
          </div>
        </div>
      </div>
      <div className='flex-1 container mx-auto p-4 pt-16'>
        <Tabs defaultValue='create' className='w-full'>
          <TabsList className='grid w-full grid-cols-4 fixed top-14 left-0 right-0 bg-background z-20 border-b border-gray-200'>
            <TabsTrigger value='create'>
              <Package className='w-3 h-3 mr-1' />
              Create Order
            </TabsTrigger>
            <TabsTrigger value='view'>
              <Archive className='w-3 h-3 mr-1' />
              View Orders
            </TabsTrigger>
            <TabsTrigger value='order'>
              <BarChart3 className='w-3 h-3 mr-1' />
              Order Summary
            </TabsTrigger>
            <TabsTrigger value='devices'>
              <Archive className='w-3 h-3 mr-1' />
              Devices
            </TabsTrigger>
          </TabsList>
          <TabsContent value='create' className='space-y-4'>
            <CreateOrderForm
              orderType={orderType}
              setOrderType={setOrderType}
              salesOrder={salesOrder}
              setSalesOrder={setSalesOrder}
              dealId={dealId}
              setDealId={setDealId}
              nucleusId={nucleusId}
              setNucleusId={setNucleusId}
              schoolName={schoolName}
              setSchoolName={setSchoolName}
              tablets={tablets}
              setTablets={setTablets}
              tvs={tvs}
              setTvs={setTvs}
              loading={loading}
              setLoading={setLoading}
              loadOrders={loadOrders}
              loadDevices={loadDevices}
              loadOrderSummary={loadOrderSummary}
              openScanner={(itemId, index, type) => {
                setCurrentSerialIndex({ itemId, index, type });
                setShowScanner(true);
              }}
            />
          </TabsContent>
          <TabsContent value='view' className='space-y-4'>
            <OrdersTable
              orders={orders}
              setOrders={setOrders}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
              selectedAssetType={selectedAssetType}
              setSelectedAssetType={setSelectedAssetType}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedConfiguration={selectedConfiguration}
              setSelectedConfiguration={setSelectedConfiguration}
              selectedOrderType={selectedOrderType}
              setSelectedOrderType={setSelectedOrderType}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              loading={loading}
              setLoading={setLoading}
              loadOrders={loadOrders}
              loadDevices={loadDevices}
              loadOrderSummary={loadOrderSummary}
            />
          </TabsContent>
          <TabsContent value='order' className='space-y-4'>
            <OrderSummaryTable
              orderSummary={orderSummary}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
              selectedAssetType={selectedAssetType}
              setSelectedAssetType={setSelectedAssetType}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
              showDeleted={showDeleted}
              setShowDeleted={setShowDeleted}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>
          <TabsContent value='devices' className='space-y-4'>
            <DevicesTable
              devices={devices}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
              selectedAssetType={selectedAssetType}
              setSelectedAssetType={setSelectedAssetType}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedAssetStatus={selectedAssetStatus}
              setSelectedAssetStatus={setSelectedAssetStatus}
              selectedConfiguration={selectedConfiguration}
              setSelectedConfiguration={setSelectedConfiguration}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              selectedOrderType={selectedOrderType}
              setSelectedOrderType={setSelectedOrderType}
              selectedAssetGroup={selectedAssetGroup}
              setSelectedAssetGroup={setSelectedAssetGroup}
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
              showDeleted={showDeleted}
              setShowDeleted={setShowDeleted}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>
        </Tabs>
        <EnhancedBarcodeScanner
          isOpen={showScanner}
          onClose={() => {
            setShowScanner(false);
            setCurrentSerialIndex(null);
          }}
          onScan={handleScanResult}
        />
      </div>
      <footer className='w-full bg-gray-100 text-gray-600 text-left py-1 fixed bottom-0 left-2 z-10'>
        Crafted by 😊 IT Infra minds, for IT Infra needs
      </footer>
    </div>
  );
};

export default InventoryManagement;