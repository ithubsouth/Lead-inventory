import React, { useState, useEffect, useRef, lazy, Suspense, useDeferredValue } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, BarChart3, Archive, Clock, History, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from './UserProfile';
import { ActiveUsers } from '@/components/ActiveUsers';
import { NotificationBell } from '@/components/NotificationBell';
import { Order, Device, OrderSummary, TabletItem, TVItem } from './types';
import { DateRange } from 'react-day-picker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { readDeviceCache, writeDeviceCache, maxUpdatedAt } from '@/lib/deviceCache';


const UnifiedAssetForm = lazy(() => import('./UnifiedAssetForm'));
const OrdersTable = lazy(() => import('./OrdersTable'));
const DevicesTable = lazy(() => import('./DevicesTable'));
const OrderSummaryTable = lazy(() => import('./OrderSummaryTable'));
const AuditTable = lazy(() => import('./AuditTable'));
const ActivityLogs = lazy(() => import('./ActivityLogs'));
const EnhancedBarcodeScanner = lazy(() => import('./EnhancedBarcodeScanner'));
const VersionHistoryDialog = lazy(() => import('./VersionHistoryDialog'));
import RequestsPanel from './RequestsPanel';

const TabFallback = () => (
  <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>Loading…</div>
);

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({ orders: false, devices: false });
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<{ itemId: string; index: number; type: 'tablet' | 'tv' } | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string[]>([]);
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<string[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedSdCardSize, setSelectedSdCardSize] = useState<string[]>([]);
  const [selectedOrderType, setSelectedOrderType] = useState<string[]>([]);
  const [selectedAgreementType, setSelectedAgreementType] = useState<string[]>([]);
  const [selectedAssetGroup, setSelectedAssetGroup] = useState<string[]>([]);
  const [selectedAssetCondition, setSelectedAssetCondition] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<DateRange | undefined>();
  const [toDate, setToDate] = useState<DateRange | undefined>();
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [orderType, setOrderType] = useState('');
  const [salesOrder, setSalesOrder] = useState('');
  const [dealId, setDealId] = useState('');
  const [nucleusId, setNucleusId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [brand, setBrand] = useState('');
  const [agreementType, setAgreementType] = useState('');
  const [tablets, setTablets] = useState<TabletItem[]>([]);
  const [tvs, setTvs] = useState<TVItem[]>([]);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  // Realtime handlers are registered once, so they read the current tab through a ref.
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  // Latest device list + sync marker, readable from realtime handlers and async loaders.
  const devicesRef = useRef<Device[]>([]);
  const devicesSyncedAtRef = useRef<string | null>(null);
  const forceFullDevicesRef = useRef(false);
  // Local edits update state directly; keep the ref in step so incremental merges start from them.
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  const devicesLoadingRef = useRef<Promise<void> | null>(null);
  const { allowedTabs, loading: profileLoading } = useUserProfile();
  const canSee = (key: string) => allowedTabs.includes(key);

  useEffect(() => {
    if (!userRole || profileLoading || !allowedTabs.length) return;

    const saved = sessionStorage.getItem('inventoryActiveTab');
    const fallback = allowedTabs.includes('create') && userRole !== 'Reporter'
      ? 'create'
      : allowedTabs[0];

    if (saved && allowedTabs.includes(saved) && !(userRole === 'Reporter' && saved === 'create')) {
      setActiveTab(saved);
    } else {
      setActiveTab(fallback);
    }
  }, [userRole, profileLoading, allowedTabs.join(',')]);


  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('inventoryActiveTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab) return;

    const loadDataForTab = async () => {
      try {
        if ((activeTab === 'view' || activeTab === 'create') && !dataLoaded.orders) {
          await loadOrders();
          setDataLoaded(prev => ({ ...prev, orders: true }));
        }

        if ((activeTab === 'devices' || activeTab === 'audit' || activeTab === 'order') && !dataLoaded.devices) {
          await loadDevices();
          setDataLoaded(prev => ({ ...prev, devices: true }));
        }
      } catch (error) {
        console.error(`Error loading data for tab ${activeTab}:`, error);
      }
    };

    loadDataForTab();
  }, [activeTab, userRole]);

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
          .select('role, department')
          .eq('email', user.email)
          .single();
        if (roleError) throw roleError;
        setUserRole(userData?.role || null);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();

    // Bulk imports can fire hundreds of change events in a few seconds. Instead of
    // reloading the whole table on every event, wait for things to settle and then
    // refresh quietly in the background (only if the user is looking at that data).
    const ORDER_TABS = ['view', 'create'];
    const DEVICE_TABS = ['devices', 'audit', 'order'];
    let ordersTimer: ReturnType<typeof setTimeout> | undefined;
    let devicesTimer: ReturnType<typeof setTimeout> | undefined;

    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          clearTimeout(ordersTimer);
          ordersTimer = setTimeout(() => {
            if (ORDER_TABS.includes(activeTabRef.current)) {
              loadOrders({ background: true });
            } else {
              setDataLoaded(prev => ({ ...prev, orders: false }));
            }
            // A device's Stock/Assigned status comes from its order, so refresh devices fully.
            forceFullDevicesRef.current = true;
            if (DEVICE_TABS.includes(activeTabRef.current)) {
              loadDevices({ background: true });
            } else {
              setDataLoaded(prev => ({ ...prev, devices: false }));
            }
          }, 1500);
        }
      )
      .subscribe();

    const devicesChannel = supabase
      .channel('devices-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          clearTimeout(devicesTimer);
          devicesTimer = setTimeout(() => {
            if (DEVICE_TABS.includes(activeTabRef.current)) {
              loadDevices({ background: true });
            } else {
              setDataLoaded(prev => ({ ...prev, devices: false }));
            }
            // Order status depends on device rows too
            if (ORDER_TABS.includes(activeTabRef.current)) {
              loadOrders({ background: true });
            } else {
              setDataLoaded(prev => ({ ...prev, orders: false }));
            }
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(ordersTimer);
      clearTimeout(devicesTimer);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(devicesChannel);
    };
  }, []);

  const loadOrders = async ({ background = false }: { background?: boolean } = {}) => {
    try {
      if (!background) setLoading(true);
      const batchSize = 1000;

      const [{ count: ordersCount }, { count: devicesCount }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('devices').select('*', { count: 'exact', head: true }).eq('is_deleted', false)
      ]);

      const ordersPages = Math.ceil((ordersCount || 0) / batchSize);
      const devicesPages = Math.ceil((devicesCount || 0) / batchSize);

      const [ordersResults, devicesResults] = await Promise.all([
        Promise.all(Array.from({ length: ordersPages }, (_, i) =>
          supabase.from('orders')
            .select('id, order_type, asset_type, model, warehouse, sales_order, deal_id, nucleus_id, school_name, configuration, product, sd_card_size, profile_id, serial_numbers, quantity, order_date, created_at, updated_at, updated_by, is_deleted, material_type')
            .order('created_at', { ascending: false })
            .range(i * batchSize, (i + 1) * batchSize - 1)
        )),
        Promise.all(Array.from({ length: devicesPages }, (_, i) =>
          supabase.from('devices')
            .select('order_id, serial_number')
            .eq('is_deleted', false)
            .range(i * batchSize, (i + 1) * batchSize - 1)
        ))
      ]);

      const allOrders = ordersResults.flatMap(r => r.data || []);
      const allDevicesShort = devicesResults.flatMap(r => r.data || []);

      const devicesByOrderId = new Map<string, Set<string>>();
      const deviceCountByOrderId = new Map<string, number>();

      for (const device of allDevicesShort) {
        const orderId = device.order_id;
        if (!orderId) continue;

        deviceCountByOrderId.set(orderId, (deviceCountByOrderId.get(orderId) || 0) + 1);

        if (device.serial_number) {
          const normalizedSerial = device.serial_number.trim().toUpperCase();
          if (!devicesByOrderId.has(orderId)) {
            devicesByOrderId.set(orderId, new Set());
          }
          devicesByOrderId.get(orderId)!.add(normalizedSerial);
        }
      }

      const ordersWithStatus = allOrders.map((order: any) => {
        const rawSerials = order.serial_numbers || [];
        const orderSerials: string[] = [];
        const orderSerialSet = new Set<string>();
        const duplicateSerialsInOrder = new Set<string>();

        for (const sn of rawSerials) {
          if (sn) {
            const normalized = sn.trim().toUpperCase();
            if (normalized) {
              orderSerials.push(normalized);
              if (orderSerialSet.has(normalized)) {
                duplicateSerialsInOrder.add(normalized);
              } else {
                orderSerialSet.add(normalized);
              }
            }
          }
        }

        const actualDeviceCount = deviceCountByOrderId.get(order.id) || 0;
        let status: 'Success' | 'Failed' | 'Pending' = 'Pending';
        let statusDetails = '';

        if (orderSerials.length === 0) {
          status = 'Pending';
          statusDetails = 'No serial numbers provided';
        } else if (duplicateSerialsInOrder.size > 0) {
          status = 'Failed';
          statusDetails = `Duplicate serial numbers found: ${Array.from(duplicateSerialsInOrder).join(', ')}`;
        } else if (orderSerials.length !== order.quantity) {
          const missingCount = order.quantity - orderSerials.length;
          status = 'Failed';
          statusDetails = `Missing ${missingCount} serial number${missingCount > 1 ? 's' : ''} (Expected ${order.quantity}, got ${orderSerials.length})`;
        } else if (actualDeviceCount !== order.quantity) {
          status = 'Failed';
          statusDetails = `Device count mismatch: Expected ${order.quantity}, got ${actualDeviceCount}`;
        } else {
          const deviceSerialSet = devicesByOrderId.get(order.id);
          let hasMismatch = false;
          const mismatched: string[] = [];

          for (const sn of orderSerials) {
            if (!deviceSerialSet?.has(sn)) {
              hasMismatch = true;
              mismatched.push(sn);
              if (mismatched.length > 3) break;
            }
          }

          if (hasMismatch) {
            status = 'Failed';
            statusDetails = `Mismatched serials: ${mismatched.join(', ')}${mismatched.length > 3 ? '...' : ''}`;
          } else {
            status = 'Success';
            statusDetails = `All ${order.quantity} serial numbers present and valid`;
          }
        }

        return {
          ...order,
          material_type: order.material_type as 'Inward' | 'Outward',
          asset_type: order.asset_type as 'Tablet' | 'TV' | 'SD Card' | 'Pendrive',
          serial_numbers: rawSerials,
          status,
          statusDetails,
          is_deleted: order.is_deleted || false,
        };
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

  const DEVICE_SELECT = `*, orders ( material_type )`;
  const DEVICE_BATCH = 1000;

  const normalizeDevice = (device: any): Device => {
    const orderData = Array.isArray(device.orders) ? device.orders[0] : device.orders;
    const materialType = orderData?.material_type || null;
    const status = device.order_id && materialType === 'Outward' ? 'Assigned' : 'Stock';
    const { orders: _orders, ...rest } = device;
    return {
      ...rest,
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
      updated_by: device.updated_by?.trim() || '',
      audited_by: device.audited_by?.trim() || '',
      material_type: materialType,
      asset_check: device.asset_check?.trim() || 'Unmatched',
    } as Device;
  };

  const sortDevices = (rows: Device[]) =>
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const deviceCacheKey = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ? `devices:v1:${data.session.user.id}` : null;
  };

  const applyDevices = async (rows: Device[], lastUpdatedAt: string | null) => {
    devicesRef.current = rows;
    devicesSyncedAtRef.current = lastUpdatedAt;
    setDevices(rows);
    const key = await deviceCacheKey();
    if (key) writeDeviceCache(key, { rows, lastUpdatedAt, savedAt: Date.now() });
  };

  /** Fetch every device (paged in parallel). */
  const fetchAllDevices = async (): Promise<Device[]> => {
    const { count, error } = await supabase.from('devices').select('id', { count: 'exact', head: true });
    if (error) throw error;
    const numPages = Math.ceil((count || 0) / DEVICE_BATCH);
    const results = await Promise.all(Array.from({ length: numPages }, (_, i) =>
      supabase.from('devices')
        .select(DEVICE_SELECT)
        .order('created_at', { ascending: false })
        .range(i * DEVICE_BATCH, (i + 1) * DEVICE_BATCH - 1)
    ));
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
    return results.flatMap(r => r.data || []).map(normalizeDevice);
  };

  /**
   * Fetch only devices changed since the last sync and merge them in.
   * Returns null when a full reload is needed (e.g. rows were hard-deleted).
   */
  const fetchChangedDevices = async (since: string): Promise<Device[] | null> => {
    const [{ count, error: countErr }, changed] = await Promise.all([
      supabase.from('devices').select('id', { count: 'exact', head: true }),
      (async () => {
        const rows: any[] = [];
        for (let page = 0; ; page++) {
          const { data, error } = await supabase.from('devices')
            .select(DEVICE_SELECT)
            .gte('updated_at', since)
            .order('updated_at', { ascending: true })
            .range(page * DEVICE_BATCH, (page + 1) * DEVICE_BATCH - 1);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < DEVICE_BATCH) break;
          if (rows.length > 20000) return null; // lots changed: a full reload is cheaper
        }
        return rows;
      })(),
    ]);
    if (countErr) throw countErr;
    if (!changed) return null;

    const byId = new Map(devicesRef.current.map(d => [d.id, d]));
    for (const raw of changed) byId.set(raw.id, normalizeDevice(raw));
    if (byId.size !== (count || 0)) return null; // something was deleted/added out of band
    return sortDevices(Array.from(byId.values()));
  };

  const loadDevices = async ({ background = false }: { background?: boolean } = {}) => {
    // Coalesce overlapping calls (tab switch + realtime refresh at the same time).
    if (devicesLoadingRef.current) return devicesLoadingRef.current;
    const run = (async () => {
      let showingData = devicesRef.current.length > 0;
      try {
        // 1. Show the last saved list instantly (first visit in this browser session).
        if (!showingData) {
          const key = await deviceCacheKey();
          const cached = key ? await readDeviceCache<Device>(key) : null;
          if (cached?.rows?.length) {
            devicesRef.current = cached.rows;
            devicesSyncedAtRef.current = cached.lastUpdatedAt;
            setDevices(cached.rows);
            showingData = true;
          }
        }
        if (!showingData && !background) setLoading(true);
        if (showingData) setLoading(false);

        // 2. Bring it up to date: only changed rows when possible, otherwise everything.
        let rows: Device[] | null = null;
        const since = devicesSyncedAtRef.current;
        if (since && showingData && !forceFullDevicesRef.current) {
          rows = await fetchChangedDevices(since);
        }
        if (!rows) {
          rows = await fetchAllDevices();
          forceFullDevicesRef.current = false;
        }
        await applyDevices(rows, maxUpdatedAt(rows) || since);
      } catch (error: any) {
        console.error('Error loading devices:', error);
        if (!showingData) {
          toast({
            title: 'Error',
            description: `Failed to load devices: ${error.message || 'Unknown error'}.`,
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    devicesLoadingRef.current = run;
    try {
      await run;
    } finally {
      devicesLoadingRef.current = null;
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
        audited_at: new Date().toISOString(),
        audited_by: userEmail,
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
        toast({
          title: 'Warning',
          description: `No device found with ID ${deviceId}.`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error updating asset check:', error);
      toast({
        title: 'Error',
        description: `Failed to set asset check to ${checkStatus}: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const handleUpdateDevice = async (deviceId: string, updates: Partial<Device>) => {
    try {
      if (!userEmail) throw new Error('No authenticated user found. Please log in.');
      if (!['Super Admin', 'Admin'].includes(userRole || '')) {
        throw new Error('Insufficient permissions to update device details. Admin or Super Admin role required.');
      }

      const { data, error } = await supabase
        .from('devices')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: userEmail,
        })
        .eq('id', deviceId)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, ...updates, updated_at: new Date().toISOString(), updated_by: userEmail } : d))
        );
        toast({ title: 'Success', description: 'Device updated successfully.' });
      }
    } catch (error: any) {
      console.error('Error updating device:', error);
      toast({
        title: 'Error',
        description: `Failed to update device: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleBulkUpdateDevices = async (updates: { id: string, updates: Partial<Device> }[]) => {
    try {
      if (!userEmail) throw new Error('No authenticated user found. Please log in.');
      if (!['Super Admin', 'Admin'].includes(userRole || '')) {
        throw new Error('Insufficient permissions to update devices. Admin or Super Admin role required.');
      }

      setLoading(true);
      const updatePromises = updates.map(({ id, updates: devUpdates }) => {
        const payload: any = {
          ...devUpdates,
          updated_at: new Date().toISOString(),
          updated_by: userEmail,
        };
        if ('far_code' in devUpdates) {
          payload.far_code = devUpdates.far_code === null ? null : Number(devUpdates.far_code);
        }

        return supabase
          .from('devices')
          .update(payload)
          .eq('id', id);
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error).map(r => r.error);

      if (errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `Updated some devices, but ${errors.length} updates failed.`,
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Success', description: `Successfully updated ${updates.length} devices.` });
      }

      setDevices(prev =>
        prev.map(d => {
          const update = updates.find(u => u.id === d.id);
          if (update) {
            return { ...d, ...update.updates, updated_at: new Date().toISOString(), updated_by: userEmail };
          }
          return d;
        })
      );
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      toast({
        title: 'Error',
        description: `Failed to update devices: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBatch = async (batchIds: string[], maxRetries = 3): Promise<{ updatedIds: string[]; error?: any }> => {
    if (!userEmail) throw new Error('No authenticated user found. Please log in.');
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
        const { data, error } = await supabase
          .from('devices')
          .update(updates)
          .in('id', batchIds)
          .select('id');

        if (error) {
          if (retry === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        return { updatedIds: data?.map((row: any) => row.id) || [] };
      } catch (err: any) {
        if (retry === maxRetries || !err.message?.includes('Failed to fetch')) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return { updatedIds: [], error: new Error('Max retries exceeded') };
  };

  const handleBulkAuditCheck = async (
    serials: string[]
  ): Promise<{ matchedCount: number; notFound: string[]; updatedSerials: string[] }> => {
    if (!userEmail) throw new Error('No authenticated user found. Please log in.');
    if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
      throw new Error('Insufficient permissions. Super Admin, Admin, or Operator role required.');
    }

    const cleaned = Array.from(
      new Set(serials.map((s) => String(s ?? '').trim()).filter(Boolean))
    );
    if (cleaned.length === 0) {
      return { matchedCount: 0, notFound: [], updatedSerials: [] };
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('devices')
      .select('id, serial_number, is_deleted, material_type')
      .in('serial_number', cleaned);
    if (fetchErr) throw fetchErr;

    const eligible = (existing || []).filter(
      (d: any) => !d.is_deleted && d.material_type !== 'Outward'
    );
    const foundSerials = new Set(eligible.map((d: any) => d.serial_number));
    const notFound = cleaned.filter((s) => !foundSerials.has(s));
    const ids = eligible.map((d: any) => d.id);

    const nowIso = new Date().toISOString();
    const updates = {
      asset_check: 'Matched',
      audited_at: nowIso,
      audited_by: userEmail,
      updated_at: nowIso,
      updated_by: userEmail,
    };

    const updatedIds: string[] = [];
    const BATCH_SIZE = 100;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('devices')
        .update(updates)
        .in('id', batch)
        .select('id');
      if (error) throw error;
      updatedIds.push(...(data?.map((r: any) => r.id) || []));
    }

    setDevices((prev) =>
      prev.map((d) =>
        updatedIds.includes(d.id)
          ? { ...d, asset_check: 'Matched', audited_at: nowIso, audited_by: userEmail, updated_at: nowIso, updated_by: userEmail }
          : d
      )
    );

    return {
      matchedCount: updatedIds.length,
      notFound,
      updatedSerials: eligible
        .filter((d: any) => updatedIds.includes(d.id))
        .map((d: any) => d.serial_number),
    };
  };

  const handleClearAllChecks = async (ids: string[]) => {
    try {
      setIsClearing(true);
      if (!userEmail) throw new Error('No authenticated user found. Please log in.');
      if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
        throw new Error('Insufficient permissions to unmatch devices. Super Admin, Admin, or Operator role required.');
      }
      if (ids.length === 0) {
        toast({ title: 'Info', description: 'No devices selected to unmatch.', variant: 'default' });
        return;
      }

      if (ids.length === 1) {
        await handleUpdateAssetCheck(ids[0], 'Unmatched');
      } else {
        const BATCH_SIZE = 50;
        const allUpdatedIds: string[] = [];

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batchIds = ids.slice(i, i + BATCH_SIZE);
          const result = await updateBatch(batchIds);
          allUpdatedIds.push(...result.updatedIds);
        }

        if (allUpdatedIds.length > 0) {
          setDevices(prevDevices => {
            return prevDevices.map(device =>
              allUpdatedIds.includes(device.id)
                ? { ...device, asset_check: 'Unmatched', updated_at: new Date().toISOString(), updated_by: userEmail }
                : device
            );
          });
          toast({ title: 'Success', description: `Unmatched ${allUpdatedIds.length} device(s).` });
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: `Failed to unmatch devices: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className='h-screen flex flex-col overflow-hidden bg-gradient-to-br from-background to-secondary/20 relative'>
      <div className='w-full bg-card/95 backdrop-blur-md border-b border-border/50 z-50 shadow-sm flex-shrink-0'>
        <div className='w-full px-8 py-3 flex justify-between items-center'>
          <div className='flex items-center space-x-4'>
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt='LEAD GROUP'
              className={`h-11 w-auto transition-opacity duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLogoLoaded(true)}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h1 className='text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'>Lead Inventory Management</h1>
          </div>
          <div className='flex items-center space-x-4'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setVersionHistoryOpen(true)}
              title='Version History'
              className='relative h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary'
            >
              <History className='w-5 h-5' />
            </Button>
            <NotificationBell onOpenRequest={(id) => { setFocusRequestId(id); setActiveTab('requests'); }} />
            <ActiveUsers />
            <UserProfile />
          </div>
        </div>
      </div>
      {versionHistoryOpen && (
        <Suspense fallback={null}>
          <VersionHistoryDialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen} />
        </Suspense>
      )}

      <main className='flex-1 overflow-y-auto custom-scrollbar bg-white/40 pb-16'>
        {!activeTab ? (
          <div className="flex h-full items-center justify-center py-32">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className='w-full min-h-full flex flex-col'>
            <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v); }} className='w-full flex-1 flex flex-col'>
              {allowedTabs.length > 1 && (
                <TabsList className='flex w-full sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 flex-shrink-0 px-8 h-16 rounded-none shadow-sm gap-2 overflow-x-auto no-scrollbar'>
                  {userRole !== 'Reporter' && canSee('create') && (
                    <TabsTrigger value='create' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Package className='w-4 h-4' />
                      Create Order
                    </TabsTrigger>
                  )}
                  {canSee('view') && (
                    <TabsTrigger value='view' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Archive className='w-4 h-4' />
                      View Orders
                    </TabsTrigger>
                  )}
                  {canSee('order') && (
                    <TabsTrigger value='order' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <BarChart3 className='w-4 h-4' />
                      Order Summary
                    </TabsTrigger>
                  )}
                  {canSee('devices') && (
                    <TabsTrigger value='devices' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Archive className='w-4 h-4' />
                      Devices
                    </TabsTrigger>
                  )}
                  {canSee('requests') && (
                    <TabsTrigger value='requests' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Inbox className='w-4 h-4' />
                      Asset Master
                    </TabsTrigger>
                  )}
                  {canSee('audit') && (
                    <TabsTrigger value='audit' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Archive className='w-4 h-4' />
                      Audit View
                    </TabsTrigger>
                  )}
                  {canSee('activity') && (
                    <TabsTrigger value='activity' className='flex-1 min-w-[140px] flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all h-10'>
                      <Clock className='w-4 h-4' />
                      Activity Logs
                    </TabsTrigger>
                  )}
                </TabsList>
              )}
              <TabsContent value='requests' className='w-full bg-white flex-1'>
                <RequestsPanel
                  focusRequestId={focusRequestId}
                  onFocusHandled={() => setFocusRequestId(null)}
                />
              </TabsContent>
              {userRole !== 'Reporter' && (
                <TabsContent value='create' className='space-y-6 w-full px-8 py-6'>
                  <Suspense fallback={<TabFallback />}>
                    <UnifiedAssetForm
                      orderType={orderType}
                      setOrderType={setOrderType}
                      salesOrder={salesOrder}
                      setSalesOrder={setSalesOrder}
                      dealId={dealId}
                      setDealId={setDealId}
                      nucleusId={nucleusId}
                      setNucleusId={setNucleusId}
                      brand={brand}
                      setBrand={setBrand}
                      schoolName={schoolName}
                      setSchoolName={setSchoolName}
                      agreementType={agreementType}
                      setAgreementType={setAgreementType}
                      loading={loading}
                      setLoading={setLoading}
                      loadOrders={loadOrders}
                      loadDevices={loadDevices}
                      loadOrderSummary={async () => { setDataLoaded(prev => ({ ...prev, devices: false })); }}
                      openScanner={(itemId, index, assetType) => {
                        setCurrentSerialIndex({ itemId, index, type: assetType as 'tablet' | 'tv' });
                        setShowScanner(true);
                      }}
                    />
                  </Suspense>
                </TabsContent>
              )}
              <TabsContent value='view' className='w-full'>
                <Suspense fallback={<TabFallback />}>
                  <OrdersTable
                    orders={orders}
                    setOrders={setOrders}
                    loadOrderSummary={async () => { setDataLoaded(prev => ({ ...prev, devices: false })); }}
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
                    selectedAgreementType={selectedAgreementType}
                    setSelectedAgreementType={setSelectedAgreementType}
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    selectedSdCardSize={selectedSdCardSize}
                    setSelectedSdCardSize={setSelectedSdCardSize}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    showDeleted={showDeleted}
                    setShowDeleted={setShowDeleted}
                    searchQuery={deferredSearchQuery}
                    setSearchQuery={setSearchQuery}
                    loading={loading}
                    setLoading={setLoading}
                    loadOrders={loadOrders}
                    loadDevices={loadDevices}
                    userRole={userRole}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value='order' className='w-full'>
                <Suspense fallback={<TabFallback />}>
                  <OrderSummaryTable
                    devices={devices}
                    loading={loading}
                    selectedWarehouse={selectedWarehouse}
                    setSelectedWarehouse={(value) => {
                      setSelectedWarehouse(Array.isArray(value) ? value : [value]);
                      setSelectedAssetType([]);
                      setSelectedModel([]);
                      setSelectedProduct([]);
                      setSelectedAssetStatus([]);
                      setSelectedAssetGroup([]);
                    }}
                    selectedAssetType={selectedAssetType}
                    setSelectedAssetType={(value) => {
                      setSelectedAssetType(Array.isArray(value) ? value : [value]);
                      setSelectedModel([]);
                    }}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    selectedAssetStatus={selectedAssetStatus}
                    setSelectedAssetStatus={setSelectedAssetStatus}
                    selectedAssetGroup={selectedAssetGroup}
                    setSelectedAssetGroup={setSelectedAssetGroup}
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    selectedAssetCondition={selectedAssetCondition}
                    setSelectedAssetCondition={setSelectedAssetCondition}
                    selectedAgreementType={selectedAgreementType}
                    setSelectedAgreementType={setSelectedAgreementType}
                    selectedSdCardSize={selectedSdCardSize}
                    setSelectedSdCardSize={setSelectedSdCardSize}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    showDeleted={showDeleted}
                    setShowDeleted={setShowDeleted}
                    searchQuery={deferredSearchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value='devices' className='w-full'>
                <Suspense fallback={<TabFallback />}>
                  <DevicesTable
                    devices={devices}
                    loading={loading}
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
                    selectedSdCardSize={selectedSdCardSize}
                    setSelectedSdCardSize={setSelectedSdCardSize}
                    selectedOrderType={selectedOrderType}
                    setSelectedOrderType={setSelectedOrderType}
                    selectedAgreementType={selectedAgreementType}
                    setSelectedAgreementType={setSelectedAgreementType}
                    selectedAssetGroup={selectedAssetGroup}
                    setSelectedAssetGroup={setSelectedAssetGroup}
                    selectedAssetCondition={selectedAssetCondition}
                    setSelectedAssetCondition={setSelectedAssetCondition}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    showDeleted={showDeleted}
                    setShowDeleted={setShowDeleted}
                    searchQuery={deferredSearchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value='audit' className='w-full'>
                <Suspense fallback={<TabFallback />}>
                  <AuditTable
                    devices={devices}
                    loading={loading}
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
                    selectedAssetCondition={selectedAssetCondition}
                    setSelectedAssetCondition={setSelectedAssetCondition}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    searchQuery={deferredSearchQuery}
                    setSearchQuery={setSearchQuery}
                    onUpdateAssetCheck={handleUpdateAssetCheck}
                    onUpdateDevice={handleUpdateDevice}
                    onBulkUpdateDevices={handleBulkUpdateDevices}
                    onClearAllChecks={handleClearAllChecks}
                    onBulkAuditCheck={handleBulkAuditCheck}
                    userRole={userRole || 'unknown'}
                    currentUser={userEmail}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value='activity' className='w-full'>
                <Suspense fallback={<TabFallback />}>
                  <ActivityLogs />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <footer className='fixed bottom-0 left-0 right-0 py-3 text-left px-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-t border-slate-100 bg-white/80 backdrop-blur-md z-50 flex-shrink-0'>
        Crafted by 🤓 IT Infra minds, for IT Infra needs
      </footer>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
      {showScanner && (
        <Suspense fallback={null}>
          <EnhancedBarcodeScanner
            isOpen={showScanner}
            onClose={() => {
              setShowScanner(false);
              setCurrentSerialIndex(null);
            }}
            onScan={handleScanResult}
          />
        </Suspense>
      )}
    </div>
  );
};

export default InventoryManagement;
