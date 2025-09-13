import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Camera, X, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Order } from './types';
import { formatDate } from './utils';

interface EditOrderFormProps {
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

const EditOrderForm: React.FC<EditOrderFormProps> = ({ order, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Order>(() => {
    const data = { ...order };
    data.serial_numbers = data.serial_numbers?.length > 0 ? data.serial_numbers : Array(data.quantity || 1).fill('');
    data.asset_statuses = data.asset_statuses || Array(data.quantity || 1).fill('Fresh');
    data.asset_group = data.asset_group || 'NFA'; // Default to NFA if not set
    return data;
  });
  const [originalOrder] = useState<Order>({ ...order });
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
  const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const assetStatuses = ['Fresh', 'Refurb', 'Scrap'];
  const assetGroups = ['NFA', 'FA'];

  const serialNumbers = formData.serial_numbers || [];
  const filledCount = serialNumbers.filter(sn => sn.trim()).length;

  useEffect(() => {
    if (formData.asset_type && !['Tablet', 'TV'].includes(formData.asset_type)) {
      setFormData(prev => ({
        ...prev,
        model: '',
        configuration: '',
      }));
    }
  }, [formData.asset_type]);

  const removeSerialNumber = (index: number) => {
    setFormData(prev => {
      if ((prev.serial_numbers?.length || 0) <= index) return prev;
      const newSerials = (prev.serial_numbers || []).filter((_, i) => i !== index);
      const newStatuses = (prev.asset_statuses || []).filter((_, i) => i !== index);
      return {
        ...prev,
        serial_numbers: newSerials,
        asset_statuses: newStatuses,
        quantity: Math.max(1, newSerials.length),
      };
    });
  };

  const updateSerialNumber = (index: number, value: string) => {
    const trimmedValue = value.trim();
    setFormData(prev => {
      const newSerials = [...(prev.serial_numbers || [])];
      newSerials[index] = trimmedValue;
      return { ...prev, serial_numbers: newSerials };
    });
  };

  const updateAssetStatus = (index: number, value: string) => {
    setFormData(prev => {
      const newStatuses = [...(prev.asset_statuses || [])];
      newStatuses[index] = value;
      return { ...prev, asset_statuses: newStatuses };
    });
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
    const currentSerials = formData.serial_numbers || [];
    const currentStatuses = formData.asset_statuses || [];
    const newSerialNumbers = [...currentSerials, ...Array(newQuantity - currentSerials.length).fill('')].slice(0, newQuantity);
    const newAssetStatuses = [...currentStatuses, ...Array(newQuantity - currentStatuses.length).fill('Fresh')].slice(0, newQuantity);
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      serial_numbers: newSerialNumbers,
      asset_statuses: newAssetStatuses,
    }));
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
    if (!formData.asset_group) {
      toast({ title: 'Error', description: 'Asset Group is required', variant: 'destructive' });
      return false;
    }
    if (!assetGroups.includes(formData.asset_group)) {
      toast({
        title: 'Validation Error',
        description: `Invalid asset group: ${formData.asset_group}. Must be FA or NFA.`,
        variant: 'destructive',
      });
      return false;
    }
    const validStatusesCount = (formData.asset_statuses || []).length;
    if (validStatusesCount !== formData.quantity) {
      toast({
        title: 'Warning',
        description: `Asset statuses length does not match quantity. Some may be missing.`,
        variant: 'default',
      });
      return true;
    }
    return true;
  };

  const logHistory = async (tableName: string, recordId: string, fieldName: string, oldData: string, newData: string, userEmail: string, salesOrder: string | null, operation: string) => {
    const { error } = await supabase
      .from('history')
      .insert({
        record_id: recordId,
        sales_order: salesOrder,
        table_name: tableName,
        field_name: fieldName,
        old_data: oldData,
        new_data: newData,
        operation: operation,
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
    let devicesDeleted = false;
    let devicesInserted = false;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Authentication failed: Unable to retrieve user email');
      }
      const userEmail = userData.user.email;

      const allSerials = formData.serial_numbers || Array(formData.quantity).fill('');
      const allAssetStatuses = formData.asset_statuses || Array(formData.quantity).fill('Fresh');

      const fieldsToCompare = [
        'order_type',
        'asset_type',
        'model',
        'configuration',
        'product',
        'sales_order',
        'deal_id',
        'school_name',
        'nucleus_id',
        'quantity',
        'warehouse',
        'asset_group',
      ];

      const historyEntries: { tableName: string; recordId: string; fieldName: string; oldData: string; newData: string; operation: string }[] = [];

      for (const field of fieldsToCompare) {
        const oldValue = originalOrder[field as keyof Order] ?? '';
        const newValue = formData[field as keyof Order] ?? '';
        if (oldValue !== newValue) {
          historyEntries.push({
            tableName: 'orders',
            recordId: formData.id,
            fieldName: field,
            oldData: String(oldValue),
            newData: String(newValue),
            operation: 'UPDATE',
          });
        }
      }

      const originalSerials = originalOrder.serial_numbers || Array(originalOrder.quantity).fill('');
      const originalStatuses = originalOrder.asset_statuses || Array(originalOrder.quantity).fill('Fresh');
      const maxLength = Math.max(originalSerials.length, allSerials.length, originalStatuses.length, allAssetStatuses.length);

      for (let i = 0; i < maxLength; i++) {
        const oldSerial = originalSerials[i] || '';
        const newSerial = allSerials[i] || '';
        const oldStatus = originalStatuses[i] || 'Fresh';
        const newStatus = allAssetStatuses[i] || 'Fresh';

        if (oldSerial !== newSerial) {
          historyEntries.push({
            tableName: 'devices',
            recordId: formData.id,
            fieldName: `serial_number_${i + 1}`,
            oldData: oldSerial,
            newData: newSerial,
            operation: 'UPDATE',
          });
        }

        if (oldStatus !== newStatus) {
          historyEntries.push({
            tableName: 'devices',
            recordId: formData.id,
            fieldName: `asset_status_${i + 1}`,
            oldData: oldStatus,
            newData: newStatus,
            operation: 'UPDATE',
          });
        }
      }

      for (const entry of historyEntries) {
        await logHistory(
          entry.tableName,
          entry.recordId,
          entry.fieldName,
          entry.oldData,
          entry.newData,
          userEmail,
          formData.sales_order || originalOrder.sales_order || null,
          entry.operation
        );
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          order_type: formData.order_type,
          asset_type: formData.asset_type,
          model: formData.model,
          configuration: formData.configuration || null,
          product: formData.product || null,
          sales_order: formData.sales_order || null,
          deal_id: formData.deal_id || null,
          school_name: formData.school_name,
          nucleus_id: formData.nucleus_id || null,
          quantity: formData.quantity,
          warehouse: formData.warehouse,
          serial_numbers: allSerials,
          asset_group: formData.asset_group,
          updated_at: new Date().toISOString(),
          updated_by: userEmail,
        })
        .eq('id', formData.id)
        .select();

      if (orderUpdateError) throw new Error(`Order update failed: ${orderUpdateError.message}`);
      orderUpdated = true;

      const { error: deleteError } = await supabase
        .from('devices')
        .delete()
        .eq('order_id', formData.id);

      if (deleteError) throw new Error(`Failed to delete existing devices: ${deleteError.message}`);
      devicesDeleted = true;

      const newDevices = Array.from({ length: formData.quantity }, (_, i) => ({
        asset_type: formData.asset_type,
        model: formData.model,
        serial_number: allSerials[i] || '',
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
        asset_status: allAssetStatuses[i] || 'Fresh',
        asset_group: formData.asset_group,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        created_by: userEmail,
        updated_by: userEmail,
      }));

      const { error: insertError } = await supabase
        .from('devices')
        .insert(newDevices);

      if (insertError) throw new Error(`Failed to insert new devices: ${insertError.message}`);
      devicesInserted = true;

      onSave(formData);
      toast({ title: 'Success', description: 'Order and devices updated successfully. Changes logged in history.' });
    } catch (error) {
      console.error('Error during save:', error);

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || '';

      try {
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

        if (devicesDeleted && !devicesInserted) {
          console.warn('Devices were deleted but not re-inserted. Manual intervention may be needed.');
          toast({ title: 'Warning', description: 'Devices rollback incomplete. Check database.', variant: 'destructive' });
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
    <div className='space-y-6 relative w-full mx-auto p-12 bg-white rounded-lg shadow-lg max-w-none'>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 rounded-full p-2 hover:bg-muted z-10"
        onClick={onCancel}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <Card>
          <CardHeader>
            <CardTitle className='text-xl'>Order Information</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label className='text-sm text-gray-500'>Order Type *</Label>
              <Select
                value={formData.order_type || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, order_type: value }))}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select order type' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {orderTypes.map(type => (
                    <SelectItem key={type} value={type} className='text-base'>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Asset Type</Label>
              <Select
                value={formData.asset_type || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, asset_type: value }))}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select asset type' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {['Tablet', 'TV'].map(type => (
                    <SelectItem key={type} value={type} className='text-base'>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Model</Label>
              <Select
                value={formData.model || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                disabled={!formData.asset_type}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select model' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {(formData.asset_type === 'Tablet' ? tabletModels : formData.asset_type === 'TV' ? tvModels : []).map(model => (
                    <SelectItem key={model} value={model} className='text-base'>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Configuration</Label>
              <Select
                value={formData.configuration || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, configuration: value }))}
                disabled={!formData.asset_type}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select configuration' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {(formData.asset_type === 'Tablet' ? configurations : formData.asset_type === 'TV' ? tvConfigurations : []).map(config => (
                    <SelectItem key={config} value={config} className='text-base'>{config}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Product</Label>
              <Select
                value={formData.product || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select product' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {products.map(product => (
                    <SelectItem key={product} value={product} className='text-base'>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Asset Group *</Label>
              <Select
                value={formData.asset_group || 'NFA'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, asset_group: value }))}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select asset group' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {assetGroups.map(group => (
                    <SelectItem key={group} value={group} className='text-base'>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Sales Order</Label>
              <Input
                value={formData.sales_order || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                className='text-base'
              />
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Deal ID</Label>
              <Input
                value={formData.deal_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                className='text-base'
              />
            </div>
            <div>
              <Label className='text-sm text-gray-500'>School Name *</Label>
              <Input
                value={formData.school_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                required
                className='text-base'
              />
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                className='text-base'
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-xl'>Logistics Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label className='text-sm text-gray-500'>Quantity</Label>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className='h-4 w-4' />
                </Button>
                <Input
                  type='number'
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min='1'
                  className='text-center text-base w-24'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Warehouse</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger className='text-base'>
                  <SelectValue placeholder='Select warehouse' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[150px]'>
                  {locations.map(location => (
                    <SelectItem key={location} value={location} className='text-base'>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Material Type</Label>
              <Badge variant={formData.material_type === 'Inward' ? 'default' : 'secondary'} className='text-base'>
                {formData.material_type || 'N/A'}
              </Badge>
            </div>
            <div>
              <Label className='text-sm text-gray-500'>Order Date</Label>
              <p className='text-base'>{formatDate(formData.order_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='mt-8'>
        <CardHeader>
          <CardTitle className='text-xl'>Serial Numbers & Asset Statuses ({filledCount} / {formData.quantity})</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 pt-6'>
          <div className='mb-4'>
            <Label className='text-sm text-gray-500'>Search Serial Number</Label>
            <div className='flex gap-2'>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search serial number...'
                className='text-base'
              />
              <Button onClick={() => {}} size='sm' disabled>
                <Search className='h-4 w-4' />
              </Button>
            </div>
          </div>
          <Label className='text-sm text-gray-500'>Update serial numbers individually (partial updates allowed)</Label>
          {Array.from({ length: formData.quantity }, (_, index) => {
            const serial = serialNumbers[index] || '';
            const shouldShow = !searchQuery || serial.toLowerCase().includes(searchQuery.toLowerCase());
            return shouldShow ? (
              <div key={index} className='flex items-center gap-3 bg-muted p-3 rounded-lg'>
                <Input
                  value={serial}
                  onChange={(e) => updateSerialNumber(index, e.target.value)}
                  className='font-mono text-base w-96 flex-1'
                  placeholder={`Serial ${index + 1} (optional - can update later)`}
                />
                <Select
                  key={`asset-status-${index}-${formData.asset_statuses?.[index] || 'Fresh'}`}
                  value={formData.asset_statuses?.[index] || 'Fresh'}
                  onValueChange={(value) => updateAssetStatus(index, value)}
                >
                  <SelectTrigger className='text-base w-48'>
                    <SelectValue placeholder='Asset Status' />
                  </SelectTrigger>
                  <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[140px]'>
                    {assetStatuses.map(status => (
                      <SelectItem key={status} value={status} className='text-base'>{status}</SelectItem>
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
                >
                  <Camera className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeSerialNumber(index)}
                  disabled={formData.quantity <= 1}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            ) : null;
          })}
          {filledCount < formData.quantity && (
            <p className='text-sm text-yellow-600'>Info: {formData.quantity - filledCount} serial(s) remaining. You can save now and update later.</p>
          )}
        </CardContent>
      </Card>

      <div className='flex justify-end gap-3 mt-8'>
        <Button variant='outline' onClick={onCancel} disabled={loading} size='lg' className='px-8'>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} size='lg' className='px-8'>
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