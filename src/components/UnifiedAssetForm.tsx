import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Camera } from 'lucide-react';
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
  otherMaterials,
  locations,
  assetStatuses,
  assetGroups,
  assetTypes,
  profileIds,
} from './constants';

interface AssetItem {
  id: string;
  assetType: string;
  model?: string;
  configuration?: string;
  product?: string;
  sdCardSize?: string;
  profileId?: string;
  size?: string;
  material?: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroups: string[];
  asset_conditions: string[];
  hasSerials: boolean;
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

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    alert(`${title}: ${description}`);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    fetchUser();
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const generateSalesOrder = () => {
    const digits = Math.floor(1000 + Math.random() * 9000);
    const letters = Math.random().toString(36).substr(2, 2).toUpperCase();
    const finalDigits = Math.floor(10 + Math.random() * 90);
    return `${digits}${letters}${finalDigits}`;
  };

  const defaultHasSerials = (assetType: string) => {
    return ['Tablet', 'TV', 'Pendrive'].includes(assetType);
  };

  const addAsset = (assetType: string) => {
    const hasSerials = defaultHasSerials(assetType);
    const newAsset: AssetItem = {
      id: generateId(),
      assetType,
      model: '',
      configuration: '',
      product: '',
      sdCardSize: '',
      profileId: '',
      size: '',
      material: '',
      quantity: 1,
      location: '',
      serialNumbers: hasSerials ? [''] : [],
      assetStatuses: ['Fresh'],
      assetGroups: ['NFA'],
      asset_conditions: [''],
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
          const newSerialNumbers = asset.hasSerials ? Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '') : [];
          let newAssetStatuses;
          let newAssetGroups;
          let newAssetConditions;
          if (asset.hasSerials) {
            newAssetStatuses = Array(newQuantity).fill('Fresh').map((_, i) => currentStatuses[i] || 'Fresh');
            newAssetGroups = Array(newQuantity).fill('NFA').map((_, i) => currentGroups[i] || 'NFA');
            newAssetConditions = Array(newQuantity).fill('').map((_, i) => currentConditions[i] || '');
          } else {
            const defaultStatus = currentStatuses[0] || 'Fresh';
            const defaultGroup = currentGroups[0] || 'NFA';
            const defaultCondition = currentConditions[0] || '';
            newAssetStatuses = Array(newQuantity).fill(defaultStatus);
            newAssetGroups = Array(newQuantity).fill(defaultGroup);
            newAssetConditions = Array(newQuantity).fill(defaultCondition);
          }
          return { ...asset, quantity: newQuantity, serialNumbers: newSerialNumbers, assetStatuses: newAssetStatuses, assetGroups: newAssetGroups, asset_conditions: newAssetConditions };
        }
        if (field === 'hasSerials') {
          const newHasSerials = value;
          let newSerialNumbers = asset.serialNumbers;
          if (newHasSerials && newSerialNumbers.length === 0) {
            newSerialNumbers = Array(asset.quantity).fill('');
          } else if (!newHasSerials) {
            newSerialNumbers = [];
          }
          if (!newHasSerials) {
            const uniformStatuses = Array(asset.quantity).fill(asset.assetStatuses[0] || 'Fresh');
            const uniformGroups = Array(asset.quantity).fill(asset.assetGroups[0] || 'NFA');
            const uniformConditions = Array(asset.quantity).fill(asset.asset_conditions[0] || '');
            return { ...asset, hasSerials: newHasSerials, serialNumbers: newSerialNumbers, assetStatuses: uniformStatuses, assetGroups: uniformGroups, asset_conditions: uniformConditions };
          } else {
            return { ...asset, hasSerials: newHasSerials, serialNumbers: newSerialNumbers };
          }
        }
        return { ...asset, [field]: value };
      }
      return asset;
    }));
  };

  const removeAsset = (id: string) => setAssets(assets.filter(asset => asset.id !== id));

  const validateSerials = async () => {
    const errors: Record<string, (string | null)[]> = {};
    const isInward = ['Stock', 'Return'].includes(orderType);

    for (const asset of assets) {
      if (!asset.hasSerials) {
        errors[asset.id] = [];
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
          .select('*')
          .eq('asset_type', asset.assetType)
          .in('serial_number', allSerials)
          .order('updated_at', { ascending: false });

        if (!deviceError && deviceData) {
          const latestBySerial: Record<string, any> = {};
          deviceData.forEach((device: any) => {
            if (!device.is_deleted && (!latestBySerial[device.serial_number] || new Date(device.updated_at) > new Date(latestBySerial[device.serial_number].updated_at))) {
              latestBySerial[device.serial_number] = device;
            }
          });

          if (!isInward) {
            const newStatuses = [...asset.assetStatuses];
            const newGroups = [...asset.assetGroups];
            let updated = false;

            for (let i = 0; i < asset.serialNumbers.length; i++) {
              const serial = asset.serialNumbers[i]?.trim();
              if (serial) {
                const latestDevice = latestBySerial[serial];
                if (latestDevice && latestDevice.material_type === 'Inward') {
                  if (newStatuses[i] === 'Fresh' || !newStatuses[i]) {
                    newStatuses[i] = latestDevice.asset_status || 'Fresh';
                    updated = true;
                  }
                  if (newGroups[i] === 'NFA' || !newGroups[i]) {
                    newGroups[i] = latestDevice.asset_group || 'NFA';
                    updated = true;
                  }
                }
              }
            }

            if (updated) {
              setAssets(prevAssets => prevAssets.map(a => 
                a.id === asset.id ? { ...a, assetStatuses: newStatuses, assetGroups: newGroups } : a
              ));
            }
          }

          for (let i = 0; i < asset.serialNumbers.length; i++) {
            const serial = asset.serialNumbers[i]?.trim();
            if (serial && !serialErrors[i]) {
              const latestDevice = latestBySerial[serial];
              if (latestDevice) {
                if (latestDevice.material_type === 'Outward') {
                  serialErrors[i] = `Currently Outward in ${latestDevice.warehouse}`;
                } else if (latestDevice.material_type === 'Inward') {
                  if (latestDevice.warehouse !== asset.location) {
                    serialErrors[i] = `In ${latestDevice.warehouse} stock`;
                  }
                }
              } else if (!isInward) {
                serialErrors[i] = 'Not in stock';
              }
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

  const validateForm = () => {
    if (!orderType) {
      toast({ title: 'Error', description: 'Please select an order type', variant: 'destructive' });
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

      if (asset.assetType === 'Tablet' && !asset.model) {
        toast({ title: 'Error', description: 'Tablet model is required', variant: 'destructive' });
        return false;
      }

      if (asset.assetType === 'TV' && !asset.model) {
        toast({ title: 'Error', description: 'TV model is required', variant: 'destructive' });
        return false;
      }

      if (asset.assetType === 'SD Card' && !asset.sdCardSize) {
        toast({ title: 'Error', description: 'SD Card size is required', variant: 'destructive' });
        return false;
      }

      if (asset.assetType === 'Cover' && !asset.model) {
        toast({ title: 'Error', description: 'Cover model is required', variant: 'destructive' });
        return false;
      }

      if (asset.assetType === 'Pendrive' && !asset.size) {
        toast({ title: 'Error', description: 'Pendrive size is required', variant: 'destructive' });
        return false;
      }

      if (asset.assetType === 'Other' && !asset.material) {
        toast({ title: 'Error', description: 'Material type is required for Other', variant: 'destructive' });
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
      operation: 'INSERT',
      updated_by: userEmail,
    });
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Failed to retrieve authenticated user email');
      }
      const userEmail = userData.user.email;
      const materialType = ['Stock', 'Return'].includes(orderType) ? 'Inward' : 'Outward';

      for (const asset of assets) {
        let salesOrderId = salesOrder;
        if (!salesOrderId) {
          if (dealId) {
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
        const assetSerials = asset.hasSerials ? asset.serialNumbers.filter(sn => sn && sn.trim()) : [];
        const assetStatuses = asset.assetStatuses || Array(asset.quantity).fill('Fresh');
        const assetGroups = asset.assetGroups || Array(asset.quantity).fill('NFA');
        const productArray = Array(asset.quantity).fill(asset.product || 'Lead');

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: orderType,
            material_type: materialType,
            asset_type: asset.assetType,
            model: asset.model || asset.sdCardSize || asset.size || asset.material || '',
            quantity: asset.quantity,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            serial_numbers: assetSerials,
            asset_statuses: assetStatuses,
            asset_groups: assetGroups,
            product: productArray,
            order_date: new Date().toISOString(),
            configuration: asset.configuration || null,
            sd_card_size: asset.sdCardSize || null,
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

          await supabase.from('devices').insert({
            asset_type: asset.assetType,
            model: asset.model || asset.sdCardSize || asset.size || asset.material || '',
            serial_number: serialNumber,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            status: materialType === 'Inward' ? 'Available' : 'Assigned',
            material_type: materialType,
            order_id: orderData.id,
            configuration: asset.configuration || null,
            product: asset.product || 'Lead',
            sd_card_size: asset.sdCardSize || null,
            profile_id: asset.profileId || null,
            size: asset.size || null,
            material: asset.material || null,
            asset_status: assetStatus,
            asset_group: assetGroup,
            asset_condition: assetCondition,
            far_code: null,
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
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderAssetFields = (asset: AssetItem) => {
    const isMandatorySerial = ['Tablet', 'TV'].includes(asset.assetType);
    const showSerialSection = isMandatorySerial || asset.hasSerials;
    const isInward = ['Stock', 'Return'].includes(orderType);
    const isOutward = !isInward;

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
                  value={asset.model || ''}
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
                  value={asset.model || ''}
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
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Size *</label>
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
                  value={asset.model || ''}
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
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Size *</label>
                <select
                  value={asset.size || ''}
                  onChange={(e) => updateAsset(asset.id, 'size', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Size</option>
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

          {asset.assetType === 'Other' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Material *</label>
                <select
                  value={asset.material || ''}
                  onChange={(e) => updateAsset(asset.id, 'material', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Material</option>
                  {otherMaterials.map(m => <option key={m} value={m}>{m}</option>)}
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
              {isInward ? (
                <>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Status</label>
                    <select
                      value={asset.assetStatuses[0] || 'Fresh'}
                      onChange={(e) => {
                        const newStatuses = Array(asset.quantity).fill(e.target.value);
                        updateAsset(asset.id, 'assetStatuses', newStatuses);
                      }}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                    >
                      {assetStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Group</label>
                    <select
                      value={asset.assetGroups[0] || 'NFA'}
                      onChange={(e) => {
                        const newGroups = Array(asset.quantity).fill(e.target.value);
                        updateAsset(asset.id, 'assetGroups', newGroups);
                      }}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                    >
                      {assetGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  {(asset.assetStatuses[0] || 'Fresh') === 'Scrap' && (
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
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Status</label>
                    <input
                      type="text"
                      value={asset.assetStatuses[0] || 'Fresh'}
                      disabled
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset Group</label>
                    <input
                      type="text"
                      value={asset.assetGroups[0] || 'NFA'}
                      disabled
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6' }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {showSerialSection && (
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Serial Numbers</h5>
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
                    }}
                    placeholder={`Serial ${index + 1}`}
                    style={{
                      width: '200px',
                      padding: '8px',
                      border: `1px solid ${assetErrors[asset.id]?.[index] ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'none'
                    }}
                  />
                  <button
                    onClick={() => openScanner(asset.id, index, asset.assetType)}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  >
                    <Camera size={16} />
                  </button>
                  {isInward && (
                    <>
                      <select
                        value={asset.assetStatuses[index] || 'Fresh'}
                        onChange={(e) => {
                          const newStatuses = [...asset.assetStatuses];
                          newStatuses[index] = e.target.value;
                          updateAsset(asset.id, 'assetStatuses', newStatuses);
                        }}
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', resize: 'none' }}
                      >
                        {assetStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        value={asset.assetGroups[index] || 'NFA'}
                        onChange={(e) => {
                          const newGroups = [...asset.assetGroups];
                          newGroups[index] = e.target.value;
                          updateAsset(asset.id, 'assetGroups', newGroups);
                        }}
                        style={{ width: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', resize: 'none' }}
                      >
                        {assetGroups.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {asset.assetStatuses[index] === 'Scrap' && (
                        <input
                          type="text"
                          value={asset.asset_conditions[index] || ''}
                          onChange={(e) => {
                            const newConditions = [...asset.asset_conditions];
                            newConditions[index] = e.target.value;
                            updateAsset(asset.id, 'asset_conditions', newConditions);
                          }}
                          placeholder="Asset Condition"
                          style={{ width: '200px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', resize: 'none' }}
                        />
                      )}
                    </>
                  )}
                  {isOutward && (
                    <>
                      <input
                        type="text"
                        value={asset.assetStatuses[index] || 'Fresh'}
                        disabled
                        style={{ width: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6', resize: 'none' }}
                      />
                      <input
                        type="text"
                        value={asset.assetGroups[index] || 'NFA'}
                        disabled
                        style={{ width: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', background: '#f3f4f6', resize: 'none' }}
                      />
                    </>
                  )}
                  {assetErrors[asset.id]?.[index] && (
                    <span style={{ color: '#ef4444', fontSize: '12px' }}>{assetErrors[asset.id][index]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const quoteCsvValue = (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Create Order</h2>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Order Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Order Type *</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">Select Order Type</option>
              {orderTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Sales Order</label>
            <input
              type="text"
              value={salesOrder}
              onChange={(e) => setSalesOrder(e.target.value)}
              placeholder="Auto-generated if empty"
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>School Name *</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Deal ID</label>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nucleus ID</label>
            <input
              type="text"
              value={nucleusId}
              onChange={(e) => setNucleusId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Add Assets</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {assetTypes.map(type => (
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
                cursor: 'pointer'
              }}
            >
              + {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        {assets.map(asset => renderAssetFields(asset))}
      </div>

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
            cursor: 'pointer' 
          }}
        >
          {showBulk ? 'Hide Bulk Operations' : 'Bulk Operations'}
        </button>
      </div>

      {showBulk && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {/* Bulk Upload Section */}
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Upload (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Upload (CSV)</label>
                <button
                  onClick={() => {
                    const headers = ['Sales Order', 'Deal ID', 'School Name', 'Nucleus ID', 'Order Type', 'Asset Type', 'Model', 'Configuration', 'Product', 'SD Card Size', 'Profile ID', 'Size', 'Material', 'Location', 'Quantity', 'Serial Number', 'Asset Status', 'Asset Group'];
                    const rows = [
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Tablet', 'Lenovo TB301XU', '2G+32 GB (Android-10)', 'Lead', '128 GB', 'Profile 1', '', '', 'Trichy', '1', 'SN001', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Stock', 'TV', 'Hyundai TV - 43"', 'Smart TV', 'Propel', '', '', '', '', 'Bangalore', '1', 'SN003', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'SD Card', '', '', '', '256 GB', 'Profile 2', '', '', 'Hyderabad', '5', '', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Cover', 'M8 Flap Cover 4th gen - Lead', '', 'Lead', '', '', '', '', 'Trichy', '3', '', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Pendrive', '', '', '', '', '', '32 GB', '', 'Kolkata', '1', 'SN004', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Other', '', '', 'Lead', '', '', '', 'Dongle', 'Indore', '1', '', 'Fresh', 'NFA']
                    ];
                    const csvTemplate = headers.map(quoteCsvValue).join(',') + '\n' + rows.map(row => row.map(quoteCsvValue).join(',')).join('\n');
                    const blob = new Blob([csvTemplate], { type: 'text/csv' });
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
                      const lines = text.split('\n').filter(line => line.trim());
                      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                      const newAssets: AssetItem[] = [];
                      for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
                        const salesOrderVal = values[headers.indexOf('Sales Order')];
                        const dealIdVal = values[headers.indexOf('Deal ID')];
                        const schoolNameVal = values[headers.indexOf('School Name')];
                        const nucleusIdVal = values[headers.indexOf('Nucleus ID')];
                        const orderTypeVal = values[headers.indexOf('Order Type')];
                        const assetTypeVal = values[headers.indexOf('Asset Type')];
                        const modelVal = values[headers.indexOf('Model')];
                        const configVal = values[headers.indexOf('Configuration')];
                        const productVal = values[headers.indexOf('Product')];
                        const sdCardVal = values[headers.indexOf('SD Card Size')];
                        const profileVal = values[headers.indexOf('Profile ID')];
                        const sizeVal = values[headers.indexOf('Size')];
                        const materialVal = values[headers.indexOf('Material')];
                        const locationVal = values[headers.indexOf('Location')];
                        const quantityVal = parseInt(values[headers.indexOf('Quantity')]) || 1;
                        const serialVal = values[headers.indexOf('Serial Number')];
                        const statusVal = values[headers.indexOf('Asset Status')];
                        const groupVal = values[headers.indexOf('Asset Group')];

                        let quantity = quantityVal;
                        let serialNumbers: string[] = [];
                        let hasSerials = defaultHasSerials(assetTypeVal);
                        if (serialVal) {
                          serialNumbers = [serialVal];
                          quantity = 1;
                          hasSerials = true;
                        } else {
                          serialNumbers = hasSerials ? Array(quantity).fill('') : [];
                        }

                        newAssets.push({
                          id: generateId(),
                          assetType: assetTypeVal,
                          model: modelVal || '',
                          configuration: configVal || '',
                          product: productVal || '',
                          sdCardSize: sdCardVal || '',
                          profileId: profileVal || '',
                          size: sizeVal || '',
                          material: materialVal || '',
                          quantity: quantity,
                          location: locationVal,
                          serialNumbers,
                          assetStatuses: Array(quantity).fill(statusVal || 'Fresh'),
                          assetGroups: Array(quantity).fill(groupVal || 'NFA'),
                          asset_conditions: Array(quantity).fill(''),
                          hasSerials,
                        });

                        if (salesOrderVal && !salesOrder) {
                          setSalesOrder(salesOrderVal);
                        }
                        if (dealIdVal && !dealId) {
                          setDealId(dealIdVal);
                        }
                        if (schoolNameVal && !schoolName) {
                          setSchoolName(schoolNameVal);
                        }
                        if (nucleusIdVal && !nucleusId) {
                          setNucleusId(nucleusIdVal);
                        }
                        if (orderTypeVal && !orderType) {
                          setOrderType(orderTypeVal);
                        }
                      }

                      setAssets([...assets, ...newAssets]);
                      toast({ title: 'Success', description: `Imported ${newAssets.length} assets from CSV` });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to parse CSV file. Please check format.', variant: 'destructive' });
                    }
                  };
                  reader.readAsText(file);
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Bulk Update Section */}
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Update Asset Group and FAR Code (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Update (CSV)</label>
                <button
                  onClick={() => {
                    const headers = ['Serial number', 'Location', 'Asset group', 'FAR Code'];
                    const rows = [
                      ['SN001', 'Trichy', 'NFA', 'FAR001'],
                      ['SN002', 'Bangalore', 'NFA', 'FAR002']
                    ];
                    const csvTemplate = headers.map(quoteCsvValue).join(',') + '\n' + rows.map(row => row.map(quoteCsvValue).join(',')).join('\n');
                    const blob = new Blob([csvTemplate], { type: 'text/csv' });
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
                      const lines = text.split('\n').filter(line => line.trim());
                      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                      const errors: { values: string[], error: string }[] = [];
                      const updatedSerials: string[] = [];

                      for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
                        const serial = values[headers.indexOf('Serial number')];
                        const location = values[headers.indexOf('Location')];
                        const asset_group = values[headers.indexOf('Asset group')];
                        const far_code = values[headers.indexOf('FAR Code')];

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

                        if (device.warehouse !== location) {
                          errors.push({ values, error: 'Location not matched' });
                          continue;
                        }

                        if (device.far_code) {
                          errors.push({ values, error: 'FAR Code already available' });
                          continue;
                        }

                        const { error: updateError } = await supabase
                          .from('devices')
                          .update({
                            asset_group,
                            far_code,
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

                      if (errors.length > 0) {
                        const confirmDownload = window.confirm(`There are ${errors.length} errors. Download error CSV? (OK to download, Cancel to skip)`);
                        if (confirmDownload) {
                          let errorCsv = [...headers, 'Error'].map(quoteCsvValue).join(',') + '\n';
                          errors.forEach(({ values, error }) => {
                            const row = [...values, error].map(quoteCsvValue).join(',');
                            errorCsv += row + '\n';
                          });
                          const blob = new Blob([errorCsv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'update_errors.csv';
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      } else {
                        toast({ title: 'Success', description: `Updated ${updatedSerials.length} devices successfully` });
                      }

                      await loadDevices();
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to process update CSV. Please check format.', variant: 'destructive' });
                    }
                  };
                  reader.readAsText(file);
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={createOrder}
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
        {loading ? 'Creating Order...' : 'Create Order'}
      </button>
    </div>
  );
};

export default UnifiedAssetForm;