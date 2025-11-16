import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Camera, ChevronDown, ChevronUp, Search, Edit2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  orderTypes,
  tabletModels,
  tvModels,
  configurations,
  tvConfigurations,
  products,
  sdCardSizes,
  coverModels,
  pendriveSizes,
  locations,
  assetStatuses,
  assetGroups,
  assetTypes,
  additionalAssetTypes,
  assetModels,
  profileIds,
  agreementTypes,
} from './constants';

interface AssetItem {
  id: string;
  assetType: string;
  model: string;
  configuration?: string;
  product?: string;
  sdCardSize?: string;
  profileId?: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroups: string[];
  asset_conditions: string[];
  farCodes: string[];
  hasSerials: boolean;
  orderId?: string;
}

interface SalesOrderSuggestion {
  salesOrder: string;
  schoolName: string;
  dealId?: string;
  nucleusId?: string;
  orderType: string;
  location: string;
  assetType: string;
  model: string;
  quantity: number;
  orderId: string;
  agreementType?: string;
}

interface UnifiedAssetFormProps {
  orderType: string;
  setOrderType: (value: string) => void;
  salesOrder: string;
  setSalesOrder: (value: string) => void;
  dealId: string;
  setDealId: (value: string) => void;
  nucleusId: string;
  setNucleusId: (value: string) => void;
  schoolName: string;
  setSchoolName: (value: string) => void;
  agreementType: string;
  setAgreementType: (value: string) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  loadOrders: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrderSummary: () => Promise<void>;
  openScanner: (itemId: string, index: number, assetType: string) => void;
}

