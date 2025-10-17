import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, BarChart3, Archive } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import UnifiedAssetForm from './UnifiedAssetForm';
import OrdersTable from './OrdersTable';
import DevicesTable from './DevicesTable';
import OrderSummaryTable from './OrderSummaryTable';
import AuditTable from './AuditTable';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Order, Device, OrderSummary, TabletItem, TVItem } from './types';
import { UserProfile } from '@/components/UserProfile';
import { DateRange } from 'react-day-picker';

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUserEmail(user?.email || null);
        if (!user?.email) {
          console.warn('No user email found.');
          toast({ title: 'Warning', description: 'No authenticated user found. Updates may fail.', variant: 'destructive' });
          return;
        }

        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();
        if (roleError) throw roleError;
        setUserRole(userData?.role || null);
        if (!userData?.role) {
          console.warn('No role found for user.');
          toast({ title: 'Warning', description: 'No role assigned to user. Updates may fail.', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({ title: 'Error', description: 'Failed to fetch user information.', variant: 'destructive' });
      }
    };
    fetchUser();
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
          .eq('is_deleted', false)
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
          is_deleted: order.is_deleted || false,
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
          is_deleted: order.is_deleted || false,
        } as Order & { statusDetails: string };
      });

      ordersWithStatus.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      setOrders(ordersWithStatus);
      console.log('Loaded orders with is_deleted:', ordersWithStatus.map(o => ({ id: o.id, sales_order: o.sales_order, is_deleted: o.is_deleted })));
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
            asset_condition,
            created_at,
            updated_at,
            updated_by,
            is_deleted,
            order_id,
            orders!left(id, material_type),
            asset_check
          `)
          .order('updated_at', { ascending: false })
          .range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) {
          console.error(`Supabase fetch error (page ${page}):`, error);
          throw error;
        }
        console.log(`Fetched devices batch ${page}:`, data.length);
        allDevices = [...allDevices, ...data];
        hasMore = data.length === batchSize;
        page += 1;
      }

      if (allDevices.length === 0) {
        console.warn('No devices retrieved from Supabase.');
        toast({
          title: 'Warning',
          description: 'No devices found in the database. Check your data or permissions.',
          variant: 'destructive',
        });
      }

      const updatedDevices = allDevices.map((device: any) => {
        const materialType = device.orders?.material_type || null;
        const status = device.order_id && materialType === 'Outward' ? 'Assigned' : 'Stock';
        return {
          id: device.id,
          sales_order: device.sales_order?.trim() || '',
          order_type: device.order_type?.trim() || '',
          warehouse: device.warehouse?.trim() || '',
          deal_id: device.deal_id?.trim() || '',
          nucleus_id: device.nucleus_id?.trim() || '',
          school_name: device.school_name?.trim() || '',
          asset_type: device.asset_type?.trim() || '',
          model: device.model?.trim() || '',
          configuration: device.configuration?.trim() || '',
          serial_number: device.serial_number?.trim() || '',
          sd_card_size: device.sd_card_size?.trim() || '',
          profile_id: device.profile_id?.trim() || '',
          product: device.product?.trim() || '',
          asset_status: device.asset_status?.trim() || '',
          asset_group: device.asset_group?.trim() || '',
          asset_condition: device.asset_condition?.trim() || '',
          status,
          created_at: device.created_at || '',
          updated_at: device.updated_at ? new Date(device.updated_at).toISOString() : '',
          updated_by: device.updated_by?.trim() || '',
          is_deleted: device.is_deleted || false,
          order_id: device.order_id || null,
          material_type: materialType,
          asset_check: device.asset_check?.trim() || 'Unmatched',
        } as Device;
      });

      console.log('Processed devices:', updatedDevices.length);
      console.log('Devices with sales_order 905643:', updatedDevices.filter(d => d.sales_order === '905643'));
      console.log('Sample devices status breakdown:', {
        total: updatedDevices.length,
        stock: updatedDevices.filter(d => d.status === 'Stock').length,
        assigned: updatedDevices.filter(d => d.status === 'Assigned').length,
        sampleStock: updatedDevices.filter(d => d.status === 'Stock').slice(0, 3).map(d => ({ id: d.id, order_id: d.order_id, material_type: d.material_type })),
        sampleAssigned: updatedDevices.filter(d => d.status === 'Assigned').slice(0, 3).map(d => ({ id: d.id, order_id: d.order_id, material_type: d.material_type })),
      });
      setDevices(updatedDevices);

      if (updatedDevices.length === 0) {
        toast({
          title: 'Warning',
          description: 'No devices loaded after processing. Check filters or database schema.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast({
        title: 'Error',
        description: `Failed to load devices: ${error.message || 'Unknown error'}. Check database connection or permissions.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderSummary = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('warehouse, asset_type, model, material_type, quantity, sd_card_size')
        .eq('is_deleted', false);
      if (ordersError) throw ordersError;

      const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
      const assetTypeOptions = ['Tablet', 'TV', 'SD Card', 'Pendrive'];
      const tabletModels = ['Lenovo TB301XU', 'Lenovo TB301FU', 'Lenovo TB-8505F', 'Lenovo TB-7306F', 'Lenovo TB-7306X', 'Lenovo TB-7305X', 'IRA T811'];
      const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];
      const sdCardSizes = ['64 GB', '128 GB', '256 GB', '512 GB'];

      const summaryMap = new Map<string, OrderSummary>();
      locations.forEach(warehouse => {
        assetTypeOptions.forEach(asset_type => {
          let models: string[] = [];
          if (asset_type === 'Tablet') models = tabletModels;
          else if (asset_type === 'TV') models = tvModels;
          else if (asset_type === 'SD Card') models = sdCardSizes;
          else if (asset_type === 'Pendrive') models = ['Pendrive'];
          
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

        if (order.asset_type === 'Tablet' && order.sd_card_size) {
          const sdKey = `${order.warehouse}-SD Card-${order.sd_card_size}`;
          if (!summaryMap.has(sdKey)) {
            summaryMap.set(sdKey, {
              warehouse: order.warehouse,
              asset_type: 'SD Card',
              model: order.sd_card_size,
              inward: 0,
              outward: 0,
              stock: 0
            });
          }
          const sdSummary = summaryMap.get(sdKey)!;
          if (order.material_type === 'Inward') sdSummary.inward += order.quantity;
          else if (order.material_type === 'Outward') sdSummary.outward += order.quantity;
          sdSummary.stock = sdSummary.inward - sdSummary.outward;
        }
      });

      const summaries = Array.from(summaryMap.values()).sort((a, b) => 
        a.warehouse.localeCompare(b.warehouse) ||
        a.asset_type.localeCompare(b.asset_type) ||
        a.model.localeCompare(b.model)
      );
      setOrderSummary(summaries);
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

  const handleUpdateAssetCheck = async (deviceId: string, checkStatus: string) => {
    try {
      if (!userEmail) {
        throw new Error('No authenticated user found. Please log in.');
      }
      if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
        throw new Error('Insufficient permissions to update asset check. Super Admin, Admin, or Operator role required.');
      }
      const validStatus = checkStatus === 'Matched' || checkStatus === 'Unmatched' ? checkStatus : 'Unmatched';
      if (!['Matched', 'Unmatched'].includes(validStatus)) {
        throw new Error(`Invalid check status: ${checkStatus}`);
      }

      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === deviceId
            ? { ...device, asset_check: validStatus, updated_at: new Date().toISOString(), updated_by: userEmail }
            : device
        )
      );

      const updates = { 
        asset_check: validStatus,
        updated_at: new Date().toISOString(),
        updated_by: userEmail,
      };

      const { data, error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', deviceId)
        .select();

      if (error) {
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.id === deviceId ? { ...device, asset_check: device.asset_check || 'Unmatched' } : device
          )
        );
        console.error('Supabase update error:', error);
        if (error.code === '42501') {
          throw new Error('Permission denied: You do not have sufficient privileges to update this device.');
        }
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`Successfully updated device ${deviceId}:`, data);
        toast({ 
          title: 'Success', 
          description: `Asset check set to ${validStatus} for device ${deviceId}.`,
        });
      } else {
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.id === deviceId ? { ...device, asset_check: device.asset_check || 'Unmatched' } : device
          )
        );
        console.warn(`No device found with ID ${deviceId}`);
        toast({ 
          title: 'Warning', 
          description: `No device found with ID ${deviceId}.`, 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Error updating asset check:', error);
      const errorMessage = error.message?.includes('Failed to fetch')
        ? 'Network error: Failed to connect to Supabase. Check CORS or network settings.'
        : error.message || 'Unknown error';
      toast({ 
        title: 'Error', 
        description: `Failed to set asset check to ${checkStatus}: ${errorMessage}`, 
        variant: 'destructive' 
      });
    }
  };

  const updateBatch = async (batchIds: string[], maxRetries = 3): Promise<{ updatedIds: string[]; error?: any }> => {
    if (!userEmail) {
      throw new Error('No authenticated user found. Please log in.');
    }
    if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
      throw new Error('Insufficient permissions to update devices. Super Admin, Admin, or Operator role required.');
    }
    const updates = {
      asset_check: 'Unmatched',
      updated_at: new Date().toISOString(),
      updated_by: userEmail,
    };

    for (let retry = 1; retry <= maxRetries; retry++) {
      try {
        console.log(`Batch update attempt ${retry}/${maxRetries} for IDs:`, batchIds);
        const { data, error } = await supabase
          .from('devices')
          .update(updates)
          .in('id', batchIds)
          .select('id');

        if (error) {
          console.error(`Batch update error (try ${retry}):`, error);
          if (retry === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        console.log(`Batch update success (try ${retry}):`, data);
        return { updatedIds: data?.map((row: any) => row.id) || [] };
      } catch (err: any) {
        console.error(`Batch update fetch error (try ${retry}):`, err);
        if (retry === maxRetries || !err.message?.includes('Failed to fetch')) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return { updatedIds: [], error: new Error('Max retries exceeded') };
  };

  const handleClearAllChecks = async (ids: string[]) => {
    try {
      setIsClearing(true);
      if (!userEmail) {
        throw new Error('No authenticated user found. Please log in.');
      }
      if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
        throw new Error('Insufficient permissions to unmatch devices. Super Admin, Admin, or Operator role required.');
      }
      if (ids.length === 0) {
        console.warn('No device IDs provided for clearing checks.');
        toast({
          title: 'Info',
          description: 'No devices selected to unmatch. Adjust filters or select devices.',
          variant: 'default',
        });
        return;
      }

      console.log('Testing Supabase connectivity before batch update...');
      const { error: testError } = await supabase.from('devices').select('id').limit(1);
      if (testError) {
        console.error('Connectivity test failed:', testError);
        throw new Error(`Supabase connection failed: ${testError.message}. Check CORS/network.`);
      }
      console.log('Connectivity test passed.');

      console.log('Starting unmatch for device IDs:', ids);

      if (ids.length === 1) {
        await handleUpdateAssetCheck(ids[0], 'Unmatched');
      } else {
        const BATCH_SIZE = 50;
        const allUpdatedIds: string[] = [];
        const errors: any[] = [];

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batchIds = ids.slice(i, i + BATCH_SIZE);
          const result = await updateBatch(batchIds);
          if (result.error) {
            errors.push(result.error);
          } else {
            allUpdatedIds.push(...result.updatedIds);
          }
        }

        if (allUpdatedIds.length > 0) {
          setDevices(prevDevices => {
            const updatedDevices = prevDevices.map(device =>
              allUpdatedIds.includes(device.id)
                ? { ...device, asset_check: 'Unmatched', updated_at: new Date().toISOString(), updated_by: userEmail }
                : device
            );
            console.log('Updated devices state after batch unmatch:', updatedDevices);
            return updatedDevices;
          });

          toast({
            title: 'Success',
            description: `Unmatched ${allUpdatedIds.length} device${allUpdatedIds.length !== 1 ? 's' : ''}.`,
          });
        }

        if (errors.length > 0) {
          console.warn('Some batches failed:', errors);
          toast({
            title: 'Partial Success',
            description: `Unmatched ${allUpdatedIds.length} devices, but ${errors.length} batches failed. Check console.`,
            variant: 'default',
          });
        }

        if (allUpdatedIds.length === 0) {
          console.warn('No devices unmatched during batch operation.');
          toast({
            title: 'Warning',
            description: 'No devices were unmatched. Check filters or permissions.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error in handleClearAllChecks:', error);
      const message = error.message?.includes('Failed to fetch') 
        ? 'Network error (CORS/fetch failed). Check browser console/Network tab and Supabase CORS settings.' 
        : error.message || 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to unmatch devices: ${message} Please try again or contact support.`,
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className='min-h-screen max-h-screen overflow-hidden bg-gradient-to-br from-background to-secondary/20 flex flex-col'>
      <div className='w-full bg-card/80 backdrop-blur-sm border-b border-border/50 fixed top-0 left-0 right-0 z-50 shadow-sm'>
        <div className='container mx-auto px-4 py-3 flex justify-between items-center'>
          <div className='flex items-center space-x-4'>
            <img src='/logo.png' alt='Logo' className='h-11 w-auto' />
            <h1 className='text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'>Lead Inventory Management</h1>
          </div>
          <div className='flex items-center space-x-4'>
            <UserProfile />
          </div>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto pt-[70px]'>
        <div className='container mx-auto px-4 py-6 h-full'>
          <Tabs defaultValue='create' className='w-full h-full flex flex-col'>
            <TabsList className='grid w-full grid-cols-5 mb-6 bg-card/50 backdrop-blur-sm border border-border/50 flex-shrink-0'>
              <TabsTrigger value='create' className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                <Package className='w-4 h-4' />
                Create Order
              </TabsTrigger>
              <TabsTrigger value='view' className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                <Archive className='w-4 h-4' />
                View Orders
              </TabsTrigger>
              <TabsTrigger value='order' className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                <BarChart3 className='w-4 h-4' />
                Order Summary
              </TabsTrigger>
              <TabsTrigger value='devices' className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                <Archive className='w-4 h-4' />
                Devices
              </TabsTrigger>
              <TabsTrigger value='audit' className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                <Archive className='w-4 h-4' />
                Audit View
              </TabsTrigger>
            </TabsList>
            <TabsContent value='create' className='space-y-6 flex-1 overflow-y-auto'>
              <UnifiedAssetForm
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
                loading={loading}
                setLoading={setLoading}
                loadOrders={loadOrders}
                loadDevices={loadDevices}
                loadOrderSummary={loadOrderSummary}
                openScanner={(itemId, index, assetType) => {
                  setCurrentSerialIndex({ itemId, index, type: assetType as 'tablet' | 'tv' });
                  setShowScanner(true);
                }}
              />
            </TabsContent>
            <TabsContent value='view' className='flex-1 overflow-y-auto'>
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
                fromDate={fromDate}
                setFromDate={setFromDate}
                toDate={toDate}
                setToDate={setToDate}
                showDeleted={showDeleted}
                setShowDeleted={setShowDeleted}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                loading={loading}
                setLoading={setLoading}
                loadOrders={loadOrders}
                loadDevices={loadDevices}
                loadOrderSummary={loadOrderSummary}
              />
            </TabsContent>
            <TabsContent value='order' className='flex-1 overflow-y-auto'>
              <OrderSummaryTable
                devices={devices}
                orderSummary={orderSummary}
                selectedWarehouse={selectedWarehouse}
                setSelectedWarehouse={(value) => {
                  setSelectedWarehouse(value);
                  setSelectedAssetType('All');
                  setSelectedModel('All');
                  setSelectedProduct('All');
                  setSelectedAssetStatus('All');
                  setSelectedAssetGroup('All');
                }}
                selectedAssetType={selectedAssetType}
                setSelectedAssetType={(value) => {
                  setSelectedAssetType(value);
                  setSelectedModel('All');
                }}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                selectedAssetStatus={selectedAssetStatus}
                setSelectedAssetStatus={setSelectedAssetStatus}
                selectedAssetGroup={selectedAssetGroup}
                setSelectedAssetGroup={setSelectedAssetGroup}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
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
            <TabsContent value='devices' className='flex-1 overflow-y-auto'>
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
            <TabsContent value='audit' className='flex-1 overflow-y-auto'>
              <AuditTable
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
                selectedOrderType={selectedOrderType}
                setSelectedOrderType={setSelectedOrderType}
                selectedAssetGroup={selectedAssetGroup}
                setSelectedAssetGroup={setSelectedAssetGroup}
                fromDate={fromDate ? { from: new Date(fromDate), to: undefined } : undefined}
                setFromDate={(range) => setFromDate(range?.from?.toISOString().split('T')[0] || '')}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onUpdateAssetCheck={handleUpdateAssetCheck}
                onClearAllChecks={handleClearAllChecks}
                userRole={userRole || 'unknown'}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <EnhancedBarcodeScanner
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          setCurrentSerialIndex(null);
        }}
        onScan={handleScanResult}
      />
    </div>
  );
};

export default InventoryManagement;