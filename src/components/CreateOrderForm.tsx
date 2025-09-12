import React, { useState } from 'react';
import { Plus, Minus, Trash2, Upload, Download, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TabletItem, TVItem } from './types';
import { generateDummyId } from './utils';

interface CreateOrderFormProps {
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
  tablets: TabletItem[];
  setTablets: (value: TabletItem[] | ((prev: TabletItem[]) => TabletItem[])) => void;
  tvs: TVItem[];
  setTvs: (value: TVItem[] | ((prev: TVItem[]) => TVItem[])) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  loadOrders: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrderSummary: () => Promise<void>;
  openScanner: (itemId: string, index: number, type: 'tablet' | 'tv') => void;
}

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({
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
  tablets,
  setTablets,
  tvs,
  setTvs,
  loading,
  setLoading,
  loadOrders,
  loadDevices,
  loadOrderSummary,
  openScanner,
}) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [Tablets, setTabletsToggle] = useState(false);
  const [TVs, setTVsToggle] = useState(false);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => {
    console.log(`Toast: ${title} - ${description}${variant ? ` (Variant: ${variant})` : ''}`);
    alert(`${title}: ${description}`);
  };

  const orderTypes = [
    'Hardware',
    'Additional Hardware',
    'Replacement Hardware (FOC)',
    'Replacement Hardware (CB)',
    'Exp Hub',
    'Stock Movement',
    'Employee',
    'Stock',
    'Return',
    'Other',
  ];
  const tabletModels = ['Lenovo TB301XU', 'Lenovo TB301FU', 'Lenovo TB-8505F', 'Lenovo TB-7306F', 'Lenovo TB-7306X', 'Lenovo TB-7305X', 'IRA T811'];
  const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];
  const configurations = [
    '1G+8 GB (Android-7)',
    '1G+16 GB (Android-9)',
    '1G+32 GB (Android-9)',
    '2G+16 GB (Android-9)',
    '2G+32 GB (Android-9)',
    '2G+32 GB (Android-10)',
    '3G+32 GB (Android-10)',
    '3G+32 GB (Android-13)',
    '4G+64 GB (Android-13)',
  ];
  const tvConfigurations = ['Non Smart TV', 'Smart TV', 'Android TV', 'Web OS'];
  const products = ['Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];
  const sdCardSizes = ['64 GB', '128 GB', '256 GB', '512 GB'];
  const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const assetStatuses = ['Fresh', 'Refurb', 'Scrap'];

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Generate sales order with format "SO-<digit>-<random-string>"
  const generateSalesOrder = () => {
    const digit = Math.floor(Math.random() * 10); // Random single digit 0-9
    const randomString = Math.random().toString(36).substr(2, 5); // 5-character random string
    return `SO-${digit}-${randomString}`;
  };

  const addTablet = () => {
    const newTablet: TabletItem = {
      id: generateId(),
      model: '',
      configuration: '',
      product: '',
      sdCardSize: '',
      profileId: '',
      quantity: 1,
      location: '',
      serialNumbers: [],
      assetStatuses: ['Fresh'],
    };
    setTablets([...tablets, newTablet]);
  };

  const addTV = () => {
    const newTV: TVItem = {
      id: generateId(),
      model: '',
      configuration: '',
      product: '',
      quantity: 1,
      location: '',
      serialNumbers: [],
      assetStatuses: ['Fresh'],
    };
    setTvs([...tvs, newTV]);
  };

  const updateTablet = (id: string, field: keyof TabletItem, value: string | number | string[]) => {
    setTablets(tablets.map(tablet => {
      if (tablet.id === id) {
        if (field === 'quantity' && typeof value === 'number') {
          const newQuantity = Math.max(1, value);
          const currentSerials = tablet.serialNumbers || [];
          const currentStatuses = tablet.assetStatuses || [];
          const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '');
          const newAssetStatuses = Array(newQuantity).fill('Fresh').map((_, i) => currentStatuses[i] || 'Fresh');
          return { ...tablet, quantity: newQuantity, serialNumbers: newSerialNumbers, assetStatuses: newAssetStatuses };
        } else if (field === 'serialNumbers' && Array.isArray(value)) {
          return { ...tablet, serialNumbers: value };
        } else if (field === 'assetStatuses' && Array.isArray(value)) {
          return { ...tablet, assetStatuses: value };
        }
        return { ...tablet, [field]: value };
      }
      return tablet;
    }));
  };

  const updateTV = (id: string, field: keyof TVItem, value: string | number | string[]) => {
    setTvs(tvs.map(tv => {
      if (tv.id === id) {
        if (field === 'quantity' && typeof value === 'number') {
          const newQuantity = Math.max(1, value);
          const currentSerials = tv.serialNumbers || [];
          const currentStatuses = tv.assetStatuses || [];
          const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '');
          const newAssetStatuses = Array(newQuantity).fill('Fresh').map((_, i) => currentStatuses[i] || 'Fresh');
          return { ...tv, quantity: newQuantity, serialNumbers: newSerialNumbers, assetStatuses: newAssetStatuses };
        } else if (field === 'serialNumbers' && Array.isArray(value)) {
          return { ...tv, serialNumbers: value };
        } else if (field === 'assetStatuses' && Array.isArray(value)) {
          return { ...tv, assetStatuses: value };
        }
        return { ...tv, [field]: value };
      }
      return tv;
    }));
  };

  const removeTablet = (id: string) => setTablets(tablets.filter(tablet => tablet.id !== id));
  const removeTV = (id: string) => setTvs(tvs.filter(tv => tv.id !== id));

  const validateForm = () => {
    if (!orderType) {
      toast({ title: 'Error', description: 'Please select an order type', variant: 'destructive' });
      return false;
    }
    if (!schoolName.trim()) {
      toast({ title: 'Error', description: 'School Name is required', variant: 'destructive' });
      return false;
    }
    if (!Tablets && !TVs) {
      toast({ title: 'Error', description: 'Please select at least one of Tablets or TVs', variant: 'destructive' });
      return false;
    }
    const validTablets = Tablets ? tablets.filter(t => t.model && t.location && t.quantity > 0) : [];
    const validTVs = TVs ? tvs.filter(t => t.model && t.location && t.quantity > 0) : [];

    if (Tablets && !validTablets.length && !validTVs.length) {
      toast({ title: 'Error', description: 'Please add at least one tablet with model, location, and quantity', variant: 'destructive' });
      return false;
    }
    if (TVs && !validTVs.length && !validTablets.length) {
      toast({ title: 'Error', description: 'Please add at least one TV with model, location, and quantity', variant: 'destructive' });
      return false;
    }

    for (const tablet of validTablets) {
      const validStatuses = tablet.assetStatuses.filter(status => assetStatuses.includes(status));
      if (validStatuses.length !== tablet.quantity) {
        toast({
          title: 'Validation Error',
          description: `Number of valid asset statuses (${validStatuses.length}) does not match quantity (${tablet.quantity}) for tablet order`,
          variant: 'destructive',
        });
        return false;
      }
    }

    for (const tv of validTVs) {
      const validStatuses = tv.assetStatuses.filter(status => assetStatuses.includes(status));
      if (validStatuses.length !== tv.quantity) {
        toast({
          title: 'Validation Error',
          description: `Number of valid asset statuses (${validStatuses.length}) does not match quantity (${tv.quantity}) for TV order`,
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get the authenticated user's email
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Failed to retrieve authenticated user email');
      }
      const userEmail = userData.user.email; // Get the user's email

      console.log('Creating order with:', { orderType, salesOrder, dealId, nucleusId, schoolName, tablets, tvs });
      const validTablets = Tablets ? tablets.filter(t => t.model && t.location && t.quantity > 0) : [];
      const validTVs = TVs ? tvs.filter(t => t.model && t.location && t.quantity > 0) : [];
      const materialType = (orderType === 'Stock' || orderType === 'Return') ? 'Inward' : 'Outward';

      for (const tablet of validTablets) {
        const salesOrderId = salesOrder || generateSalesOrder();
        const tabletSerials = tablet.serialNumbers.filter(sn => sn.trim());
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: orderType,
            material_type: materialType,
            asset_type: 'Tablet',
            model: tablet.model,
            quantity: tablet.quantity,
            warehouse: tablet.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            serial_numbers: tabletSerials.length > 0 ? tabletSerials : [],
            order_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            configuration: tablet.configuration || null,
            product: tablet.product || null,
            created_by: userEmail, // Use email for created_by
            updated_by: userEmail, // Use email for updated_by
          })
          .select()
          .single();
        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);

        // Create device records for each quantity, using empty string if no serial is provided
        for (let i = 0; i < tablet.quantity; i++) {
          const serialNumber = tabletSerials[i] || ""; // Use empty string if no serial is provided
          const assetStatus = tablet.assetStatuses[i] || 'Fresh';
          const { error: deviceError } = await supabase
            .from('devices')
            .insert({
              asset_type: 'Tablet',
              model: tablet.model,
              serial_number: serialNumber,
              warehouse: tablet.location,
              sales_order: salesOrderId,
              deal_id: dealId || null,
              school_name: schoolName,
              nucleus_id: nucleusId || null,
              status: materialType === 'Inward' ? 'Available' : 'Assigned',
              material_type: materialType,
              order_id: orderData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
              configuration: tablet.configuration || null,
              product: tablet.product || null,
              asset_status: assetStatus,
              created_by: userEmail, // Use email for created_by
              updated_by: userEmail, // Use email for updated_by
            });
          if (deviceError) throw new Error(`Device insertion failed: ${deviceError.message}`);
        }
      }

      for (const tv of validTVs) {
        const salesOrderId = salesOrder || generateSalesOrder();
        const tvSerials = tv.serialNumbers.filter(sn => sn.trim());
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: orderType,
            material_type: materialType,
            asset_type: 'TV',
            model: tv.model,
            quantity: tv.quantity,
            warehouse: tv.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            serial_numbers: tvSerials.length > 0 ? tvSerials : [],
            order_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            configuration: tv.configuration || null,
            product: tv.product || null,
            created_by: userEmail, // Use email for created_by
            updated_by: userEmail, // Use email for updated_by
          })
          .select()
          .single();
        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);

        // Create device records for each quantity, using empty string if no serial is provided
        for (let i = 0; i < tv.quantity; i++) {
          const serialNumber = tvSerials[i] || ""; // Use empty string if no serial is provided
          const assetStatus = tv.assetStatuses[i] || 'Fresh';
          const { error: deviceError } = await supabase
            .from('devices')
            .insert({
              asset_type: 'TV',
              model: tv.model,
              serial_number: serialNumber,
              warehouse: tv.location,
              sales_order: salesOrderId,
              deal_id: dealId || null,
              school_name: schoolName,
              nucleus_id: nucleusId || null,
              status: materialType === 'Inward' ? 'Available' : 'Assigned',
              material_type: materialType,
              order_id: orderData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
              configuration: tv.configuration || null,
              product: tv.product || null,
              asset_status: assetStatus,
              created_by: userEmail, // Use email for created_by
              updated_by: userEmail, // Use email for updated_by
            });
          if (deviceError) throw new Error(`Device insertion failed: ${deviceError.message}`);
        }
      }

      setOrderType('');
      setSalesOrder('');
      setDealId('');
      setNucleusId('');
      setSchoolName('');
      setTablets([]);
      setTvs([]);
      setTabletsToggle(false);
      setTVsToggle(false);
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
      toast({ title: 'Success', description: 'Order created successfully!' });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: 'Error', description: `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      if (headers.length < 9) {
        toast({
          title: 'Invalid CSV Format',
          description: 'CSV must have at least 9 columns: order_type,asset_type,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers,configuration,product,asset_statuses',
          variant: 'destructive',
        });
        return;
      }

      const importedData = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const serialNumbers = values[9] ? values[9].split(';').map(s => s.trim()).filter(s => s) : [];
        const assetStatuses = values[12] ? values[12].split(';').map(s => s.trim()).filter(s => s) : Array(parseInt(values[3]) || 1).fill('Fresh');
        const configuration = values[10] || '';

        if (values[1] === 'TV' && configuration && !tvConfigurations.includes(configuration)) {
          toast({
            title: 'Invalid TV Configuration',
            description: `Configuration "${configuration}" is not valid for TVs. Valid options are: ${tvConfigurations.join(', ')}`,
            variant: 'destructive',
          });
          return null;
        } else if (values[1] === 'Tablet' && configuration && !configurations.includes(configuration)) {
          toast({
            title: 'Invalid Tablet Configuration',
            description: `Configuration "${configuration}" is not valid for Tablets. Valid options are: ${configurations.join(', ')}`,
            variant: 'destructive',
          });
          return null;
        }

        return {
          order_type: values[0],
          asset_type: values[1] as 'Tablet' | 'TV',
          model: values[2],
          quantity: parseInt(values[3]) || 1,
          warehouse: values[4],
          sales_order: values[5],
          deal_id: values[6],
          school_name: values[7],
          nucleus_id: values[8],
          serial_numbers: serialNumbers,
          configuration: configuration,
          product: values[11] || '',
          asset_statuses: assetStatuses,
        };
      }).filter((data): data is NonNullable<typeof importedData[0]> => data !== null);

      console.log('Imported CSV data:', importedData);
      importedData.forEach(data => {
        if (data.asset_type === 'Tablet') {
          const newTablet: TabletItem = {
            id: generateId(),
            model: data.model,
            configuration: data.configuration,
            product: data.product,
            quantity: data.quantity,
            location: data.warehouse,
            serialNumbers: data.serial_numbers,
            assetStatuses: data.asset_statuses,
            sdCardSize: '',
            profileId: '',
          };
          setTablets((prev: TabletItem[]) => [...prev, newTablet]);
          setTabletsToggle(true);
        } else if (data.asset_type === 'TV') {
          const newTV: TVItem = {
            id: generateId(),
            model: data.model,
            configuration: data.configuration,
            product: data.product,
            quantity: data.quantity,
            location: data.warehouse,
            serialNumbers: data.serial_numbers,
            assetStatuses: data.asset_statuses,
          };
          setTvs((prev: TVItem[]) => [...prev, newTV]);
          setTVsToggle(true);
        }

        if (importedData.indexOf(data) === 0) {
          setOrderType(data.order_type);
          setSalesOrder(data.sales_order);
          setDealId(data.deal_id);
          setSchoolName(data.school_name);
          setNucleusId(data.nucleus_id);
        }
      });

      setShowImportDialog(false);
      toast({
        title: 'Import Successful',
        description: `Imported ${importedData.length} items successfully`,
      });
    };

    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const template = `order_type,asset_type,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers,configuration,product,asset_statuses
