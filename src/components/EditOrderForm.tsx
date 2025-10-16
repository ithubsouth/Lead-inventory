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
import type { ASSET_TYPES } from './types';
import { formatDate } from './utils';
import {
  orderTypes,
  tabletModels,
  tvModels,
  configurations,
  tvConfigurations,
  products,
  sdCardSizes,
  locations,
  assetStatuses,
  assetGroups,
  coverModels,
  pendriveSizes,
  otherMaterials,
} from './constants';

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
  const [serialErrors, setSerialErrors] = useState<(string | null)[]>([]);
  const { toast } = useToast();

  const isInward = ['Stock', 'Return'].includes(formData.order_type);

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
      const fetchedDevices = (data || []) as any[];
      setDevices(fetchedDevices as Device[]);
      setOriginalDevices(fetchedDevices as Device[]);
      setFormData(prev => ({
        ...prev,
        serial_numbers: fetchedDevices.map(d => d.serial_number || ''),
        quantity: fetchedDevices.length,
      }));
      validateSerials(fetchedDevices);
    };
    fetchDevices();
  }, [order.id, toast]);

  // Sync quantity with devices length
  useEffect(() => {
    setFormData(prev => ({ ...prev, quantity: devices.length }));
  }, [devices]);

  // Validate serial numbers for duplicates and stock availability
  const validateSerials = async (devicesToValidate: Device[]) => {
    const errors = Array(devicesToValidate.length).fill(null);
    const allSerials = devicesToValidate.map(d => d.serial_number?.trim() || '').filter(sn => sn);

    // Check for duplicates within the form
    for (let i = 0; i < allSerials.length; i++) {
      const serial = allSerials[i];
      if (serial && allSerials.filter(s => s === serial).length > 1) {
        errors[i] = 'Duplicate within order';
      }
    }

    // Validate serials against stock for outward orders and auto-populate status/group
    if (!isInward && formData.warehouse && allSerials.length > 0) {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('asset_type', formData.asset_type)
        .in('serial_number', allSerials)
        .order('updated_at', { ascending: false });

      if (error) {
        toast({ title: 'Error', description: 'Failed to validate serials', variant: 'destructive' });
        return;
      }

      // Group by serial and get the latest entry based on updated_at
      const latestBySerial: Record<string, any> = {};
      (data as any[])?.forEach((device: any) => {
        if (!device.is_deleted && (!latestBySerial[device.serial_number] || new Date(device.updated_at) > new Date(latestBySerial[device.serial_number].updated_at))) {
          latestBySerial[device.serial_number] = device;
        }
      });

      // Auto-populate asset_status and asset_group from inward records
      const updatedDevices = [...devicesToValidate];
      let hasUpdates = false;

      for (let i = 0; i < devicesToValidate.length; i++) {
        const serial = devicesToValidate[i].serial_number?.trim();
        if (serial && !errors[i]) {
          const latestDevice = latestBySerial[serial];
          if (latestDevice) {
            // Auto-populate if current values are defaults
            if (latestDevice.material_type === 'Inward') {
              if (!updatedDevices[i].asset_status || updatedDevices[i].asset_status === 'Fresh') {
                updatedDevices[i] = { ...updatedDevices[i], asset_status: latestDevice.asset_status || 'Fresh' };
                hasUpdates = true;
              }
              if (!updatedDevices[i].asset_group || updatedDevices[i].asset_group === 'NFA') {
                updatedDevices[i] = { ...updatedDevices[i], asset_group: latestDevice.asset_group || 'NFA' };
                hasUpdates = true;
              }
            }

            if (latestDevice.material_type === 'Outward') {
              errors[i] = `Currently Outward in ${latestDevice.warehouse} (SO: ${latestDevice.sales_order || 'N/A'})`;
            } else if (latestDevice.warehouse !== formData.warehouse) {
              errors[i] = `In ${latestDevice.warehouse} stock (SO: ${latestDevice.sales_order || 'N/A'})`;
            }
          } else {
            errors[i] = 'Not in stock';
          }
        }
      }

      if (hasUpdates) {
        setDevices(updatedDevices);
      }
    }

    setSerialErrors(errors);
  };

  useEffect(() => {
    validateSerials(devices);
  }, [devices, formData.order_type, formData.warehouse]);

  const removeSerialNumber = (index: number) => {
    setDevices(prev => prev.filter((_, i) => i !== index));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const trimmedValue = value.trim();
    setDevices(prev => {
      const newDevices = [...prev];
      newDevices[index] = { ...newDevices[index], serial_number: trimmedValue };
      return newDevices;
    });
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

  const updateAssetCondition = (index: number, value: string) => {
    setDevices(prev => {
      const newDevices = [...prev];
      newDevices[index] = { ...newDevices[index], asset_condition: value };
      return newDevices;
    });
  };

  const updateSdCardSize = (value: string) => {
    setFormData(prev => ({ ...prev, sd_card_size: value }));
  };

  const updateProfileId = (value: string) => {
    setFormData(prev => ({ ...prev, profile_id: value }));
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
        status: isInward ? 'Available' : 'Assigned',
        material_type: isInward ? 'Inward' : 'Outward',
        configuration: formData.configuration || null,
        product: formData.product || null,
        sd_card_size: formData.sd_card_size || null,
        profile_id: formData.profile_id || null,
        asset_status: 'Fresh',
        asset_group: 'NFA',
        asset_condition: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '',
        updated_by: '',
        is_deleted: false,
        order_type: order.order_type,
      }));
      setDevices([...currentDevices, ...newDevices] as Device[]);
    } else {
      setDevices(currentDevices.slice(0, newQuantity));
    }
  };

  const validateForm = () => {
    if (!orderTypes.includes(formData.order_type)) {
      toast({ title: 'Error', description: `Order type must be one of: ${orderTypes.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (!formData.school_name?.trim()) {
      toast({ title: 'Error', description: 'School Name is required', variant: 'destructive' });
      return false;
    }
    if (!locations.includes(formData.warehouse)) {
      toast({ title: 'Error', description: `Warehouse must be one of: ${locations.join(', ')}`, variant: 'destructive' });
      return false;
    }
    // Validate model based on asset type
    if (formData.model && formData.asset_type === 'Tablet' && !tabletModels.includes(formData.model)) {
      toast({ title: 'Error', description: `Tablet model must be one of: ${tabletModels.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.model && formData.asset_type === 'TV' && !tvModels.includes(formData.model)) {
      toast({ title: 'Error', description: `TV model must be one of: ${tvModels.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.model && formData.asset_type === 'Cover' && !coverModels.includes(formData.model)) {
      toast({ title: 'Error', description: `Cover model must be one of: ${coverModels.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.model && formData.asset_type === 'Pendrive' && !pendriveSizes.includes(formData.model)) {
      toast({ title: 'Error', description: `Pendrive model must be one of: ${pendriveSizes.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.model && formData.asset_type === 'SD Card' && !sdCardSizes.includes(formData.model)) {
      toast({ title: 'Error', description: `SD Card model must be one of: ${sdCardSizes.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.model && formData.asset_type === 'Other' && !otherMaterials.includes(formData.model)) {
      toast({ title: 'Error', description: `Other material must be one of: ${otherMaterials.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.configuration && formData.asset_type === 'Tablet' && !configurations.includes(formData.configuration)) {
      toast({ title: 'Error', description: `Tablet configuration must be one of: ${configurations.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.configuration && formData.asset_type === 'TV' && !tvConfigurations.includes(formData.configuration)) {
      toast({ title: 'Error', description: `TV configuration must be one of: ${tvConfigurations.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.product && !products.includes(formData.product)) {
      toast({ title: 'Error', description: `Product must be one of: ${products.join(', ')}`, variant: 'destructive' });
      return false;
    }
    if (formData.sd_card_size && !sdCardSizes.includes(formData.sd_card_size)) {
      toast({ title: 'Error', description: `SD Card Size must be one of: ${sdCardSizes.join(', ')}`, variant: 'destructive' });
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
    if (serialErrors.some(error => error)) {
      toast({
        title: 'Validation Error',
        description: 'Please resolve serial number errors (duplicates or not in stock) before saving.',
        variant: 'destructive',
      });
      return false;
    }
    if (isInward) {
      for (let i = 0; i < devices.length; i++) {
        if (devices[i].asset_status === 'Scrap' && !devices[i].asset_condition?.trim()) {
          toast({ title: 'Error', description: `Asset condition is required for scrapped item at position ${i + 1}`, variant: 'destructive' });
          return false;
        }
      }
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

      const newMaterialType = isInward ? 'Inward' : 'Outward';
      const newStatus = newMaterialType === 'Inward' ? 'Available' : 'Assigned';

      // Update order if changed
      const orderChanges: Partial<Order> = {};
      const orderFields = [
        'order_type',
        'asset_type',
        'model',
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

      orderFields.forEach(field => {
        if (formData[field as keyof Order] !== originalOrder[field as keyof Order]) {
          orderChanges[field as keyof Order] = formData[field as keyof Order];
        }
      });

      orderChanges.quantity = devices.length;
      orderChanges.serial_numbers = devices.map(d => d.serial_number || '');
      orderChanges.material_type = newMaterialType;
      orderChanges.updated_at = new Date().toISOString();
      orderChanges.updated_by = userEmail;

      if (Object.keys(orderChanges).length > 2 || orderChanges.quantity !== originalOrder.quantity || JSON.stringify(orderChanges.serial_numbers) !== JSON.stringify(originalOrder.serial_numbers)) { // >2 for updated_at and updated_by
        const { error: orderError } = await supabase
          .from('orders')
          .update(orderChanges)
          .eq('id', formData.id);

        if (orderError) {
          throw new Error(`Failed to update order: ${orderError.message}`);
        }
        orderUpdated = true;

        // Log order changes
        orderFields.forEach(field => {
          if (formData[field as keyof Order] !== originalOrder[field as keyof Order]) {
            logHistory('orders', formData.id, field, String(originalOrder[field as keyof Order] || ''), String(formData[field as keyof Order] || ''), userEmail, formData.sales_order, 'UPDATE');
          }
        });
        if (newMaterialType !== originalOrder.material_type) {
          logHistory('orders', formData.id, 'material_type', originalOrder.material_type || '', newMaterialType, userEmail, formData.sales_order, 'UPDATE');
        }
        if (orderChanges.quantity !== originalOrder.quantity) {
          logHistory('orders', formData.id, 'quantity', String(originalOrder.quantity), String(orderChanges.quantity), userEmail, formData.sales_order, 'UPDATE');
        }
        // For serial_numbers, log if changed
        if (JSON.stringify(orderChanges.serial_numbers) !== JSON.stringify(originalOrder.serial_numbers)) {
          logHistory('orders', formData.id, 'serial_numbers', JSON.stringify(originalOrder.serial_numbers), JSON.stringify(orderChanges.serial_numbers), userEmail, formData.sales_order, 'UPDATE');
        }
      }

      // Identify deleted devices
      devicesToDelete = originalDevices.filter(od => !devices.some(d => d.id === od.id));

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

      // Update or insert devices only if changed
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const originalDevice = originalDevices.find(od => od.id === device.id);
        const changes: Partial<Device> = {};

        if (originalDevice) {
          // Check for changes
          if (device.serial_number !== originalDevice.serial_number) changes.serial_number = device.serial_number;
          if (device.asset_status !== originalDevice.asset_status) changes.asset_status = device.asset_status;
          if (device.asset_group !== originalDevice.asset_group) changes.asset_group = device.asset_group;
          if (device.asset_condition !== originalDevice.asset_condition) changes.asset_condition = device.asset_condition;
          if (formData.sd_card_size !== originalDevice.sd_card_size) changes.sd_card_size = formData.sd_card_size;
          if (formData.profile_id !== originalDevice.profile_id) changes.profile_id = formData.profile_id;
          if (formData.model !== originalDevice.model) changes.model = formData.model;
          if (formData.configuration !== originalDevice.configuration) changes.configuration = formData.configuration;
          if (formData.product !== originalDevice.product) changes.product = formData.product;
          if (formData.warehouse !== originalDevice.warehouse) changes.warehouse = formData.warehouse;
          if (formData.sales_order !== originalDevice.sales_order) changes.sales_order = formData.sales_order;
          if (formData.deal_id !== originalDevice.deal_id) changes.deal_id = formData.deal_id;
          if (formData.school_name !== originalDevice.school_name) changes.school_name = formData.school_name;
          if (formData.nucleus_id !== originalDevice.nucleus_id) changes.nucleus_id = formData.nucleus_id;
          if (newMaterialType !== originalDevice.material_type) changes.material_type = newMaterialType;
          if (newStatus !== originalDevice.status) changes.status = newStatus;

          if (Object.keys(changes).length > 0) {
            changes.updated_at = new Date().toISOString();
            changes.updated_by = userEmail;

            const { error } = await supabase
              .from('devices')
              .update(changes)
              .eq('id', device.id);

            if (error) {
              throw new Error(`Failed to update device: ${error.message}`);
            }

            // Log changes
            for (const field in changes) {
              if (field !== 'updated_at' && field !== 'updated_by') {
                await logHistory('devices', device.id, field, String(originalDevice[field as keyof Device] || ''), String(changes[field as keyof Device] || ''), userEmail, formData.sales_order, 'UPDATE');
              }
            }
          }
        } else {
          // Insert new device
          const deviceData = {
            asset_type: formData.asset_type,
            model: formData.model || null,
            serial_number: device.serial_number || '',
            warehouse: formData.warehouse,
            sales_order: formData.sales_order || null,
            deal_id: formData.deal_id || null,
            school_name: formData.school_name,
            nucleus_id: formData.nucleus_id || null,
            status: newStatus,
            material_type: newMaterialType,
            order_id: formData.id,
            configuration: formData.configuration || null,
            product: formData.product || 'Lead',
            sd_card_size: formData.sd_card_size || null,
            profile_id: formData.profile_id || null,
            asset_status: device.asset_status || 'Fresh',
            asset_group: device.asset_group || 'NFA',
            asset_condition: device.asset_condition || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: userEmail,
            updated_by: userEmail,
            is_deleted: false,
          };

          const { data: newDevice, error } = await supabase
            .from('devices')
            .insert(deviceData)
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to insert device: ${error.message}`);
          }

          devices[i].id = newDevice.id;

          // Log new device fields
          await logHistory('devices', newDevice.id, 'serial_number', '', deviceData.serial_number, userEmail, formData.sales_order, 'INSERT');
          await logHistory('devices', newDevice.id, 'asset_status', '', deviceData.asset_status, userEmail, formData.sales_order, 'INSERT');
          await logHistory('devices', newDevice.id, 'asset_group', '', deviceData.asset_group, userEmail, formData.sales_order, 'INSERT');
          if (deviceData.asset_condition) {
            await logHistory('devices', newDevice.id, 'asset_condition', '', deviceData.asset_condition, userEmail, formData.sales_order, 'INSERT');
          }
          if (deviceData.sd_card_size) {
            await logHistory('devices', newDevice.id, 'sd_card_size', '', deviceData.sd_card_size, userEmail, formData.sales_order, 'INSERT');
          }
          if (deviceData.profile_id) {
            await logHistory('devices', newDevice.id, 'profile_id', '', deviceData.profile_id, userEmail, formData.sales_order, 'INSERT');
          }
          if (deviceData.configuration) {
            await logHistory('devices', newDevice.id, 'configuration', '', deviceData.configuration, userEmail, formData.sales_order, 'INSERT');
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
          for (const originalDevice of originalDevices) {
            await supabase
              .from('devices')
              .update({
                ...originalDevice,
                updated_at: new Date().toISOString(),
                updated_by: userEmail,
              })
              .eq('id', originalDevice.id);
          }
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
                  onValueChange={(value) => setFormData(prev => ({ ...prev, asset_type: value as ASSET_TYPES }))}
                >
                  <SelectTrigger className='text-xs bg-white border-gray-300'>
                    <SelectValue placeholder='Select asset type' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                    {['Tablet', 'TV', 'Cover', 'Pendrive', 'SD Card', 'Other'].map(type => (
                      <SelectItem key={type} value={type} className='text-xs'>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Model</Label>
                {formData.asset_type === 'Tablet' || formData.asset_type === 'TV' || formData.asset_type === 'Cover' ? (
                  <Select
                    value={formData.model || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                    disabled={!formData.asset_type}
                  >
                    <SelectTrigger className='text-xs bg-white border-gray-300'>
                      <SelectValue placeholder='Select model' />
                    </SelectTrigger>
                    <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                      {(formData.asset_type === 'Tablet' ? tabletModels : 
                        formData.asset_type === 'TV' ? tvModels : 
                        formData.asset_type === 'Cover' ? coverModels : []).map(model => (
                        <SelectItem key={model} value={model} className='text-xs'>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : formData.asset_type === 'SD Card' ? (
                  <Select
                    value={formData.model || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger className='text-xs bg-white border-gray-300'>
                      <SelectValue placeholder='Select size' />
                    </SelectTrigger>
                    <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                      {sdCardSizes.map(size => (
                        <SelectItem key={size} value={size} className='text-xs'>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : formData.asset_type === 'Pendrive' ? (
                  <Select
                    value={formData.model || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger className='text-xs bg-white border-gray-300'>
                      <SelectValue placeholder='Select size' />
                    </SelectTrigger>
                    <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                      {pendriveSizes.map(size => (
                        <SelectItem key={size} value={size} className='text-xs'>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : formData.asset_type === 'Other' ? (
                  <Select
                    value={formData.model || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger className='text-xs bg-white border-gray-300'>
                      <SelectValue placeholder='Select material' />
                    </SelectTrigger>
                    <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                      {otherMaterials.map(material => (
                        <SelectItem key={material} value={material} className='text-xs'>{material}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.model || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className='text-xs bg-white border-gray-300'
                    placeholder='Enter model'
                  />
                )}
              </div>
              <div>
                <Label className='text-xs font-medium text-gray-700'>Configuration</Label>
                {formData.asset_type === 'Tablet' || formData.asset_type === 'TV' ? (
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
                ) : (
                  <Input
                    value={formData.configuration || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, configuration: e.target.value }))}
                    className='text-xs bg-white border-gray-300'
                    placeholder='Enter configuration (optional)'
                    disabled={!formData.asset_type}
                  />
                )}
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
              <div key={index} className='flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 flex-wrap'>
                <span className="w-8 text-xs font-bold text-gray-600">{index + 1}.</span>
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
                {isInward && device.asset_status === 'Scrap' && (
                  <Input
                    type="text"
                    value={device.asset_condition || ''}
                    onChange={(e) => updateAssetCondition(index, e.target.value)}
                    placeholder="Asset Condition *"
                    className='text-xs w-48 bg-white border-gray-300'
                  />
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setCurrentSerialIndex(index);
                    setShowScanner(true);
                  }}
                  className='bg-white border-gray-300 flex items-center'
                >
                  <Camera className='w-4 h-4' />
                </Button>
                {serialErrors[index] && <Badge variant="destructive" className='text-xs'>{serialErrors[index]}</Badge>}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeSerialNumber(index)}
                  disabled={formData.quantity <= 1}
                  className='bg-white border-gray-300'
                >
                  <X className='w-4 h-4' />
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