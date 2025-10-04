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

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    alert(`${title}: ${description}`);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const generateSalesOrder = () => {
    const digit = Math.floor(Math.random() * 10);
    const randomString = Math.random().toString(36).substr(2, 5);
    return `SO-${digit}-${randomString}`;
  };

  const defaultHasSerials = (assetType: string) => {
    return ['Tablet', 'TV', 'Pendrive'].includes(assetType);
  };

  const addAsset = (assetType: string) => {
    const hasSerials = defaultHasSerials(assetType);
    const newAsset: AssetItem = {
      id: generateId(),
      assetType,
      model: assetType === 'SD Card' ? '' : undefined,
      configuration: assetType === 'SD Card' ? undefined : '',
      product: assetType === 'SD Card' ? undefined : '',
      sdCardSize: assetType === 'SD Card' ? '' : undefined,
      profileId: assetType === 'SD Card' ? '' : undefined,
      size: assetType === 'Pendrive' ? '' : undefined,
      material: assetType === 'Other' ? '' : undefined,
      quantity: 1,
      location: '',
      serialNumbers: hasSerials ? [''] : [],
      assetStatuses: ['Fresh'],
      assetGroups: ['NFA'],
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
          const newSerialNumbers = asset.hasSerials ? Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '') : [];
          let newAssetStatuses;
          let newAssetGroups;
          if (asset.hasSerials) {
            newAssetStatuses = Array(newQuantity).fill('Fresh').map((_, i) => currentStatuses[i] || 'Fresh');
            newAssetGroups = Array(newQuantity).fill('NFA').map((_, i) => currentGroups[i] || 'NFA');
          } else {
            const defaultStatus = currentStatuses[0] || 'Fresh';
            const defaultGroup = currentGroups[0] || 'NFA';
            newAssetStatuses = Array(newQuantity).fill(defaultStatus);
            newAssetGroups = Array(newQuantity).fill(defaultGroup);
          }
          return { ...asset, quantity: newQuantity, serialNumbers: newSerialNumbers, assetStatuses: newAssetStatuses, assetGroups: newAssetGroups };
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
            return { ...asset, hasSerials: newHasSerials, serialNumbers: newSerialNumbers, assetStatuses: uniformStatuses, assetGroups: uniformGroups };
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

      // Check for duplicates within the form
      for (let i = 0; i < asset.serialNumbers.length; i++) {
        const serial = asset.serialNumbers[i]?.trim();
        if (serial && allSerials.filter(s => s === serial).length > 1) {
          serialErrors[i] = 'Duplicate within order';
        }
      }

      // Validate against database
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
            } else if (!serial) {
              serialErrors[i] = 'Serial number required';
            }
          }
        } else {
          console.error('Validation error:', deviceError);
          for (let i = 0; i < asset.serialNumbers.length; i++) {
            if (!asset.serialNumbers[i]?.trim()) {
              serialErrors[i] = 'Serial number required';
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

  const createOrderFromData = async (orderData: { orderType: string; salesOrder: string; dealId: string; nucleusId: string; schoolName: string }, assetsData: AssetItem[]) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Failed to retrieve authenticated user email');
      }
      const userEmail = userData.user.email;
      const materialType = ['Stock', 'Return'].includes(orderData.orderType) ? 'Inward' : 'Outward';

      for (const asset of assetsData) {
        const salesOrderId = orderData.salesOrder || generateSalesOrder();
        const assetSerials = asset.hasSerials ? asset.serialNumbers.filter(sn => sn && sn.trim()) : [];

        // Determine model based on asset type
        let model = '';
        if (asset.assetType === 'Tablet' || asset.assetType === 'TV' || asset.assetType === 'Cover') {
          model = asset.model || '';
        } else if (asset.assetType === 'SD Card') {
          model = asset.sdCardSize || '';
        } else if (asset.assetType === 'Pendrive') {
          model = asset.size || '';
        } else if (asset.assetType === 'Other') {
          model = asset.material || '';
        }

        const { data: orderDbData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: orderData.orderType,
            material_type: materialType,
            asset_type: asset.assetType,
            model: model,
            quantity: asset.quantity,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: orderData.dealId || null,
            school_name: orderData.schoolName,
            nucleus_id: orderData.nucleusId || null,
            serial_numbers: assetSerials,
            order_date: new Date().toISOString(),
            configuration: asset.configuration || null,
            product: asset.product || null,
            sd_card_size: asset.sdCardSize || null,
            profile_id: asset.profileId || null,
            created_by: userEmail,
            updated_by: userEmail,
          })
          .select()
          .single();

        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);

        // Create devices
        for (let i = 0; i < asset.quantity; i++) {
          const serialNumber = asset.hasSerials ? (asset.serialNumbers[i] || '') : null;
          const assetStatus = asset.assetStatuses[i] || 'Fresh';
          const assetGroup = asset.assetGroups[i] || 'NFA';

          await supabase.from('devices').insert({
            asset_type: asset.assetType,
            model: model,
            serial_number: serialNumber,
            warehouse: asset.location,
            sales_order: salesOrderId,
            deal_id: orderData.dealId || null,
            school_name: orderData.schoolName,
            nucleus_id: orderData.nucleusId || null,
            status: materialType === 'Inward' ? 'Available' : 'Assigned',
            material_type: materialType,
            order_id: orderDbData.id,
            configuration: asset.configuration || null,
            product: asset.product || null,
            sd_card_size: asset.sdCardSize || null,
            profile_id: asset.profileId || null,
            asset_status: assetStatus,
            asset_group: assetGroup,
            created_by: userEmail,
            updated_by: userEmail,
          });
        }

        await logHistory('orders', orderDbData.id, 'order_type', orderData.orderType, userEmail, salesOrderId);
      }

      toast({ title: 'Success', description: 'Orders created successfully' });
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    await createOrderFromData({ orderType, salesOrder, dealId, nucleusId, schoolName }, assets);
    setAssets([]);
    setSalesOrder('');
    setDealId('');
    setNucleusId('');
    setSchoolName('');
    setLoading(false);
  };

  const downloadTemplate = () => {
    const headers = 'order_type,school_name,sales_order,deal_id,nucleus_id,asset_type,model,configuration,product,sd_card_size,profile_id,size,material,quantity,location,serial_numbers,asset_statuses,asset_groups\n';
    const example = 'Stock,Example School,SO-123,DEAL-456,NUC-789,Tablet,ModelX,Config1,ProductA,32GB,Profile123,,,1,Location1,Serial001,Fresh,NFA\n';
    const csvContent = headers + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast({ title: 'Error', description: 'Invalid CSV file', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as Record<string, string>);
      });

      // Group rows by sales_order, or deal_id, or school_name
      const groups: Record<string, { orderData: { orderType: string; salesOrder: string; dealId: string; nucleusId: string; schoolName: string }; assets: AssetItem[] }> = {};

      rows.forEach(row => {
        let key = row.sales_order;
        if (!key) key = row.deal_id;
        if (!key) key = row.school_name;
        if (!key) return; // skip invalid row

        if (!groups[key]) {
          groups[key] = {
            orderData: {
              orderType: row.order_type,
              salesOrder: row.sales_order,
              dealId: row.deal_id,
              nucleusId: row.nucleus_id,
              schoolName: row.school_name,
            },
            assets: [],
          };
        }

        const assetType = row.asset_type;
        const quantity = parseInt(row.quantity) || 1;
        const hasSerials = !!row.serial_numbers || ['Tablet', 'TV'].includes(assetType);
        const serialNumbers = row.serial_numbers ? row.serial_numbers.split(',').map(s => s.trim()) : (hasSerials ? Array(quantity).fill('') : []);
        const assetStatuses = row.asset_statuses ? row.asset_statuses.split(',').map(s => s.trim()) : Array(quantity).fill('Fresh');
        const assetGroups = row.asset_groups ? row.asset_groups.split(',').map(g => g.trim()) : Array(quantity).fill('NFA');

        // Adjust lengths if mismatch
        if (hasSerials && serialNumbers.length !== quantity) {
          toast({ title: 'Error', description: `Serial numbers count mismatch for row with asset_type ${assetType}`, variant: 'destructive' });
          return;
        }
        if (assetStatuses.length !== quantity) assetStatuses = Array(quantity).fill(assetStatuses[0] || 'Fresh');
        if (assetGroups.length !== quantity) assetGroups = Array(quantity).fill(assetGroups[0] || 'NFA');

        groups[key].assets.push({
          id: generateId(),
          assetType,
          model: row.model,
          configuration: row.configuration,
          product: row.product,
          sdCardSize: row.sd_card_size,
          profileId: row.profile_id,
          size: row.size,
          material: row.material,
          quantity,
          location: row.location,
          serialNumbers,
          assetStatuses,
          assetGroups,
          hasSerials,
        });
      });

      // Process each group
      for (const group of Object.values(groups)) {
        await createOrderFromData(group.orderData, group.assets);
      }

      setLoading(false);
    };
    reader.readAsText(file);
  };

  const renderAssetFields = (asset: AssetItem) => {
    const isMandatorySerial = ['Tablet', 'TV'].includes(asset.assetType);
    const showSerialSection = isMandatorySerial || asset.hasSerials;

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
          {/* SD Card Fields */}
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
                <select
                  value={asset.profileId || ''}
                  onChange={(e) => updateAsset(asset.id, 'profileId', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="">Select Profile</option>
                  {profileIds.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Tablet Fields */}
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
            </>
          )}

          {/* TV Fields */}
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

          {/* Cover Fields */}
          {asset.assetType === 'Cover' && (
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
          )}

          {/* Pendrive Fields */}
          {asset.assetType === 'Pendrive' && (
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
          )}

          {/* Other Fields */}
          {asset.assetType === 'Other' && (
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
          )}

          {/* Common Fields */}
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
            </>
          )}
        </div>

        {/* Serial Numbers Section */}
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
                      flex: 1,
                      padding: '8px',
                      border: `1px solid ${assetErrors[asset.id]?.[index] ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={() => openScanner(asset.id, index, asset.assetType)}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  >
                    <Camera size={16} />
                  </button>
                  <select
                    value={asset.assetStatuses[index] || 'Fresh'}
                    onChange={(e) => {
                      const newStatuses = [...asset.assetStatuses];
                      newStatuses[index] = e.target.value;
                      updateAsset(asset.id, 'assetStatuses', newStatuses);
                    }}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
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
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  >
                    {assetGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
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

      {/* Bulk Upload and Template Download */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <button
          onClick={downloadTemplate}
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
          Download Template
        </button>
        <input
          type="file"
          accept=".csv"
          onChange={handleBulkUpload}
          style={{ padding: '8px' }}
        />
      </div>

      {/* Order Details */}
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

      {/* Asset Type Selection */}
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

      {/* Assets List */}
      <div>
        {assets.map(asset => renderAssetFields(asset))}
      </div>

      {/* Submit Button */}
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