Hardware,Tablet,Lenovo TB301FU,2,Trichy,SO001,DEAL001,Example School,NUC001,"","2G+32 GB (Android-10)",Lead,"Fresh;Fresh"
Stock,TV,Hyundai TV - 43",1,Bangalore,SO002,DEAL002,Another School,NUC002,,Android TV,BoardAce,Fresh`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'order_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '16px' }}>
        <div style={{ padding: '8px 0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500' }}>Order Details</h3>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            <div>
              <label htmlFor="orderType" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Order Type *</label>
              <select
                id="orderType"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              >
                <option value="">Select order type</option>
                {orderTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="salesOrder" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Sales Order</label>
              <input
                id="salesOrder"
                value={salesOrder}
                onChange={(e) => setSalesOrder(e.target.value)}
                placeholder="Auto-generated if empty (e.g., SO-0-abcde)"
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div>
              <label htmlFor="dealId" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Deal ID</label>
              <input
                id="dealId"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                placeholder="Optional"
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div>
              <label htmlFor="schoolName" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>School Name *</label>
              <input
                id="schoolName"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Required"
                required
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div>
              <label htmlFor="nucleusId" style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nucleus ID</label>
              <input
                id="nucleusId"
                value={nucleusId}
                onChange={(e) => setNucleusId(e.target.value)}
                placeholder="Optional"
                style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="checkbox"
                checked={Tablets}
                onChange={(e) => setTabletsToggle(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Tablets</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="checkbox"
                checked={TVs}
                onChange={(e) => setTVsToggle(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>TVs</span>
            </label>
          </div>
        </div>
      </div>

      {Tablets && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '16px' }}>
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500' }}>Tablets</h3>
            <button
              onClick={addTablet}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Plus style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Add Tablet
            </button>
          </div>
          <div style={{ padding: '16px' }}>
            {tablets.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px' }}>No tablets added</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tablets.map((tablet) => (
                  <div key={tablet.id} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '500' }}>Tablet {tablets.indexOf(tablet) + 1}</h4>
                      <button
                        onClick={() => removeTablet(tablet.id)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                      >
                        <Trash2 style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Model *</label>
                        <select
                          value={tablet.model}
                          onChange={(e) => updateTablet(tablet.id, 'model', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select model</option>
                          {tabletModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Configuration</label>
                        <select
                          value={tablet.configuration}
                          onChange={(e) => updateTablet(tablet.id, 'configuration', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select configuration</option>
                          {configurations.map(config => (
                            <option key={config} value={config}>{config}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Product</label>
                        <select
                          value={tablet.product}
                          onChange={(e) => updateTablet(tablet.id, 'product', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product} value={product}>{product}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>SD Card Size</label>
                        <select
                          value={tablet.sdCardSize}
                          onChange={(e) => updateTablet(tablet.id, 'sdCardSize', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select size</option>
                          {sdCardSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Profile ID</label>
                        <input
                          value={tablet.profileId}
                          onChange={(e) => updateTablet(tablet.id, 'profileId', e.target.value)}
                          placeholder="Optional"
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Quantity *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => updateTablet(tablet.id, 'quantity', tablet.quantity - 1)}
                            disabled={tablet.quantity <= 1}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', opacity: tablet.quantity <= 1 ? 0.5 : 1 }}
                          >
                            <Minus style={{ width: '12px', height: '12px' }} />
                          </button>
                          <input
                            type="number"
                            value={tablet.quantity}
                            onChange={(e) => updateTablet(tablet.id, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            style={{ fontSize: '12px', width: '64px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px', textAlign: 'center' }}
                          />
                          <button
                            type="button"
                            onClick={() => updateTablet(tablet.id, 'quantity', tablet.quantity + 1)}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                          >
                            <Plus style={{ width: '12px', height: '12px' }} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Location *</label>
                        <select
                          value={tablet.location}
                          onChange={(e) => updateTablet(tablet.id, 'location', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select location</option>
                          {locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Serial Numbers & Asset Status</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {Array.from({ length: tablet.quantity }, (_, index) => (
                          <div key={index} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              placeholder={`Serial number ${index + 1} (optional)`}
                              value={tablet.serialNumbers[index] || ''}
                              onChange={(e) => {
                                const newSerialNumbers = [...tablet.serialNumbers];
                                newSerialNumbers[index] = e.target.value;
                                updateTablet(tablet.id, 'serialNumbers', newSerialNumbers);
                              }}
                              style={{ fontSize: '12px', width: '200px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                            />
                            <select
                              value={tablet.assetStatuses[index] || 'Fresh'}
                              onChange={(e) => {
                                const newAssetStatuses = [...tablet.assetStatuses];
                                newAssetStatuses[index] = e.target.value;
                                updateTablet(tablet.id, 'assetStatuses', newAssetStatuses);
                              }}
                              style={{ fontSize: '12px', width: '120px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                            >
                              {assetStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => openScanner(tablet.id, index, 'tablet')}
                              title="Scan Barcode/QR Code"
                              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                            >
                              <Camera style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {TVs && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '16px' }}>
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500' }}>TVs</h3>
            <button
              onClick={addTV}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}
            >
              <Plus style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Add TV
            </button>
          </div>
          <div style={{ padding: '16px' }}>
            {tvs.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px' }}>No TVs added</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tvs.map((tv) => (
                  <div key={tv.id} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '500' }}>TV {tvs.indexOf(tv) + 1}</h4>
                      <button
                        onClick={() => removeTV(tv.id)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                      >
                        <Trash2 style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Model *</label>
                        <select
                          value={tv.model}
                          onChange={(e) => updateTV(tv.id, 'model', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select model</option>
                          {tvModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Configuration</label>
                        <select
                          value={tv.configuration}
                          onChange={(e) => updateTV(tv.id, 'configuration', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select configuration</option>
                          {tvConfigurations.map(config => (
                            <option key={config} value={config}>{config}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Product</label>
                        <select
                          value={tv.product}
                          onChange={(e) => updateTV(tv.id, 'product', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product} value={product}>{product}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Quantity *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => updateTV(tv.id, 'quantity', tv.quantity - 1)}
                            disabled={tv.quantity <= 1}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px', opacity: tv.quantity <= 1 ? 0.5 : 1 }}
                          >
                            <Minus style={{ width: '12px', height: '12px' }} />
                          </button>
                          <input
                            type="number"
                            value={tv.quantity}
                            onChange={(e) => updateTV(tv.id, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            style={{ fontSize: '12px', width: '64px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px', textAlign: 'center' }}
                          />
                          <button
                            type="button"
                            onClick={() => updateTV(tv.id, 'quantity', tv.quantity + 1)}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                          >
                            <Plus style={{ width: '12px', height: '12px' }} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Location *</label>
                        <select
                          value={tv.location}
                          onChange={(e) => updateTV(tv.id, 'location', e.target.value)}
                          style={{ fontSize: '12px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                        >
                          <option value="">Select location</option>
                          {locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Serial Numbers & Asset Status</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {Array.from({ length: tv.quantity }, (_, index) => (
                          <div key={index} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              placeholder={`Serial number ${index + 1} (optional)`}
                              value={tv.serialNumbers[index] || ''}
                              onChange={(e) => {
                                const newSerialNumbers = [...tv.serialNumbers];
                                newSerialNumbers[index] = e.target.value;
                                updateTV(tv.id, 'serialNumbers', newSerialNumbers);
                              }}
                              style={{ fontSize: '12px', width: '200px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                            />
                            <select
                              value={tv.assetStatuses[index] || 'Fresh'}
                              onChange={(e) => {
                                const newAssetStatuses = [...tv.assetStatuses];
                                newAssetStatuses[index] = e.target.value;
                                updateTV(tv.id, 'assetStatuses', newAssetStatuses);
                              }}
                              style={{ fontSize: '12px', width: '120px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
                            >
                              {assetStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => openScanner(tv.id, index, 'tv')}
                              title="Scan Barcode/QR Code"
                              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                            >
                              <Camera style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={createOrder}
        disabled={loading}
        style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', background: '#3b82f6', color: '#fff', opacity: loading ? 0.5 : 1, width: '100%' }}
      >
        {loading ? 'Creating...' : 'Create Order'}
      </button>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '16px' }}>
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Bulk import orders from CSV file</p>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowImportDialog(true)}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', flex: 1 }}
            >
              <Upload style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Import CSV
            </button>
            <button
              onClick={downloadCSVTemplate}
              style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', flex: 1 }}
            >
              <Download style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Download Template
            </button>
          </div>
        </div>
      </div>

      {showImportDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', maxWidth: '600px', width: '100%' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Import Orders from CSV</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Upload a CSV file with the following format:
                <br />
                order_type,asset_type,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers,configuration,product,asset_statuses
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}
              />
              <button
                onClick={() => setShowImportDialog(false)}
                style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', marginTop: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderForm;