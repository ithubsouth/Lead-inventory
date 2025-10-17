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
  const [progress, setProgress] = useState<string | null>(null);

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
      sdCardSize: assetType === 'SD Card' ? '' : undefined,
      profileId: '',
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
        if (field === 'model' && asset.assetType === 'SD Card') {
          return { ...asset, [field]: value, sdCardSize: value };
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

      if (['Tablet', 'TV', 'SD Card', 'Cover', 'Pendrive', 'Other'].includes(asset.assetType) && !asset.model) {
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

          await supabase.from('devices').insert({
            asset_type: asset.assetType,
            model: asset.model,
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
            sd_card_size: asset.assetType === 'SD Card' ? asset.model : asset.sdCardSize || null,
            profile_id: asset.profileId || null,
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

          {asset.assetType === 'Other' && (
            <>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Model *</label>
                <select
                  value={asset.model}
                  onChange={(e) => updateAsset(asset.id, 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Model</option>
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
        {assets.map(asset => renderAssetPages(asset))}
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
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Upload (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Upload (CSV)</label>
                <button
                  onClick={() => {
                    const headers = ['Sales Order', 'Deal ID', 'School Name', 'Nucleus ID', 'Order Type', 'Asset Type', 'Model', 'Configuration', 'Product', 'SD Card Size', 'Profile ID', 'Location', 'Quantity', 'Serial Number', 'Asset Status', 'Asset Group'];
                    const rows = [
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Tablet', 'Lenovo TB301XU', '4G+64 GB (Android-13)', 'Lead', '128 GB', 'Profile 1', 'Trichy', '3', 'SN001', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Tablet', 'Lenovo TB301XU', '4G+64 GB (Android-13)', 'Lead', '128 GB', 'Profile 1', 'Trichy', '', 'SN002', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Tablet', 'Lenovo TB301XU', '4G+64 GB (Android-13)', 'Lead', '128 GB', 'Profile 1', 'Trichy', '', 'SN003', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'TV', 'Hyundai TV - 43"', 'Smart TV', 'Propel', '', '', 'Bangalore', '1', 'SN004', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'SD Card', '256 GB', '', '', '', 'Profile 2', 'Hyderabad', '1', '', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Cover', 'M8 Flap Cover 4th gen - Lead', '', 'Lead', '', '', 'Trichy', '1', '', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Pendrive', '64 GB', '', 'Lead', '', '', 'Trichy', '1', 'SN005', 'Fresh', 'NFA'],
                      ['SO-1-abcde', 'DEAL123', 'School A', 'NUC001', 'Hardware', 'Other', 'Sample Material', '', 'Lead', '', '', 'Trichy', '1', '', 'Fresh', 'NFA'],
                    ];
                    const quoteCsvValue = (value) => {
                      const str = String(value || '');
                      const needsQuotes = /["\n\r,]/u.test(str) || str.trimStart() !== str || str.trimEnd() !== str;
                      const escaped = str.replace(/"/g, '""');
                      return needsQuotes ? `"${escaped}"` : escaped;
                    };
                    const csvTemplate = headers.map(quoteCsvValue).join(',') + '\n' + 
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
                        'Sales Order', 'Deal ID', 'School Name', 'Nucleus ID', 'Order Type', 
                        'Asset Type', 'Model', 'Configuration', 'Product', 'SD Card Size', 
                        'Profile ID', 'Location', 'Quantity', 'Serial Number', 'Asset Status', 'Asset Group'
                      ];
                      
                      if (headers.length !== expectedHeaders.length) {
                        throw new Error(`Expected ${expectedHeaders.length} columns, found ${headers.length}`);
                      }
                      if (!headers.every((h, i) => h.trim() === expectedHeaders[i])) {
                        throw new Error('CSV header mismatch. Please use the provided template.');
                      }

                      const errors: { values: string[], error: string }[] = [];
                      const groupedAssets: Record<string, any> = {};

                      for (let i = 1; i < lines.length; i++) {
                        try {
                          const values = parseCsvLine(lines[i]);
                          if (values.length !== headers.length) {
                            errors.push({ 
                              values: [...values, ...Array(headers.length - values.length).fill('')], 
                              error: `Expected ${headers.length} columns, found ${values.length}` 
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
                          const statusVal = getValue('Asset Status') || 'Fresh';
                          const groupVal = getValue('Asset Group') || 'NFA';

                          const quantityVal = parseInt(quantityStr) || (serialVal ? 1 : 0);

                          if (!locationVal || !assetTypeVal) {
                            errors.push({ values, error: 'Location and Asset Type are required' });
                            continue;
                          }

                          if (['TV', 'Tablet', 'SD Card', 'Cover', 'Pendrive', 'Other'].includes(assetTypeVal) && !modelVal) {
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
                            locationVal || ''
                          ].join('_').replace(/[^a-zA-Z0-9_-]/g, '_');

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
                              hasSerials: !!serialVal || defaultHasSerials(assetTypeVal),
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
                          }

                          if (currentAsset.serialNumbers.length === 0 && currentAsset.quantity > 0) {
                            if (!currentAsset.assetStatuses[0]) {
                              currentAsset.assetStatuses[0] = statusVal;
                            }
                            if (!currentAsset.assetGroups[0]) {
                              currentAsset.assetGroups[0] = groupVal;
                            }
                          }

                          if (salesOrderVal && !salesOrder) setSalesOrder(salesOrderVal);
                          if (dealIdVal && !dealId) setDealId(dealIdVal);
                          if (schoolNameVal && !schoolName) setSchoolName(schoolNameVal);
                          if (nucleusIdVal && !nucleusId) setNucleusId(nucleusIdVal);
                          if (orderTypeVal && !orderType) setOrderType(orderTypeVal);

                        } catch (rowError) {
                          errors.push({ 
                            values: parseCsvLine(lines[i]), 
                            error: `Row parsing error: ${rowError.message}` 
                          });
                        }
                      }

                      const newAssets = Object.values(groupedAssets).map(asset => ({
                        ...asset,
                        quantity: asset.serialNumbers.length || asset.quantity,
                        serialNumbers: asset.serialNumbers.length 
                          ? asset.serialNumbers 
                          : Array(asset.quantity).fill(''),
                        assetStatuses: asset.assetStatuses.length 
                          ? asset.assetStatuses 
                          : Array(asset.quantity).fill(asset.assetStatuses[0] || 'Fresh'),
                        assetGroups: asset.assetGroups.length 
                          ? asset.assetGroups 
                          : Array(asset.quantity).fill(asset.assetGroups[0] || 'NFA'),
                        asset_conditions: Array(asset.quantity).fill(''),
                      }));

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
                            description: `Imported ${newAssets.length} assets from CSV (${errors.length} errors)` 
                          });
                        }
                      } else {
                        setAssets(prevAssets => [...prevAssets, ...newAssets]);
                        toast({ 
                          title: 'Success', 
                          description: `Imported ${newAssets.length} assets from CSV` 
                        });
                      }

                    } catch (error) {
                      console.error('CSV Processing Error:', error);
                      toast({ 
                        title: 'Error', 
                        description: `Failed to parse CSV file. Please check format. Details: ${error.message}`, 
                        variant: 'destructive' 
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
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Bulk Update Asset Group and FAR Code (CSV)</h3>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Bulk Update (CSV)</label>
                <button
                  onClick={() => {
                    const headers = ['Serial number', 'Asset group', 'FAR Code'];
                    const rows = [
                      ['SN001', 'NFA', 'FAR001'],
                      ['SN002', 'NFA', 'FAR002']
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
                      const totalRows = lines.length - 1; // Exclude header

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

                        if (device.far_code) {
                          errors.push({ values, error: `FAR Code already available - Existing FAR Code is ${device.far_code}` });
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

                      setProgress(null); // Clear progress after completion

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
                      setProgress(null); // Clear progress on error
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