const UnifiedAssetForm: React.FC<UnifiedAssetFormProps> = ({
  orderType,
  setOrderType,
  salesOrder,
  setSalesOrder,
  dealId,
  setDealId,
  nucleusId,
  setNucleusId,
  schoolName,
  setSchoolName,
  agreementType,
  setAgreementType,
  loading,
  setLoading,
  loadOrders,
  loadDevices,
  loadOrderSummary,
  openScanner,
}) => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetErrors, setAssetErrors] = useState<Record<string, (string | null)[]>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [salesOrderSuggestions, setSalesOrderSuggestions] = useState<SalesOrderSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Silent feedback
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`[${variant === 'destructive' ? 'ERROR' : 'INFO'}] ${title}: ${description}`);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    fetchUser();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (searchQuery.trim().length < 3) {
      setSalesOrderSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('sales_order, school_name, deal_id, nucleus_id, order_type, warehouse, asset_type, model, quantity, id, agreement_type')
          .eq('is_deleted', false)
          .ilike('sales_order', `%${searchQuery}%`)
          .order('sales_order', { ascending: true })
          .limit(10);
        if (error) throw error;
        const suggestions: SalesOrderSuggestion[] = data?.map((order: any) => ({
          salesOrder: order.sales_order,
          schoolName: order.school_name || '',
          dealId: order.deal_id,
          nucleusId: order.nucleus_id,
          orderType: order.order_type,
          location: order.warehouse,
          assetType: order.asset_type,
          model: order.model,
          quantity: order.quantity,
          orderId: order.id,
          agreementType: order.agreement_type,
        })) || [];
        const grouped: SalesOrderSuggestion[] = [];
        const seen = new Set<string>();
        suggestions.forEach(sugg => {
          const key = sugg.salesOrder;
          if (!seen.has(key)) {
            seen.add(key);
            grouped.push(sugg);
          }
        });
        setSalesOrderSuggestions(grouped);
        setShowSuggestions(grouped.length > 0);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const generateSalesOrder = () => {
    const digits = Math.floor(1000 + Math.random() * 9000);
    const letters = Math.random().toString(36).substr(2, 2).toUpperCase();
    const finalDigits = Math.floor(10 + Math.random() * 90);
    return `${digits}${letters}${finalDigits}`;
  };

  const defaultHasSerials = (assetType: string) => {
    return ['Tablet', 'TV', 'Synology NAS', 'Netgear NAS', 'HDD', 'Access Point', 'Sim Router', 'Hybrid Router'].includes(assetType);
  };

  const hasModels = (assetType: string): boolean => {
    return assetModels[assetType] && assetModels[assetType].length > 0;
  };

  const addAsset = (assetType: string) => {
    const hasSerials = defaultHasSerials(assetType);
    const newAsset: AssetItem = {
      id: generateId(),
      assetType,
      model: '',
      configuration: '',
      product: '',
      sdCardSize: assetType === 'SD Card' ? '' : undefined,
      profileId: '',
      quantity: 1,
      location: '',
      serialNumbers: hasSerials ? [''] : [],
      assetStatuses: ['Fresh'],
      assetGroups: ['NFA'],
      asset_conditions: [''],
      farCodes: [''],
      hasSerials,
    };
    setAssets([...assets, newAsset]);
  };

  const updateAsset = (id: string, field: keyof AssetItem, value: any) => {
    setAssets(assets.map(asset => {
      if (asset.id === id) {
        if (field === 'quantity' && typeof value === 'number') {
          const newQuantity = Math.max(1, value);
          const currentSerials = asset.serialNumbers || [];
          const currentStatuses = asset.assetStatuses || [];
          const currentGroups = asset.assetGroups || [];
          const currentConditions = asset.asset_conditions || [];
          const currentFarCodes = asset.farCodes || [];
          const newSerialNumbers = asset.hasSerials ? Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '') : [];
          let newAssetStatuses;
          let newAssetGroups;
          let newAssetConditions;
          let newFarCodes;
          if (asset.hasSerials) {
            newAssetStatuses = Array(newQuantity).fill('Fresh').map((_, i) => currentStatuses[i] || 'Fresh');
            newAssetGroups = Array(newQuantity).fill('NFA').map((_, i) => currentGroups[i] || 'NFA');
            newAssetConditions = Array(newQuantity).fill('').map((_, i) => currentConditions[i] || '');
            newFarCodes = Array(newQuantity).fill('').map((_, i) => currentFarCodes[i] || '');
          } else {
            const uniformStatus = currentStatuses[0] || 'Fresh';
            const uniformGroup = currentGroups[0] || 'NFA';
            const uniformCondition = currentConditions[0] || '';
            const uniformFar = currentFarCodes[0] || '';
            newAssetStatuses = Array(newQuantity).fill(uniformStatus);
            newAssetGroups = Array(newQuantity).fill(uniformGroup);
            newAssetConditions = Array(newQuantity).fill(uniformCondition);
            newFarCodes = Array(newQuantity).fill(uniformFar);
          }
          return {
            ...asset,
            quantity: newQuantity,
            serialNumbers: newSerialNumbers,
            assetStatuses: newAssetStatuses,
            assetGroups: newAssetGroups,
            asset_conditions: newAssetConditions,
            farCodes: newFarCodes,
          };
        }
        if (field === 'hasSerials') {
          const newHasSerials = value;
          let newSerialNumbers = asset.serialNumbers;
          let newFarCodes = asset.farCodes;
          if (newHasSerials && newSerialNumbers.length === 0) {
            newSerialNumbers = Array(asset.quantity).fill('');
            newFarCodes = Array(asset.quantity).fill('');
          } else if (!newHasSerials) {
            newSerialNumbers = [];
            const uniformFar = asset.farCodes[0] || '';
            newFarCodes = Array(asset.quantity).fill(uniformFar);
          }
          if (!newHasSerials) {
            const uniformStatuses = Array(asset.quantity).fill(asset.assetStatuses[0] || 'Fresh');
            const uniformGroups = Array(asset.quantity).fill(asset.assetGroups[0] || 'NFA');
            const uniformConditions = Array(asset.quantity).fill(asset.asset_conditions[0] || '');
            return {
              ...asset,
              hasSerials: newHasSerials,
              serialNumbers: newSerialNumbers,
              assetStatuses: uniformStatuses,
              assetGroups: uniformGroups,
              asset_conditions: uniformConditions,
              farCodes: newFarCodes,
            };
          } else {
            return {
              ...asset,
              hasSerials: newHasSerials,
              serialNumbers: newSerialNumbers,
              farCodes: newFarCodes,
            };
          }
        }
        if (field === 'model' && asset.assetType === 'SD Card') {
          return { ...asset, [field]: value, sdCardSize: value };
        }
        if (field === 'serialNumbers') {
          return { ...asset, [field]: value };
        }
        return { ...asset, [field]: value };
      }
      return asset;
    }));
  };

  const removeAsset = (id: string) => setAssets(assets.filter(asset => asset.id !== id));

  // Load order for edit
  const loadOrderForEdit = async (selectedSalesOrder: string) => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          devices (
            serial_number,
            asset_status,
            asset_group,
            far_code,
            asset_condition
          )
        `)
        .eq('sales_order', selectedSalesOrder)
        .eq('is_deleted', false);
      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) {
        toast({ title: 'Error', description: 'No order found for this sales order', variant: 'destructive' });
        return;
      }
      const firstOrder = ordersData[0];
      setOrderType(firstOrder.order_type);
      setSchoolName(firstOrder.school_name || '');
      setDealId(firstOrder.deal_id || '');
      setNucleusId(firstOrder.nucleus_id || '');
      setAgreementType(firstOrder.agreement_type || '');
      setSalesOrder(selectedSalesOrder);
      setSearchQuery(selectedSalesOrder);
      const groupedAssets = new Map<string, AssetItem>();
      ordersData.forEach((order: any) => {
        const key = `${order.asset_type}-${order.model}-${order.warehouse}`;
        if (!groupedAssets.has(key)) {
          groupedAssets.set(key, {
            id: generateId(),
            assetType: order.asset_type,
            model: order.model,
            configuration: order.configuration || '',
            product: order.product || 'Lead',
            sdCardSize: order.asset_type === 'SD Card' ? order.model : order.sd_card_size || '',
            profileId: order.profile_id || '',
            quantity: 0,
            location: order.warehouse,
            serialNumbers: [],
            assetStatuses: [],
            assetGroups: [],
            asset_conditions: [],
            farCodes: [],
            hasSerials: defaultHasSerials(order.asset_type),
            orderId: order.id,
          });
        }
        const asset = groupedAssets.get(key)!;
        asset.quantity += order.quantity;
        const devices = order.devices || [];
        devices.forEach((device: any, idx: number) => {
          if (idx < asset.serialNumbers.length) {
            asset.serialNumbers[idx] = device.serial_number || '';
            asset.assetStatuses[idx] = device.asset_status || 'Fresh';
            asset.assetGroups[idx] = device.asset_group || 'NFA';
            asset.asset_conditions[idx] = device.asset_condition || '';
            asset.farCodes[idx] = device.far_code || '';
          } else {
            asset.serialNumbers.push(device.serial_number || '');
            asset.assetStatuses.push(device.asset_status || 'Fresh');
            asset.assetGroups.push(device.asset_group || 'NFA');
            asset.asset_conditions.push(device.asset_condition || '');
            asset.farCodes.push(device.far_code || '');
          }
        });
        while (asset.serialNumbers.length < asset.quantity) {
          asset.serialNumbers.push('');
          asset.assetStatuses.push('Fresh');
          asset.assetGroups.push('NFA');
          asset.asset_conditions.push('');
          asset.farCodes.push('');
        }
      });
      setAssets(Array.from(groupedAssets.values()));
      setEditMode(true);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Load order error:', error);
      toast({ title: 'Error', description: 'Failed to load order for editing', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSalesOrderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      const exactMatch = salesOrderSuggestions.find(s => s.salesOrder === trimmedQuery);
      if (exactMatch) {
        loadOrderForEdit(exactMatch.salesOrder);
      } else {
        setSalesOrder(trimmedQuery);
        setEditMode(false);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionSelect = (suggestion: SalesOrderSuggestion) => {
    setSearchQuery(suggestion.salesOrder);
    loadOrderForEdit(suggestion.salesOrder);
  };

const handleCancelSearch = () => {
  setSearchQuery('');
  setSalesOrder('');
  setOrderType('');
  setSchoolName('');
  setDealId('');
  setNucleusId('');
  setAgreementType('');   // now included
  setEditMode(false);
  setAssets([]);
  setShowSuggestions(false);
  setSalesOrderSuggestions([]);
};

  const fetchAssetDetails = async (asset: AssetItem, index: number, serialNumber: string) => {
    if (!serialNumber || !asset.hasSerials) return;
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('asset_status, asset_group, far_code')
      .eq('serial_number', serialNumber)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (deviceError || !deviceData || deviceData.length === 0) {
      setAssets(prevAssets =>
        prevAssets.map(a => {
          if (a.id === asset.id) {
            const newStatuses = [...a.assetStatuses];
            const newGroups = [...a.assetGroups];
            const newFarCodes = [...a.farCodes];
            newStatuses[index] = 'Fresh';
            newGroups[index] = 'NFA';
            newFarCodes[index] = '';
            return { ...a, assetStatuses: newStatuses, assetGroups: newGroups, farCodes: newFarCodes };
          }
          return a;
        })
      );
      return;
    }
    const device = deviceData[0];
    setAssets(prevAssets =>
      prevAssets.map(a => {
        if (a.id === asset.id) {
          const newStatuses = [...a.assetStatuses];
          const newGroups = [...a.assetGroups];
          const newFarCodes = [...a.farCodes];
          newStatuses[index] = device.asset_status || 'Fresh';
          newGroups[index] = device.asset_group || 'NFA';
          newFarCodes[index] = device.far_code ? String(device.far_code) : '';
          return { ...a, assetStatuses: newStatuses, assetGroups: newGroups, farCodes: newFarCodes };
        }
        return a;
      })
    );
  };

  const validateSerials = async () => {
    const errors: Record<string, (string | null)[]> = {};
    const isInward = ['Stock', 'Return'].includes(orderType);
    for (const asset of assets) {
      if (!asset.hasSerials) {
        errors[asset.id] = Array(asset.quantity).fill(null);
        continue;
      }
      const serialErrors: (string | null)[] = Array(asset.quantity).fill(null);
      const allSerials = asset.serialNumbers.filter(sn => sn && sn.trim());
      for (let i = 0; i < asset.serialNumbers.length; i++) {
        const serial = asset.serialNumbers[i]?.trim();
        if (serial && allSerials.filter(s => s === serial).length > 1) {
          serialErrors[i] = 'Duplicate within order';
        }
      }
      if (allSerials.length > 0) {
        const { data: deviceData, error: deviceError } = await supabase
          .from('devices')
          .select('id, serial_number, asset_type, material_type, warehouse, asset_status, asset_group, far_code, updated_at')
          .eq('asset_type', asset.assetType)
          .in('serial_number', allSerials)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false });
        if (deviceError) {
          console.error('Device fetch error:', deviceError.message);
          errors[asset.id] = serialErrors;
          continue;
        }
        const latestBySerial: Record<string, any> = {};
        deviceData?.forEach((device: any) => {
          if (!latestBySerial[device.serial_number] || new Date(device.updated_at) > new Date(latestBySerial[device.serial_number].updated_at)) {
            latestBySerial[device.serial_number] = device;
          }
        });
        for (let i = 0; i < asset.serialNumbers.length; i++) {
          const serial = asset.serialNumbers[i]?.trim();
          if (!serial) continue;
          const latestDevice = latestBySerial[serial];
          if (latestDevice) {
            if (isInward && latestDevice.material_type === 'Inward' && latestDevice.warehouse !== asset.location) {
              serialErrors[i] = `Currently Inward in ${latestDevice.warehouse}`;
            } else if (!isInward && latestDevice.material_type === 'Outward' && latestDevice.warehouse !== asset.location) {
              serialErrors[i] = `Currently Outward in ${latestDevice.warehouse}`;
            } else if (!isInward && latestDevice.material_type === 'Inward' && latestDevice.warehouse !== asset.location) {
              serialErrors[i] = `Currently Inward in ${latestDevice.warehouse}`;
            }
          } else {
            if (!isInward) {
              serialErrors[i] = 'Not in stock';
            }
          }
        }
      }
      errors[asset.id] = serialErrors;
    }
    setAssetErrors(errors);
  };

  useEffect(() => {
    validateSerials();
  }, [assets, orderType]);

  const handleSerialChange = async (asset: AssetItem, index: number, serial: string) => {
    if (!asset.hasSerials) return;
    if (!serial.trim()) {
      setAssets(prevAssets =>
        prevAssets.map(a => {
          if (a.id === asset.id) {
            const newStatuses = [...a.assetStatuses];
            const newGroups = [...a.assetGroups];
            const newFarCodes = [...a.farCodes];
            newStatuses[index] = 'Fresh';
            newGroups[index] = 'NFA';
            newFarCodes[index] = '';
            return { ...a, assetStatuses: newStatuses, assetGroups: newGroups, farCodes: newFarCodes };
          }
          return a;
        })
      );
      return;
    }
    await fetchAssetDetails(asset, index, serial.trim());
  };

  const validateForm = () => {
    if (!orderType) {
      toast({ title: 'Error', description: 'Please select an order type', variant: 'destructive' });
      return false;
    }
    if (!dealId.trim()) {
      toast({ title: 'Error', description: 'Deal ID is required', variant: 'destructive' });
      return false;
    }
    if (!agreementType) {
      toast({ title: 'Error', description: 'Please select an Agreement Type', variant: 'destructive' });
      return false;
    }
    if (!schoolName.trim()) {
      toast({ title: 'Error', description: 'School Name is required', variant: 'destructive' });
      return false;
    }
    if (assets.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one asset', variant: 'destructive' });
      return false;
    }
    const isInward = ['Stock', 'Return'].includes(orderType);
    for (const asset of assets) {
      if (!asset.location) {
        toast({ title: 'Error', description: `Location is required for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (assetTypes.includes(asset.assetType as any) && !asset.model) {
        toast({ title: 'Error', description: `Model is required for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (additionalAssetTypes.includes(asset.assetType) && hasModels(asset.assetType) && !asset.model) {
        toast({ title: 'Error', description: `Model is required for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (asset.assetStatuses.length !== asset.quantity) {
        toast({ title: 'Error', description: `Asset statuses count mismatch for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (asset.assetGroups.length !== asset.quantity) {
        toast({ title: 'Error', description: `Asset groups count mismatch for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (asset.asset_conditions.length !== asset.quantity) {
        toast({ title: 'Error', description: `Asset conditions count mismatch for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      if (asset.farCodes.length !== asset.quantity) {
        toast({ title: 'Error', description: `FAR codes count mismatch for ${asset.assetType}`, variant: 'destructive' });
        return false;
      }
      for (let i = 0; i < asset.quantity; i++) {
        if (isInward && asset.assetStatuses[i] === 'Scrap' && !asset.asset_conditions[i]?.trim()) {
          toast({ title: 'Error', description: `Asset condition is required for scrapped item in ${asset.assetType} at position ${i + 1}`, variant: 'destructive' });
          return false;
        }
      }
    }
    return true;
  };

  const logHistory = async (tableName: string, recordId: string, fieldName: string, newData: string, userEmail: string, salesOrder: string | null) => {
    await supabase.from('history').insert({
      record_id: recordId,
      sales_order: salesOrder,
      table_name: tableName,
      field_name: fieldName,
      old_data: '',
      new_data: newData,
      operation: editMode ? 'UPDATE' : 'INSERT',
      updated_by: userEmail,
    });
  };

  const createOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) throw new Error('Failed to retrieve authenticated user email');
      const userEmail = userData.user.email;
      const materialType = ['Stock', 'Return'].includes(orderType) ? 'Inward' : 'Outward';
      let salesOrderId = salesOrder;
      if (!salesOrderId) {
        if (dealId && agreementType) {
          const randomNum = Math.floor(10 + Math.random() * 90);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${dealId}-${agreementType}${randomNum}${randomLetters}`;
        } else if (dealId) {
          const randomNum = Math.floor(10 + Math.random() * 90);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${dealId}${randomLetters}${randomNum}`;
        } else if (schoolName) {
          const schoolCode = schoolName.substring(0, 3).toUpperCase();
          const randomNum = Math.floor(100 + Math.random() * 900);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${schoolCode}${randomNum}${randomLetters}`;
        } else {
          salesOrderId = generateSalesOrder();
        }
      }
      for (const asset of assets) {
        const { data: existing, error: checkError } = await supabase
          .from('orders')
          .select('id')
          .eq('sales_order', salesOrderId)
          .eq('asset_type', asset.assetType)
          .eq('model', asset.model)
          .eq('warehouse', asset.location)
          .eq('is_deleted', false)
          .single();
        if (checkError && checkError.code !== 'PGRST116') throw checkError;
        if (existing) {
          toast({
            title: 'Error',
            description: `Sales order ${salesOrderId} already exists for ${asset.assetType} (${asset.model}) at location ${asset.location}.`,
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        const assetSerials = asset.hasSerials ? asset.serialNumbers.filter(sn => sn && sn.trim()) : [];
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: orderType,
            material_type: materialType,
            asset_type: asset.assetType,
            model: asset.model,
            quantity: asset.quantity,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            agreement_type: agreementType,
            serial_numbers: assetSerials,
            order_date: new Date().toISOString(),
            configuration: asset.configuration || null,
            product: asset.product || 'Lead',
            sd_card_size: asset.assetType === 'SD Card' ? asset.model : asset.sdCardSize || null,
            profile_id: asset.profileId || null,
            created_by: userEmail,
            updated_by: userEmail,
          })
          .select()
          .single();
        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);
        for (let i = 0; i < asset.quantity; i++) {
          const serialNumber = asset.hasSerials ? (asset.serialNumbers[i] || '') : '';
          const assetStatus = asset.assetStatuses[i] || 'Fresh';
          const assetGroup = asset.assetGroups[i] || 'NFA';
          const assetCondition = asset.asset_conditions[i] || null;
          const farCode = asset.farCodes[i] || null;
          await supabase.from('devices').insert([{
            asset_type: asset.assetType,
            model: asset.model,
            serial_number: serialNumber,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            agreement_type: agreementType,
            status: materialType === 'Inward' ? 'Available' : 'Assigned',
            material_type: materialType,
            order_id: orderData.id,
            configuration: asset.configuration || null,
            product: asset.product || 'Lead',
            sd_card_size: asset.assetType === 'SD Card' ? asset.model : asset.sdCardSize || null,
            profile_id: asset.profileId || null,
            asset_status: assetStatus,
            asset_group: assetGroup,
            asset_condition: assetCondition,
            far_code: farCode,
            created_by: userEmail,
            updated_by: userEmail,
          });
        }
        await logHistory('orders', orderData.id, 'order_type', orderType, userEmail, salesOrderId);
      }
      toast({ title: 'Success', description: 'Orders created successfully' });
      setAssets([]);
      setSalesOrder('');
      setDealId('');
      setNucleusId('');
      setSchoolName('');
      setOrderType('');
      setAgreementType('');
      setEditMode(false);
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) throw new Error('Failed to retrieve authenticated user email');
      const userEmail = userData.user.email;
      const materialType = ['Stock', 'Return'].includes(orderType) ? 'Inward' : 'Outward';
      let salesOrderId = salesOrder;
      if (!salesOrderId) {
        if (dealId && agreementType) {
          const randomNum = Math.floor(10 + Math.random() * 90);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${dealId}-${agreementType}${randomNum}${randomLetters}`;
        } else if (dealId) {
          const randomNum = Math.floor(10 + Math.random() * 90);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${dealId}${randomLetters}${randomNum}`;
        } else if (schoolName) {
          const schoolCode = schoolName.substring(0, 3).toUpperCase();
          const randomNum = Math.floor(100 + Math.random() * 900);
          const randomLetters = Math.random().toString(36).substr(2, 2).toUpperCase();
          salesOrderId = `${schoolCode}${randomNum}${randomLetters}`;
        } else {
          salesOrderId = generateSalesOrder();
        }
      }
      for (const asset of assets) {
        const assetSerials = asset.hasSerials ? asset.serialNumbers.filter(sn => sn && sn.trim()) : [];
        if (asset.orderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              order_type: orderType,
              quantity: asset.quantity,
              serial_numbers: assetSerials,
              agreement_type: agreementType,
              updated_by: userEmail,
              updated_at: new Date().toISOString(),
            })
            .eq('id', asset.orderId);
          if (updateError) throw new Error(`Order update failed: ${updateError.message}`);
          await supabase.from('devices').delete().eq('order_id', asset.orderId);
          for (let i = 0; i < asset.quantity; i++) {
            const serialNumber = asset.hasSerials ? (asset.serialNumbers[i] || '') : '';
            const assetStatus = asset.assetStatuses[i] || 'Fresh';
            const assetGroup = asset.assetGroups[i] || 'NFA';
            const assetCondition = asset.asset_conditions[i] || null;
            const farCode = asset.farCodes[i] || null;
            await supabase.from('devices').insert([{
              asset_type: asset.assetType,
              model: asset.model,
              serial_number: serialNumber,
              warehouse: asset.location,
              sales_order: salesOrderId,
              deal_id: dealId || null,
              school_name: schoolName,
              nucleus_id: nucleusId || null,
              agreement_type: agreementType,
              status: materialType === 'Inward' ? 'Available' : 'Assigned',
              material_type: materialType,
              order_id: asset.orderId,
              configuration: asset.configuration || null,
              product: asset.product || 'Lead',
              sd_card_size: asset.assetType === 'SD Card' ? asset.model : asset.sdCardSize || null,
              profile_id: asset.profileId || null,
              asset_status: assetStatus,
              asset_group: assetGroup,
              asset_condition: assetCondition,
              far_code: farCode,
              created_by: userEmail,
              updated_by: userEmail,
            });
          }
          await logHistory('orders', asset.orderId, 'order_type', orderType, userEmail, salesOrderId);
        }
      }
      toast({ title: 'Success', description: 'Order updated successfully' });
      setAssets([]);
      setSalesOrder('');
      setDealId('');
      setNucleusId('');
      setSchoolName('');
      setOrderType('');
      setAgreementType('');
      setEditMode(false);
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestions = () => {
    if (!showSuggestions || salesOrderSuggestions.length === 0) return null;
    return (
      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
        {salesOrderSuggestions.map((sugg, idx) => (
          <div
            key={idx}
            onClick={() => handleSuggestionSelect(sugg)}
            style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '14px' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            <strong>{sugg.salesOrder}</strong> - {sugg.schoolName || 'No School'}
          </div>
        ))}
      </div>
    );
  };

  const renderAssetFields = (asset: AssetItem) => {
    const isMandatorySerial = ['Tablet', 'TV'].includes(asset.assetType);
    const showSerialSection = isMandatorySerial || asset.hasSerials;
    const isInward = ['Stock', 'Return'].includes(orderType);
    const handleSerialPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const serials = pastedText
        .split(/[\n\r\t ,;]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      if (serials.length === 0) return;
      const newSerials = [...asset.serialNumbers];
      let currentIndex = index;
      for (const serial of serials) {
        if (currentIndex >= asset.quantity) break;
        newSerials[currentIndex] = serial;
        currentIndex++;
      }
      updateAsset(asset.id, 'serialNumbers', newSerials);
      serials.forEach((serial, i) => {
        if (index + i < asset.quantity) {
          handleSerialChange(asset, index + i, serial);
        }
      });
    };
    return (
      <div key={asset.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold' }}>{asset.assetType}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!isMandatorySerial && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '12px' }}>Enable Serial Numbers</label>
                <input
                  type="checkbox"
                  checked={asset.hasSerials}
                  onChange={(e) => updateAsset(asset.id, 'hasSerials', e.target.checked)}
                />
              </div>
            )}
            <button onClick={() => removeAsset(asset.id)} style={{ color: '#ef4444' }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {asset.assetType === 'Tablet' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {tabletModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Configuration</label>
                <select
                  value={asset.configuration || ''}
                  onChange={(e) => updateAsset(asset.id, 'configuration', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Configuration</option>
                  {configurations.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>SD Card Size</label>
                <select
                  value={asset.sdCardSize || ''}
                  onChange={(e) => updateAsset(asset.id, 'sdCardSize', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Size</option>
                  {sdCardSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Profile ID</label>
                <input
                  type="text"
                  value={asset.profileId || ''}
                  onChange={(e) => updateAsset(asset.id, 'profileId', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
            </>
          )}
          {asset.assetType === 'TV' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {tvModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Configuration</label>
                <select
                  value={asset.configuration || ''}
                  onChange={(e) => updateAsset(asset.id, 'configuration', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Configuration</option>
                  {tvConfigurations.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          {asset.assetType === 'SD Card' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {sdCardSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Profile ID</label>
                <input
                  type="text"
                  value={asset.profileId || ''}
                  onChange={(e) => updateAsset(asset.id, 'profileId', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          {asset.assetType === 'Cover' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {coverModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          {asset.assetType === 'Pendrive' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {pendriveSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          {additionalAssetTypes.includes(asset.assetType) && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
                  {hasModels(asset.assetType) ? assetModels[asset.assetType].map(m => <option key={m} value={m}>{m}</option>) : null}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Product</label>
                <select
                  value={asset.product || ''}
                  onChange={(e) => updateAsset(asset.id, 'product', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Location *</label>
            <select
              value={asset.location}
              onChange={(e) => updateAsset(asset.id, 'location', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">Select Location</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Quantity *</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => updateAsset(asset.id, 'quantity', Math.max(1, asset.quantity - 1))} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={asset.quantity}
                onChange={(e) => updateAsset(asset.id, 'quantity', parseInt(e.target.value) || 1)}
                style={{ width: '60px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}
              />
              <button onClick={() => updateAsset(asset.id, 'quantity', asset.quantity + 1)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          {!showSerialSection && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Status</label>
                {isInward ? (
                  <select
                    value={asset.assetStatuses[0] || 'Fresh'}
                    onChange={(e) => {
                      const newStatuses = Array(asset.quantity).fill(e.target.value);
                      updateAsset(asset.id, 'assetStatuses', newStatuses);
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="Fresh">Fresh</option>
                    {assetStatuses.filter(s => s !== 'Fresh').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={asset.assetStatuses[0] || 'Fresh'}
                    disabled
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                  />
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Group</label>
                {isInward ? (
                  <select
                    value={asset.assetGroups[0] || 'NFA'}
                    onChange={(e) => {
                      const newGroups = Array(asset.quantity).fill(e.target.value);
                      updateAsset(asset.id, 'assetGroups', newGroups);
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="NFA">NFA</option>
                    {assetGroups.filter(g => g !== 'NFA').map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={asset.assetGroups[0] || 'NFA'}
                    disabled
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                  />
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>FAR Code</label>
                <input
                  type="text"
                  value={asset.farCodes[0] || ''}
                  disabled
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                />
              </div>
              {isInward && (asset.assetStatuses[0] || 'Fresh') === 'Scrap' && (
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Condition</label>
                  <input
                    type="text"
                    value={asset.asset_conditions[0] || ''}
                    onChange={(e) => {
                      const newConditions = Array(asset.quantity).fill(e.target.value);
                      updateAsset(asset.id, 'asset_conditions', newConditions);
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
        {showSerialSection && (
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              Serial Numbers <span style={{ fontWeight: 'normal', color: '#6b7280' }}></span>
            </h5>
            <div style={{ display: 'grid', gap: '8px' }}>
              {Array.from({ length: asset.quantity }).map((_, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={asset.serialNumbers[index] || ''}
                    onChange={(e) => {
                      const newSerials = [...asset.serialNumbers];
                      newSerials[index] = e.target.value;
                      updateAsset(asset.id, 'serialNumbers', newSerials);
                      handleSerialChange(asset, index, e.target.value);
                    }}
                    onPaste={(e) => handleSerialPaste(e, index)}
                    placeholder={`Serial ${index + 1}`}
                    style={{
                      width: '200px',
                      padding: '8px',
                      border: `1px solid ${assetErrors[asset.id]?.[index] ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => openScanner(asset.id, index, asset.assetType)}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  >
                    <Camera size={16} />
                  </button>
                  {isInward ? (
                    <>
                      <select
                        value={asset.assetStatuses[index] || 'Fresh'}
                        onChange={(e) => {
                          const newStatuses = [...asset.assetStatuses];
                          newStatuses[index] = e.target.value;
                          updateAsset(asset.id, 'assetStatuses', newStatuses);
                        }}
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                      >
                        <option value="Fresh">Fresh</option>
                        {assetStatuses.filter(s => s !== 'Fresh').map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        value={asset.assetGroups[index] || 'NFA'}
                        onChange={(e) => {
                          const newGroups = [...asset.assetGroups];
                          newGroups[index] = e.target.value;
                          updateAsset(asset.id, 'assetGroups', newGroups);
                        }}
                        style={{ width: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                      >
                        <option value="NFA">NFA</option>
                        {assetGroups.filter(g => g !== 'NFA').map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <input
                        type="text"
                        value={asset.farCodes[index] || ''}
                        disabled
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                      />
                      {asset.assetStatuses[index] === 'Scrap' && (
                        <input
                          type="text"
                          value={asset.asset_conditions[index] || ''}
                          onChange={(e) => {
                            const newConditions = [...asset.asset_conditions];
                            newConditions[index] = e.target.value;
                            updateAsset(asset.id, 'asset_conditions', newConditions);
                          }}
                          placeholder="Condition"
                          style={{ width: '200px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={asset.assetStatuses[index] || 'Fresh'}
                        disabled
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                      />
                      <input
                        type="text"
                        value={asset.assetGroups[index] || 'NFA'}
                        disabled
                        style={{ width: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                      />
                      <input
                        type="text"
                        value={asset.farCodes[index] || ''}
                        disabled
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                      />
                    </>
                  )}
                  {assetErrors[asset.id]?.[index] && (
                    <span style={{ color: '#ef4444', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {assetErrors[asset.id][index]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            </div>
          </div>
        )}
      </div>
    );
  };

  const mainAssetTypes = ['Tablet', 'TV', 'SD Card', 'Cover', 'Pendrive'];

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
        {editMode ? (
          <>
            <Edit2 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Edit Order
          </>
        ) : (
          'Create Order'
        )}
      </h2>
      {/* Sales Order Search - Moved to top, below the h2 (positioned below tabs in parent context) */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
        <form onSubmit={handleSalesOrderSearch} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setEditMode(false);
                setAssets([]);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSalesOrderSearch(e)}
              placeholder="Search by Sales order"
              style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
            <button type="submit" style={{ padding: '8px', border: '1px solid #3b82f6', borderRadius: '4px', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
              <Search size={16} />
            </button>
            <button type="button" onClick={handleCancelSearch} style={{ padding: '8px', border: '1px solid #ef4444', borderRadius: '4px', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          {renderSuggestions()}
        </form>
      </div>
{/* Order Details */}
<div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Order Details</h3>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>

    {/* 1. Order Type */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
        Order Type <span style={{ color: 'red' }}>*</span>
      </label>
      <select
        value={orderType}
        onChange={(e) => setOrderType(e.target.value)}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      >
        <option value="">Select Order Type</option>
        {orderTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>

    {/* 2. Sales Order */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Sales Order</label>
      <input
        type="text"
        value={salesOrder}
        onChange={(e) => setSalesOrder(e.target.value)}
        disabled={editMode}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      />
    </div>

    {/* 3. School Name */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
        School Name <span style={{ color: 'red' }}>*</span>
      </label>
      <input
        type="text"
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      />
    </div>

    {/* 4. Deal ID */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
        Deal ID <span style={{ color: 'red' }}>*</span>
      </label>
      <input
        type="text"
        value={dealId}
        onChange={(e) => setDealId(e.target.value)}
        placeholder="Required"
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      />
    </div>

    {/* 5. Nucleus ID */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nucleus ID</label>
      <input
        type="text"
        value={nucleusId}
        onChange={(e) => setNucleusId(e.target.value)}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      />
    </div>

    {/* 6. Agreement Type */}
    <div>
      <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
        Agreement Type <span style={{ color: 'red' }}>*</span>
      </label>
      <select
        value={agreementType}
        onChange={(e) => setAgreementType(e.target.value)}
        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
      >
        <option value="">Select Agreement Type</option>
        {agreementTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>

  </div>
</div>
      {/* Add Assets */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Add Assets</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {mainAssetTypes.map(type => (
            <button
              key={type}
              onClick={() => addAsset(type)}
              style={{
                padding: '8px 16px',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                background: '#3b82f6',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              + {type}
            </button>
          ))}
          <button
            onClick={() => setShowAdditional(!showAdditional)}
            style={{
              padding: '8px 16px',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              background: '#3b82f6',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            + More {showAdditional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {showAdditional && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {additionalAssetTypes.map(type => (
              <button
                key={type}
                onClick={() => {
                  addAsset(type);
                  setShowAdditional(false);
                }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #6b7280',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + {type}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Assets List */}
      <div>{assets.map(asset => renderAssetFields(asset))}</div>
      {/* Bulk Operations */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowBulk(!showBulk)}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            background: '#3b82f6',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {showBulk ? 'Hide Bulk Operations' : 'Bulk Operations'}
        </button>
      </div>
      {showBulk && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Upload (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Upload (CSV)</label>
                <button
                  onClick={() => {
                    const headers = [
                      'Sales Order',
                      'Deal ID',
                      'School Name',
                      'Nucleus ID',
                      'Order Type',
                      'Asset Type',
                      'Model',
                      'Configuration',
                      'Product',
                      'SD Card Size',
                      'Profile ID',
                      'Location',
                      'Quantity',
                      'Serial Number',
                      'Asset Status',
                      'Asset Group',
                    ];
                    const rows = [
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Tablet',
                        'Lenovo TB301XU',
                        '4G+64 GB (Android-13)',
                        'Lead',
                        '128 GB',
                        'Profile 1',
                        'Trichy',
                        '3',
                        'SN001',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Tablet',
                        'Lenovo TB301XU',
                        '4G+64 GB (Android-13)',
                        'Lead',
                        '128 GB',
                        'Profile 1',
                        'Trichy',
                        '',
                        'SN002',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Tablet',
                        'Lenovo TB301XU',
                        '4G+64 GB (Android-13)',
                        'Lead',
                        '128 GB',
                        'Profile 1',
                        'Trichy',
                        '',
                        'SN003',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'TV',
                        'Hyundai TV - 43"',
                        'Smart TV',
                        'Propel',
                        '',
                        '',
                        'Bangalore',
                        '1',
                        'SN004',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'SD Card',
                        '256 GB',
                        '',
                        '',
                        '',
                        'Profile 2',
                        'Hyderabad',
                        '1',
                        '',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Cover',
                        'M8 Flap Cover 4th gen - Lead',
                        '',
                        'Lead',
                        '',
                        '',
                        'Trichy',
                        '1',
                        '',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Pendrive',
                        '64 GB',
                        '',
                        'Lead',
                        '',
                        '',
                        'Trichy',
                        '1',
                        'SN005',
                        '',
                        '',
                      ],
                      [
                        'SO-1-abcde',
                        'DEAL123',
                        'School A',
                        'NUC001',
                        'Hardware',
                        'Sim Router',
                        'Sim Router',
                        '',
                        'Lead',
                        '',
                        '',
                        'Trichy',
                        '1',
                        'SN006',
                        '',
                        '',
                      ],
                    ];
                    const quoteCsvValue = (value) => {
                      const str = String(value || '');
                      const needsQuotes = /["\n\r,]/u.test(str) || str.trimStart() !== str || str.trimEnd() !== str;
                      const escaped = str.replace(/"/g, '""');
                      return needsQuotes ? `"${escaped}"` : escaped;
                    };
                    const csvTemplate =
                      headers.map(quoteCsvValue).join(',') +
                      '\n' +
                      rows.map(row => row.map(quoteCsvValue).join(',')).join('\n');
                    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                    const blob = new Blob([bom, csvTemplate], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'bulk_upload_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                >
                  Download Template
                </button>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    try {
                      const text = evt.target?.result as string;
                      const lines = text.trim().split('\n').filter(line => line.trim());
                      if (lines.length < 2) throw new Error('CSV must contain at least a header and one data row');
                      const parseCsvLine = (line: string) => {
                        const values: string[] = [];
                        let current = '';
                        let inQuotes = false;
                        let i = 0;
                        while (i < line.length) {
                          const char = line[i];
                          if (char === '"') {
                            if (inQuotes) {
                              if (i + 1 < line.length && line[i + 1] === '"') {
                                current += '"';
                                i++;
                              } else {
                                inQuotes = false;
                              }
                            } else {
                              inQuotes = true;
                            }
                          } else if (char === ',' && !inQuotes) {
                            values.push(current);
                            current = '';
                          } else {
                            current += char;
                          }
                          i++;
                        }
                        values.push(current);
                        return values.map(v => {
                          if (v.startsWith('"') && v.endsWith('"')) {
                            v = v.slice(1, -1);
                          }
                          return v.replace(/""/g, '"');
                        });
                      };
                      const headers = parseCsvLine(lines[0]);
                      const expectedHeaders = [
                        'Sales Order',
                        'Deal ID',
                        'School Name',
                        'Nucleus ID',
                        'Order Type',
                        'Asset Type',
                        'Model',
                        'Configuration',
                        'Product',
                        'SD Card Size',
                        'Profile ID',
                        'Location',
                        'Quantity',
                        'Serial Number',
                        'Asset Status',
                        'Asset Group',
                      ];
                      if (headers.length !== expectedHeaders.length) {
                        throw new Error(`Expected ${expectedHeaders.length} columns, found ${headers.length}`);
                      }
                      if (!headers.every((h, i) => h.trim() === expectedHeaders[i])) {
                        throw new Error('CSV header mismatch. Please use the provided template.');
                      }
                      const errors: { values: string[]; error: string }[] = [];
                      const groupedAssets: Record<string, any> = {};
                      for (let i = 1; i < lines.length; i++) {
                        try {
                          const values = parseCsvLine(lines[i]);
                          if (values.length !== headers.length) {
                            errors.push({
                              values: [...values, ...Array(headers.length - values.length).fill('')],
                              error: `Expected ${headers.length} columns, found ${values.length}`,
                            });
                            continue;
                          }
                          const getValue = (headerName: string) => {
                            const index = headers.indexOf(headerName);
                            return index !== -1 ? (values[index] || '').trim() : '';
                          };
                          const salesOrderVal = getValue('Sales Order');
                          const dealIdVal = getValue('Deal ID');
                          const schoolNameVal = getValue('School Name');
                          const nucleusIdVal = getValue('Nucleus ID');
                          const orderTypeVal = getValue('Order Type');
                          const assetTypeVal = getValue('Asset Type');
                          const modelVal = getValue('Model');
                          const configVal = getValue('Configuration');
                          const productVal = getValue('Product');
                          const sdCardVal = getValue('SD Card Size');
                          const profileVal = getValue('Profile ID');
                          const locationVal = getValue('Location');
                          const quantityStr = getValue('Quantity');
                          const serialVal = getValue('Serial Number');
                          const statusVal = getValue('Asset Status') || '';
                          const groupVal = getValue('Asset Group') || '';
                          const quantityVal = parseInt(quantityStr) || (serialVal ? 1 : 0);
                          if (!locationVal || !assetTypeVal) {
                            errors.push({ values, error: 'Location and Asset Type are required' });
                            continue;
                          }
                          if (assetTypes.includes(assetTypeVal as any) && !modelVal) {
                            errors.push({ values, error: `Model is required for ${assetTypeVal} assets` });
                            continue;
                          }
                          if (additionalAssetTypes.includes(assetTypeVal) && hasModels(assetTypeVal) && !modelVal) {
                            errors.push({ values, error: `Model is required for ${assetTypeVal} assets` });
                            continue;
                          }
                          const groupingKey = [
                            assetTypeVal || '',
                            modelVal || '',
                            configVal || '',
                            productVal || '',
                            sdCardVal || '',
                            profileVal || '',
                            locationVal || '',
                          ]
                            .join('_')
                            .replace(/[^a-zA-Z0-9_-]/g, '_');
                          if (!groupedAssets[groupingKey]) {
                            groupedAssets[groupingKey] = {
                              id: generateId(),
                              assetType: assetTypeVal,
                              model: modelVal,
                              configuration: configVal,
                              product: productVal,
                              sdCardSize: assetTypeVal === 'SD Card' ? modelVal : sdCardVal,
                              profileId: profileVal,
                              quantity: 0,
                              location: locationVal,
                              serialNumbers: [],
                              assetStatuses: [],
                              assetGroups: [],
                              asset_conditions: [],
                              farCodes: [],
                              hasSerials: !!serialVal || defaultHasSerials(assetTypeVal),
                              lastFetchedOrderType: undefined,
                            };
                          }
                          const currentAsset = groupedAssets[groupingKey];
                          if (quantityVal > 0 && !serialVal) {
                            currentAsset.quantity += quantityVal;
                          } else if (serialVal) {
                            currentAsset.quantity += 1;
                            currentAsset.serialNumbers.push(serialVal);
                            currentAsset.assetStatuses.push(statusVal);
                            currentAsset.assetGroups.push(groupVal);
                            currentAsset.asset_conditions.push('');
                            currentAsset.farCodes.push('');
                          }
                          if (currentAsset.farCodes.length === 0 && currentAsset.quantity > 0) {
                            const uniformFar = '';
                            currentAsset.farCodes = Array(currentAsset.quantity).fill(uniformFar);
                          }
                          if (salesOrderVal && !salesOrder) setSalesOrder(salesOrderVal);
                          if (dealIdVal && !dealId) setDealId(dealIdVal);
                          if (schoolNameVal && !schoolName) setSchoolName(schoolNameVal);
                          if (nucleusIdVal && !nucleusId) setNucleusId(nucleusIdVal);
                          if (orderTypeVal && !orderType) setOrderType(orderTypeVal);
                        } catch (rowError) {
                          errors.push({
                            values: parseCsvLine(lines[i]),
                            error: `Row parsing error: ${rowError.message}`,
                          });
                        }
                      }
                      const newAssets = Object.values(groupedAssets).map(asset => ({
                        ...asset,
                        quantity: asset.serialNumbers.length || asset.quantity,
                        serialNumbers: asset.serialNumbers.length ? asset.serialNumbers : Array(asset.quantity).fill(''),
                        assetStatuses: asset.assetStatuses.length ? asset.assetStatuses : Array(asset.quantity).fill(asset.assetStatuses[0] || ''),
                        assetGroups: asset.assetGroups.length ? asset.assetGroups : Array(asset.quantity).fill(asset.assetGroups[0] || ''),
                        asset_conditions: Array(asset.quantity).fill(''),
                        farCodes: asset.farCodes.length ? asset.farCodes : Array(asset.quantity).fill(''),
                      }));
                      if (errors.length > 0) {
                        const confirmDownload = window.confirm(`There are ${errors.length} errors. Download error CSV? (OK to download, Cancel to skip)`);
                        if (confirmDownload) {
                          const quoteCsvValue = (value) => {
                            const str = String(value || '');
                            const needsQuotes = /["\n\r,]/u.test(str) || str.trimStart() !== str || str.trimEnd() !== str;
                            const escaped = str.replace(/"/g, '""');
                            return needsQuotes ? `"${escaped}"` : escaped;
                          };
                          let errorCsv = [...headers, 'Error'].map(quoteCsvValue).join(',') + '\n';
                          errors.forEach(({ values, error }) => {
                            const row = [...values.slice(0, headers.length), error].map(quoteCsvValue).join(',');
                            errorCsv += row + '\n';
                          });
                          const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                          const blob = new Blob([bom, errorCsv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'bulk_upload_errors.csv';
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                        if (newAssets.length > 0) {
                          setAssets(prevAssets => [...prevAssets, ...newAssets]);
                          toast({
                            title: 'Partial Success',
                            description: `Imported ${newAssets.length} assets from CSV (${errors.length} errors)`,
                          });
                        }
                      } else {
                        setAssets(prevAssets => [...prevAssets, ...newAssets]);
                        toast({
                          title: 'Success',
                          description: `Imported ${newAssets.length} assets from CSV`,
                        });
                      }
                    } catch (error) {
                      console.error('CSV Processing Error:', error);
                      toast({
                        title: 'Error',
                        description: `Failed to parse CSV file. Please check format. Details: ${error.message}`,
                        variant: 'destructive',
                      });
                    }
                  };
                  reader.readAsText(file, 'utf-8');
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Update Asset Details (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Update (CSV)</label>
                <button
                  onClick={() => {
                    const headers = ['Serial number', 'Asset group', 'FAR Code'];
                    const rows = [
                      ['SN001', '', ''],
                      ['SN002', '', '']
                    ];
                    const quoteCsvValue = (value) => {
                      const str = String(value || '');
                      const needsQuotes = /["\n\r,]/u.test(str) || str.trimStart() !== str || str.trimEnd() !== str;
                      const escaped = str.replace(/"/g, '""');
                      return needsQuotes ? `"${escaped}"` : escaped;
                    };
                    const csvTemplate = headers.map(quoteCsvValue).join(',') + '\n' + rows.map(row => row.map(quoteCsvValue).join(',')).join('\n');
                    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                    const blob = new Blob([bom, csvTemplate], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'asset_details_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                >
                  Download Template
                </button>
              </div>
              {progress && (
                <div style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '8px' }}>
                  {progress}
                </div>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    try {
                      const text = evt.target?.result as string;
                      const lines = text.trim().split('\n').filter(line => line.trim());
                      if (lines.length < 1) throw new Error('CSV must contain at least a header row');
                      const parseCsvLine = (line: string) => {
                        const values: string[] = [];
                        let current = '';
                        let inQuotes = false;
                        let i = 0;
                        while (i < line.length) {
                          const char = line[i];
                          if (char === '"') {
                            if (inQuotes) {
                              if (i + 1 < line.length && line[i + 1] === '"') {
                                current += '"';
                                i++;
                              } else {
                                inQuotes = false;
                              }
                            } else {
                              inQuotes = true;
                            }
                          } else if (char === ',' && !inQuotes) {
                            values.push(current);
                            current = '';
                          } else {
                            current += char;
                          }
                          i++;
                        }
                        values.push(current);
                        return values.map(v => {
                          if (v.startsWith('"') && v.endsWith('"')) {
                            v = v.slice(1, -1);
                          }
                          return v.replace(/""/g, '"');
                        });
                      };
                      const headers = parseCsvLine(lines[0]);
                      const expectedHeaders = ['Serial number', 'Asset group', 'FAR Code'];
                  
                      if (headers.length !== expectedHeaders.length || !headers.every((h, i) => h.trim() === expectedHeaders[i])) {
                        throw new Error('CSV header mismatch. Please use the provided template.');
                      }
                      const errors: { values: string[], error: string }[] = [];
                      const updatedSerials: string[] = [];
                      const totalRows = lines.length - 1;
                      for (let i = 1; i < lines.length; i++) {
                        setProgress(`Updating ${i}/${totalRows}`);
                        const values = parseCsvLine(lines[i]);
                        if (values.length !== headers.length) {
                          errors.push({ values: [...values, ...Array(headers.length - values.length).fill('')], error: 'Incorrect number of columns' });
                          continue;
                        }
                        const getValue = (headerName: string) => {
                          const index = headers.indexOf(headerName);
                          return index !== -1 ? (values[index] || '').trim() : '';
                        };
                        const serial = getValue('Serial number');
                        const asset_group = getValue('Asset group');
                        const far_code = getValue('FAR Code');
                        if (!serial) {
                          errors.push({ values, error: 'Missing serial number' });
                          continue;
                        }
                        const { data: deviceData, error: fetchError } = await supabase
                          .from('devices')
                          .select('*')
                          .eq('serial_number', serial)
                          .eq('is_deleted', false)
                          .order('updated_at', { ascending: false })
                          .limit(1);
                        if (fetchError || !deviceData || deviceData.length === 0) {
                          errors.push({ values, error: 'Serial number not available' });
                          continue;
                        }
                        const device = deviceData[0];
                        if (device.material_type !== 'Inward') {
                          errors.push({ values, error: 'Not inward material type' });
                          continue;
                        }
                        const { error: updateError } = await supabase
                          .from('devices')
                          .update({
                            asset_group,
                            far_code: far_code ? Number(far_code) : null,
                            updated_at: new Date().toISOString(),
                            updated_by: userEmail,
                          })
                          .eq('id', device.id);
                        if (updateError) {
                          errors.push({ values, error: `Update failed: ${updateError.message}` });
                        } else {
                          updatedSerials.push(serial);
                        }
                      }
                      setProgress(null);
                      if (errors.length > 0) {
                        const confirmDownload = window.confirm(
                          `There are ${errors.length} errors. Download error CSV? (OK to download, Cancel to skip)`
                        );
                        if (confirmDownload) {
                          const quoteCsvValue = (value) => {
                            const str = String(value || '');
                            const needsQuotes = /["\n\r,]/u.test(str) || str.trimStart() !== str || str.trimEnd() !== str;
                            const escaped = str.replace(/"/g, '""');
                            return needsQuotes ? `"${escaped}"` : escaped;
                          };
                          let errorCsv = [...headers, 'Error'].map(quoteCsvValue).join(',') + '\n';
                          errors.forEach(({ values, error }) => {
                            const row = [...values, error].map(quoteCsvValue).join(',');
                            errorCsv += row + '\n';
                          });
                          const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                          const blob = new Blob([bom, errorCsv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'update_errors.csv';
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }
                      toast({ title: 'Success', description: `Updated ${updatedSerials.length} devices successfully` });
                      if (updatedSerials.length > 0) {
                        await loadDevices();
                      }
                    } catch (error) {
                      setProgress(null);
                      toast({ title: 'Error', description: `Failed to process update CSV. Please check format. Details: ${error.message}`, variant: 'destructive' });
                    }
                  };
                  reader.readAsText(file, 'utf-8');
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Create / Update Order Button */}
      <button
        onClick={editMode ? updateOrder : createOrder}
        disabled={loading || assets.length === 0}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          borderRadius: '4px',
          background: loading || assets.length === 0 ? '#9ca3af' : '#3b82f6',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: loading || assets.length === 0 ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing...' : (editMode ? 'Update Order' : 'Create Order')}
      </button>
    </div>
  );
};

export default UnifiedAssetForm;