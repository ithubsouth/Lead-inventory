import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Camera, X, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Order, Device } from './types';
import { formatDate } from './utils';

interface EditOrderFormProps {
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

const EditOrderForm: React.FC<EditOrderFormProps> = ({ order, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Order>({ ...order });
  const [devices, setDevices] = useState<Device[]>([]);
  const [originalOrder] = useState<Order>({ ...order });
  const [originalDevices, setOriginalDevices] = useState<Device[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
  const assetGroups = ['NFA', 'FA'];

  // Fetch devices for the order on mount
  useEffect(() => {
    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('order_id', order.id)
        .eq('is_deleted', false);
      if (error) {
        toast({ title: 'Error', description: `Failed to fetch devices: ${error.message}`, variant: 'destructive' });
        return;
      }
      setDevices(data || []);
      setOriginalDevices(data || []);
      setFormData(prev => ({
        ...prev,
        serial_numbers: data.map(d => d.serial_number || ''),
        quantity: data.length || 1,
        sd_card_size: data[0]?.sd_card_size || '',
        profile_id: data[0]?.profile_id || '',
      }));
    };
    fetchDevices();
  }, [order.id, toast]);

  // Reset model, configuration, sd_card_size, and profile_id when asset_type changes
  useEffect(() => {
    if (formData.asset_type && !['Tablet', 'TV'].includes(formData.asset_type)) {
      setFormData(prev => ({
        ...prev,
        model: '',
        configuration: '',
        sd_card_size: '',
        profile_id: '',
      }));
    }
  }, [formData.asset_type]);

  const removeSerialNumber = (index: number) => {
    setDevices(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      serial_numbers: prev.serial_numbers.filter((_, i) => i !== index),
      quantity: Math.max(1, prev.quantity - 1),
    }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const trimmedValue = value.trim();
    setDevices(prev => {
      const newDevices = [...prev];
      newDevices[index] = { ...newDevices[index], serial_number: trimmedValue };
      return newDevices;
    });
    setFormData(prev => ({
      ...prev,
      serial_numbers: prev.serial_numbers.map((sn, i) => (i === index ? trimmedValue : sn)),
    }));
  };

  const updateAssetStatus = (index: number, value: string) => {
    setDevices(prev => {
      const newDevices = [...prev];
      newDevices[index] = { ...newDevices[index], asset_status: value };
      return newDevices;
    });
  };

  const updateAssetGroup = (index: number, value: string) => {
    setDevices(prev => {
      const newDevices = [...prev];
      newDevices[index] = { ...newDevices[index], asset_group: value };
      return newDevices;
    });
  };

  const updateSdCardSize = (value: string) => {
    setFormData(prev => ({ ...prev, sd_card_size: value }));
    setDevices(prev => prev.map(device => ({ ...device, sd_card_size: value })));
  };

  const updateProfileId = (value: string) => {
    setFormData(prev => ({ ...prev, profile_id: value }));
    setDevices(prev => prev.map(device => ({ ...device, profile_id: value })));
  };

  const handleScanSuccess = (result: string) => {
    setShowScanner(false);
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    }
  };

  const handleQuantityChange = (value: number) => {
    const newQuantity = Math.max(1, value);
    const currentDevices = [...devices];
    const currentSerials = formData.serial_numbers || [];

    if (newQuantity > currentDevices.length) {
      const newDevices = Array(newQuantity - currentDevices.length).fill(null).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        order_id: formData.id,
        asset_type: formData.asset_type,
        model: formData.model,
        serial_number: '',
        warehouse: formData.warehouse,
        sales_order: formData.sales_order || null,
        deal_id: formData.deal_id || null,
        school_name: formData.school_name,
        nucleus_id: formData.nucleus_id || null,
        status: formData.material_type === 'Inward' ? 'Available' : 'Assigned',
        material_type: formData.material_type,
        configuration: formData.configuration || null,
        product: formData.product || null,
        sd_card_size: formData.asset_type === 'Tablet' ? formData.sd_card_size || '' : null,
        profile_id: formData.asset_type === 'Tablet' ? formData.profile_id || '' : null,
        asset_status: 'Fresh',
        asset_group: 'NFA',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '',
        updated_by: '',
        is_deleted: false,
      }));
      setDevices([...currentDevices, ...newDevices]);
      setFormData(prev => ({
        ...prev,
        quantity: newQuantity,
        serial_numbers: [...currentSerials, ...Array(newQuantity - currentSerials.length).fill('')],
      }));
    } else {
      setDevices(currentDevices.slice(0, newQuantity));
      setFormData(prev => ({
        ...prev,
        quantity: newQuantity,
        serial_numbers: currentSerials.slice(0, newQuantity),
      }));
    }
  };

  const validateForm = () => {
    if (!formData.order_type) {
      toast({ title: 'Error', description: 'Order type is required', variant: 'destructive' });
      return false;
    }
    if (!formData.school_name?.trim()) {
      toast({ title: 'Error', description: 'School Name is required', variant: 'destructive' });
      return false;
    }
    if (!formData.warehouse) {
      toast({ title: 'Error', description: 'Warehouse is required', variant: 'destructive' });
      return false;
    }
    if (devices.length !== formData.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of devices (${devices.length}) does not match quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    const invalidStatuses = devices.some(device => !assetStatuses.includes(device.asset_status));
    if (invalidStatuses) {
      toast({
        title: 'Validation Error',
        description: `Invalid asset statuses detected. Must be one of: ${assetStatuses.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    const invalidGroups = devices.some(device => !assetGroups.includes(device.asset_group));
    if (invalidGroups) {
      toast({
        title: 'Validation Error',
        description: `Invalid asset groups detected. Must be one of: ${assetGroups.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    if (formData.asset_type === 'Tablet' && formData.sd_card_size && !sdCardSizes.includes(formData.sd_card_size)) {
      toast({
        title: 'Validation Error',
        description: `Invalid SD Card Size. Must be one of: ${sdCardSizes.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const logHistory = async (
    tableName: string,
    recordId: string,
    fieldName: string,
    oldData: string,
    newData: string,
    userEmail: string,
    salesOrder: string | null,
    operation: string
  ) => {
    const { error } = await supabase
      .from('history')
      .insert({
        record_id: recordId,
        sales_order: salesOrder,
        table_name: tableName,
        field_name: fieldName,
        old_data: oldData,
        new_data: newData,
        operation,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`Failed to log history for ${tableName}.${fieldName}:`, error.message);
      throw new Error(`History logging failed: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    let orderUpdated = false;
    let devicesUpdated = false;
    let devicesToDelete: Device[] = [];

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Authentication failed: Unable to retrieve user email');
      }
      const userEmail = userData.user.email;

      // Update order in the orders table
      const orderUpdates: Partial<Order> = {
        order_type: formData.order_type,
        material_type: formData.material_type,
        asset_type: formData.asset_type,
        model: formData.model,
        quantity: formData.quantity,
        warehouse: formData.warehouse,
        sales_order: formData.sales_order || null,
        deal_id: formData.deal_id || null,
        school_name: formData.school_name,
        nucleus_id: formData.nucleus_id || null,
        serial_numbers: devices.map(d => d.serial_number || ''),
        configuration: formData.configuration || null,
        product: formData.product || null,
        sd_card_size: formData.asset_type === 'Tablet' ? formData.sd_card_size || null : null,
        profile_id: formData.asset_type === 'Tablet' ? formData.profile_id || null : null,
        updated_at: new Date().toISOString(),
        updated_by: userEmail,
      };

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', formData.id);

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }
      orderUpdated = true;

      // Log order changes
      const fieldsToCompare = [
        'order_type',
        'asset_type',
        'model',
        'quantity',
        'warehouse',
        'sales_order',
        'deal_id',
        'school_name',
        'nucleus_id',
        'configuration',
        'product',
        'sd_card_size',
        'profile_id',
      ];

      for (const field of fieldsToCompare) {
        const oldValue = String(originalOrder[field] || '');
        const newValue = String(formData[field] || '');
        if (oldValue !== newValue) {
          await logHistory('orders', formData.id, field, oldValue, newValue, userEmail, formData.sales_order, 'UPDATE');
        }
      }

      // Mark deleted devices
      devicesToDelete = originalDevices.filter(
        od => !devices.some(d => d.id === od.id)
      );
      for (const device of devicesToDelete) {
        const { error } = await supabase
          .from('devices')
          .update({ is_deleted: true, updated_at: new Date().toISOString(), updated_by: userEmail })
          .eq('id', device.id);
        if (error) {
          throw new Error(`Failed to mark device as deleted: ${error.message}`);
        }
        await logHistory('devices', device.id, 'is_deleted', 'false', 'true', userEmail, formData.sales_order, 'DELETE');
      }

      // Update or insert devices
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const originalDevice = originalDevices.find(od => od.id === device.id);
        const deviceData = {
          asset_type: formData.asset_type,
          model: formData.model,
          serial_number: device.serial_number || '',
          warehouse: formData.warehouse,
          sales_order: formData.sales_order || null,
          deal_id: formData.deal_id || null,
          school_name: formData.school_name,
          nucleus_id: formData.nucleus_id || null,
          status: formData.material_type === 'Inward' ? 'Available' : 'Assigned',
          material_type: formData.material_type,
          order_id: formData.id,
          configuration: formData.configuration || null,
          product: formData.product || null,
          sd_card_size: formData.asset_type === 'Tablet' ? formData.sd_card_size || null : null,
          profile_id: formData.asset_type === 'Tablet' ? formData.profile_id || null : null,
          asset_status: device.asset_status || 'Fresh',
          asset_group: device.asset_group || 'NFA',
          updated_at: new Date().toISOString(),
          updated_by: userEmail,
          is_deleted: false,
        };

        if (originalDevice) {
          // Update existing device
          const { error } = await supabase
            .from('devices')
            .update(deviceData)
            .eq('id', device.id);
          if (error) {
            throw new Error(`Failed to update device: ${error.message}`);
          }

          // Log device changes
          const deviceFields = [
            'serial_number',
            'asset_status',
            'asset_group',
            'sd_card_size',
            'profile_id',
          ];
          for (const field of deviceFields) {
            const oldValue = String(originalDevice[field] || '');
            const newValue = String(device[field] || '');
            if (oldValue !== newValue) {
              await logHistory('devices', device.id, field, oldValue, newValue, userEmail, formData.sales_order, 'UPDATE');
            }
          }
        } else {
          // Insert new device
          const { data: newDevice, error } = await supabase
            .from('devices')
            .insert({ ...deviceData, created_at: new Date().toISOString(), created_by: userEmail })
            .select()
            .single();
          if (error) {
            throw new Error(`Failed to insert device: ${error.message}`);
          }
          devices[i].id = newDevice.id;

          // Log new device fields
          await logHistory('devices', newDevice.id, 'serial_number', '', device.serial_number || '', userEmail, formData.sales_order, 'INSERT');
          await logHistory('devices', newDevice.id, 'asset_status', '', device.asset_status || 'Fresh', userEmail, formData.sales_order, 'INSERT');
          await logHistory('devices', newDevice.id, 'asset_group', '', device.asset_group || 'NFA', userEmail, formData.sales_order, 'INSERT');
          if (formData.asset_type === 'Tablet') {
            await logHistory('devices', newDevice.id, 'sd_card_size', '', device.sd_card_size || '', userEmail, formData.sales_order, 'INSERT');
            await logHistory('devices', newDevice.id, 'profile_id', '', device.profile_id || '', userEmail, formData.sales_order, 'INSERT');
          }
        }
      }
      devicesUpdated = true;

      const updatedOrder = { ...formData, devices };
      onSave(updatedOrder);
      toast({ title: 'Success', description: 'Order and devices updated successfully. Changes logged in history.' });
    } catch (error) {
      console.error('Error during save:', error);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userEmail = userData?.user?.email || '';

        if (orderUpdated) {
          await supabase
            .from('orders')
            .update({
              ...originalOrder,
              updated_at: new Date().toISOString(),
              updated_by: userEmail,
            })
            .eq('id', formData.id);
        }

        if (devicesUpdated) {
          // Restore deleted devices
          for (const device of devicesToDelete) {
            await supabase
              .from('devices')
              .update({ is_deleted: false, updated_at: new Date().toISOString(), updated_by: userEmail })
              .eq('id', device.id);
          }
          // Revert to original devices
          await supabase
            .from('devices')
            .upsert(originalDevices.map(device => ({
              ...device,
              updated_at: new Date().toISOString(),
              updated_by: userEmail,
            })));
        }
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        toast({ title: 'Rollback Error', description: 'Partial update occurred. Contact admin.', variant: 'destructive' });
      }
      toast({
        title: 'Error',
        description: `Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4 relative w-full mx-auto p-6 bg-white rounded-lg shadow-md max-w-none'>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 rounded-full p-1 hover:bg-gray-100 z-10"
        onClick={onCancel}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className='space-y-4'>
        {/* Line 1: Order Type, Sales Order, Deal ID, School Name, Nucleus ID */}
        <Card className='bg-white'>
          <CardHeader className='p-4'>
            <h2 className='text-lg font-semibold text-gray-800'>Order Details</h2>
          </CardHeader>
          <CardContent className='space-y-4 bg-white'>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Order Type *</Label>
                <Select
                  value={formData.order_type || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, order_type: value }))}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select order type' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {orderTypes.map(type => (
                      <SelectItem key={type} value={type} className='text-xs'>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Sales Order</Label>
                <Input
                  value={formData.sales_order || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                  className='text-xs bg-white border-gray-300'
                />
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Deal ID</Label>
                <Input
                  value={formData.deal_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                  className='text-xs bg-white border-gray-300'
                />
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>School Name *</Label>
                <Input
                  value={formData.school_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                  required
                  className='text-xs bg-white border-gray-300'
                />
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Nucleus ID</Label>
                <Input
                  value={formData.nucleus_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                  className='text-xs bg-white border-gray-300'
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Line 2: Asset Type, Model, Configuration, Quantity, Location */}
        <Card className='bg-white'>
          <CardHeader className='p-4'>
            <h2 className='text-lg font-semibold text-gray-800'>Asset Details</h2>
          </CardHeader>
          <CardContent className='space-y-4 bg-white'>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Asset Type</Label>
                <Select
                  value={formData.asset_type || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, asset_type: value }))}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select asset type' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {['Tablet', 'TV'].map(type => (
                      <SelectItem key={type} value={type} className='text-xs'>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Model</Label>
                <Select
                  value={formData.model || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  disabled={!formData.asset_type}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select model' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {(formData.asset_type === 'Tablet' ? tabletModels : formData.asset_type === 'TV' ? tvModels : []).map(model => (
                      <SelectItem key={model} value={model} className='text-xs'>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Configuration</Label>
                <Select
                  value={formData.configuration || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, configuration: value }))}
                  disabled={!formData.asset_type}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select configuration' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {(formData.asset_type === 'Tablet' ? configurations : formData.asset_type === 'TV' ? tvConfigurations : []).map(config => (
                      <SelectItem key={config} value={config} className='text-xs'>{config}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Quantity</Label>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuantityChange(formData.quantity - 1)}
                    disabled={formData.quantity <= 1}
                    className='bg-white border-gray-300'
                  >
                    <Minus className='h-4 w-4' />
                  </Button>
                  <Input
                    type='number'
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    min='1'
                    className='text-xs text-center w-24 bg-white border-gray-300'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuantityChange(formData.quantity + 1)}
                    className='bg-white border-gray-300'
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Location</Label>
                <Select
                  value={formData.warehouse}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select warehouse' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {locations.map(location => (
                      <SelectItem key={location} value={location} className='text-xs'>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Line 3: Product, SD Card Size, Profile ID, Order Date, Material Type */}
        <Card className='bg-white'>
          <CardHeader className='p-4'>
            <h2 className='text-lg font-semibold text-gray-800'>Additional Details</h2>
          </CardHeader>
          <CardContent className='space-y-4 bg-white'>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Product</Label>
                <Select
                  value={formData.product || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select product' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {products.map(product => (
                      <SelectItem key={product} value={product} className='text-xs'>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.asset_type === 'Tablet' && (
                <>
                  <div>
                    <Label className='text-xs font-medium text-gray-700'>SD Card Size</Label>
                    <Select
                      value={formData.sd_card_size || ''}
                      onValueChange={updateSdCardSize}
                    >
                      <SelectTrigger className='text-xs bg-white border-gray-300'>
                        <SelectValue placeholder='Select SD card size' />
                      </SelectTrigger>
                      <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                        {sdCardSizes.map(size => (
                          <SelectItem key={size} value={size} className='text-xs'>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-xs font-medium text-gray-700'>Profile ID</Label>
                    <Input
                      value={formData.profile_id || ''}
                      onChange={(e) => updateProfileId(e.target.value)}
                      className='text-xs bg-white border-gray-300'
                      placeholder='Optional'
                    />
                  </div>
                </>
              )}
              <div>
                <Label className='text-xs font-medium text-gray-700'>Order Date</Label>
                <p className='text-xs text-gray-800'>{formatDate(formData.order_date)}</p>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Material Type</Label>
                <p className='text-xs text-gray-800'>{formData.material_type || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='mt-4 bg-white'>
        <CardHeader className='p-4'>
          <div className='text-lg font-semibold text-gray-800'>Serial Numbers, Asset Statuses & Asset Groups ({devices.filter(d => d.serial_number?.trim()).length} / {formData.quantity})</div>
        </CardHeader>
        <CardContent className='space-y-2 pt-4 bg-white'>
          <div className='mb-2'>
            <Label className='text-xs font-medium text-gray-700'>Search Serial Number</Label>
            <div className='flex gap-2'>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search serial number...'
                className='text-xs bg-white border-gray-300'
              />
              <Button
                onClick={() => setSearchQuery('')}
                size='sm'
                variant='outline'
                className='bg-white border-gray-300'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
          <Label className='text-xs font-medium text-gray-700'>Update serial numbers, asset statuses, and asset groups individually (partial updates allowed)</Label>
          {devices.map((device, index) => {
            const serial = device.serial_number || '';
            const shouldShow = !searchQuery || serial.toLowerCase().includes(searchQuery.toLowerCase());
            return shouldShow ? (
              <div key={index} className='flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200'>
                <Input
                  value={serial}
                  onChange={(e) => updateSerialNumber(index, e.target.value)}
                  className='font-mono text-xs flex-1 bg-white border-gray-300'
                  placeholder={`Serial ${index + 1} (optional - can update later)`}
                />
                <Select
                  value={device.asset_status || 'Fresh'}
                  onValueChange={(value) => updateAssetStatus(index, value)}
                >
                  <SelectTrigger className='text-xs w-48 bg-white border-gray-300'>
                    <SelectValue placeholder='Asset Status' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[140px]'>
                    {assetStatuses.map(status => (
                      <SelectItem key={status} value={status} className='text-xs'>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={device.asset_group || 'NFA'}
                  onValueChange={(value) => updateAssetGroup(index, value)}
                >
                  <SelectTrigger className='text-xs w-24 bg-white border-gray-300'>
                    <SelectValue placeholder='Asset Group' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[80px]'>
                    {assetGroups.map(group => (
                      <SelectItem key={group} value={group} className='text-xs'>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setCurrentSerialIndex(index);
                    setShowScanner(true);
                  }}
                  className='bg-white border-gray-300'
                >
                  <Camera className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeSerialNumber(index)}
                  disabled={formData.quantity <= 1}
                  className='bg-white border-gray-300'
                >
                  <X className='w-4 w-4' />
                </Button>
              </div>
            ) : null;
          })}
          {devices.filter(d => d.serial_number?.trim()).length < formData.quantity && (
            <p className='text-xs text-yellow-600'>Info: {formData.quantity - devices.filter(d => d.serial_number?.trim()).length} serial(s) remaining. You can save now and update later.</p>
          )}
        </CardContent>
      </Card>

      <div className='flex justify-end gap-2 mt-4'>
        <Button variant='outline' onClick={onCancel} disabled={loading} size='lg' className='px-6 bg-white border-gray-300 text-gray-800 hover:bg-gray-100'>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} size='lg' className='px-6 bg-blue-600 text-white hover:bg-blue-700'>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <EnhancedBarcodeScanner
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          setCurrentSerialIndex(null);
        }}
        onScan={handleScanSuccess}
      />
    </div>
  );
};

export default EditOrderForm;