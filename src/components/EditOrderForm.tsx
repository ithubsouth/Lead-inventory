import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Camera, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Order, EditHistoryEntry } from './types';
import { generateDummyId, formatDate } from './utils';

interface EditOrderFormProps {
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

const EditOrderForm: React.FC<EditOrderFormProps> = ({ order, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Order>({ ...order });
  const [originalOrder] = useState<Order>({ ...order });
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newAssetStatus, setNewAssetStatus] = useState('Fresh');
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const assetStatuses = ['Fresh', 'Refurb', 'Scrap'];

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      serial_numbers: prev.serial_numbers || [],
      asset_statuses: prev.asset_statuses || Array(prev.quantity).fill('Fresh'),
      editHistory: prev.editHistory || [],
    }));
  }, [order]);

  const generateEditHistoryEntry = (originalOrder: Order, updatedOrder: Order): EditHistoryEntry | null => {
    const changedFields: string[] = [];
    const changes: string[] = [];

    if (originalOrder.serial_numbers?.length !== updatedOrder.serial_numbers?.length) {
      changedFields.push('serial_numbers');
      changes.push(`Serial Numbers: ${originalOrder.serial_numbers?.length || 0} → ${updatedOrder.serial_numbers?.length || 0}`);
    }
    if (JSON.stringify(originalOrder.asset_statuses) !== JSON.stringify(updatedOrder.asset_statuses)) {
      changedFields.push('asset_statuses');
      changes.push('Asset Statuses updated');
    }
    if (changes.length === 0) return null;

    return {
      timestamp: new Date().toISOString(),
      changes: changes.join(', '),
      changedFields,
    };
  };

  const addSerialNumber = (serial: string, assetStatus: string = 'Fresh') => {
    if (serial.trim()) {
      setFormData(prev => {
        const newSerials = [...(prev.serial_numbers || []), serial.trim()];
        const newStatuses = [...(prev.asset_statuses || []), assetStatus];
        return {
          ...prev,
          serial_numbers: newSerials,
          asset_statuses: newStatuses,
          quantity: Math.max(prev.quantity || 1, newSerials.length),
        };
      });
      setNewSerialNumber('');
      setNewAssetStatus('Fresh');
    }
  };

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
    if (currentSerialIndex !== null && (formData.serial_numbers?.length || 0) > currentSerialIndex) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    } else {
      addSerialNumber(result, newAssetStatus);
    }
    setShowScanner(false);
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
    const validSerials = (formData.serial_numbers || []).filter(sn => sn.trim());
    if (validSerials.length > formData.quantity) {
      toast({
        title: 'Error',
        description: `Number of serial numbers (${validSerials.length}) exceeds quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    let originalDevices: any[] = [];
    let updateSucceeded = false;

    try {
      setLoading(true);

      // Get the authenticated user's email
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('Failed to retrieve authenticated user email');
      }
      const userEmail = userData.user.email;

      // Fetch original devices for potential rollback
      const { data: fetchedOriginalDevices, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .eq('order_id', formData.id);
      if (fetchError) throw fetchError;
      originalDevices = fetchedOriginalDevices || [];

      // Prepare history and valid data
      const validSerials = (formData.serial_numbers || []).filter(sn => sn.trim());
      const validAssetStatuses = (formData.asset_statuses || []).slice(0, validSerials.length).concat(Array(Math.max(0, formData.quantity - validSerials.length)).fill('Fresh'));
      const historyEntry = generateEditHistoryEntry(originalOrder, formData);
      const updatedEditHistory = [...(formData.editHistory || [])];
      if (historyEntry) updatedEditHistory.push(historyEntry);

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          sales_order: formData.sales_order || null,
          deal_id: formData.deal_id || null,
          school_name: formData.school_name,
          nucleus_id: formData.nucleus_id || null,
          quantity: formData.quantity,
          warehouse: formData.warehouse,
          serial_numbers: validSerials,
          asset_statuses: validAssetStatuses,
          updated_at: new Date().toISOString(),
          editHistory: updatedEditHistory,
          updated_by: userEmail, // Use email for updated_by
        })
        .eq('id', formData.id);
      if (orderError) throw orderError;

      // Update or insert devices, creating new records for non-existing serials
      const existingDeviceMap = new Map(originalDevices.map(d => [d.serial_number, d]));
      const newDevices = validSerials.map((serial, i) => {
        const existingDevice = existingDeviceMap.get(serial);
        return {
          id: existingDevice?.id || generateDummyId('DEV'),
          asset_type: formData.asset_type,
          model: formData.model,
          product: (formData.asset_type === 'Tablet' || formData.asset_type === 'TV') ? formData.product || null : null,
          serial_number: serial.trim(),
          warehouse: formData.warehouse,
          sales_order: formData.sales_order || generateDummyId('SO'),
          deal_id: formData.deal_id || null,
          school_name: formData.school_name,
          nucleus_id: formData.nucleus_id || null,
          status: formData.order_type === 'Inward' ? 'Available' : 'Assigned',
          order_id: formData.id,
          created_at: existingDevice?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          configuration: formData.configuration || null,
          asset_status: validAssetStatuses[i] || 'Fresh',
          created_by: existingDevice?.created_by || userEmail, // Preserve existing created_by or use email
          updated_by: userEmail, // Use email for updated_by
        };
      });

      for (const device of newDevices) {
        if (device.id && existingDeviceMap.has(device.serial_number)) {
          const { error: updateError } = await supabase
            .from('devices')
            .update(device)
            .eq('id', device.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('devices')
            .insert(device);
          if (insertError) throw insertError;
        }
      }

      // Mark removed devices as deleted
      const removedSerials = (originalOrder.serial_numbers || []).filter(sn => !validSerials.includes(sn));
      if (removedSerials.length > 0) {
        const { error: deleteError } = await supabase
          .from('devices')
          .update({ is_deleted: true, updated_at: new Date().toISOString(), updated_by: userEmail })
          .in('serial_number', removedSerials)
          .eq('order_id', formData.id);
        if (deleteError) throw deleteError;
      }

      updateSucceeded = true;
      const updatedFormData = { ...formData, editHistory: updatedEditHistory };
      onSave(updatedFormData);
      toast({ title: 'Success', description: 'Order and devices updated successfully' });
    } catch (error) {
      console.error('Error updating order:', error);

      if (updateSucceeded) {
        const rollbackFields = {
          sales_order: originalOrder.sales_order || null,
          deal_id: originalOrder.deal_id || null,
          school_name: originalOrder.school_name,
          nucleus_id: originalOrder.nucleus_id || null,
          quantity: originalOrder.quantity,
          warehouse: originalOrder.warehouse,
          serial_numbers: originalOrder.serial_numbers || [],
          asset_statuses: originalOrder.asset_statuses || [],
          updated_at: new Date().toISOString(),
          editHistory: originalOrder.editHistory || [],
          updated_by: userEmail, // Use email for rollback
        };
        const { error: rollbackError } = await supabase
          .from('orders')
          .update(rollbackFields)
          .eq('id', formData.id);
        if (rollbackError) {
          console.error('Failed to rollback order:', rollbackError);
          toast({
            title: 'Warning',
            description: 'Order rollback failed. Contact admin.',
            variant: 'destructive',
          });
        }

        for (const device of originalDevices) {
          if (device.id) {
            const { error: restoreError } = await supabase
              .from('devices')
              .update({ ...device, updated_at: new Date().toISOString(), updated_by: userEmail })
              .eq('id', device.id);
            if (restoreError) {
              console.error('Failed to restore device:', restoreError);
              toast({
                title: 'Critical Error',
                description: 'Device restore failed. Contact admin.',
                variant: 'destructive',
              });
              break;
            }
          }
        }
      }

      toast({
        title: 'Error',
        description: 'Failed to update order. Changes rolled back.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4 relative'>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 rounded-full p-1 hover:bg-muted z-10"
        onClick={onCancel}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Order Information</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div>
              <Label className='text-xs text-gray-500'>Sales Order</Label>
              <Input
                value={formData.sales_order || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                className='text-sm'
              />
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Deal ID</Label>
              <Input
                value={formData.deal_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                className='text-sm'
              />
            </div>
            <div>
              <Label className='text-xs text-gray-500'>School Name *</Label>
              <Input
                value={formData.school_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                required
                className='text-sm'
              />
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                className='text-sm'
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Product Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div>
              <Label className='text-xs text-gray-500'>Order Type</Label>
              <Badge variant={formData.order_type === 'Inward' ? 'default' : 'secondary'} className='text-sm'>
                {formData.order_type}
              </Badge>
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Asset Type</Label>
              <p className='text-sm'>{formData.asset_type}</p>
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Model</Label>
              <p className='text-sm'>{formData.model}</p>
            </div>
            {(formData.asset_type === 'Tablet' || formData.asset_type === 'TV') && (
              <>
                <div>
                  <Label className='text-xs text-gray-500'>Product</Label>
                  <p className='text-sm'>{formData.product || 'N/A'}</p>
                </div>
                <div>
                  <Label className='text-xs text-gray-500'>Configuration</Label>
                  <p className='text-sm'>{formData.configuration || 'N/A'}</p>
                </div>
              </>
            )}
            <div>
              <Label className='text-xs text-gray-500'>Quantity</Label>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className='h-3 w-3' />
                </Button>
                <Input
                  type='number'
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min='1'
                  className='text-center text-sm'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className='h-3 w-3' />
                </Button>
              </div>
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Warehouse</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger className='text-sm'>
                  <SelectValue placeholder='Select warehouse' />
                </SelectTrigger>
                <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[120px]'>
                  {locations.map(location => (
                    <SelectItem key={location} value={location} className='text-sm'>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs text-gray-500'>Order Date</Label>
              <p className='text-sm'>{formatDate(formData.order_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Serial Numbers & Asset Statuses ({(formData.serial_numbers || []).length})</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 relative'>
          <div className='flex gap-2'>
            <Input
              placeholder='Enter serial number'
              value={newSerialNumber}
              onChange={(e) => setNewSerialNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSerialNumber(newSerialNumber, newAssetStatus);
                }
              }}
              className='text-sm'
            />
            <Select
              key={`new-asset-status-${newAssetStatus}`}
              value={newAssetStatus}
              onValueChange={setNewAssetStatus}
            >
              <SelectTrigger className='text-sm w-32'>
                <SelectValue placeholder='Asset Status' />
              </SelectTrigger>
              <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[120px]'>
                {assetStatuses.map(status => (
                  <SelectItem key={status} value={status} className='text-sm'>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => addSerialNumber(newSerialNumber, newAssetStatus)}
              variant='outline'
              size='sm'
            >
              Add
            </Button>
            <Button
              onClick={() => {
                setCurrentSerialIndex(null);
                setShowScanner(true);
              }}
              variant='outline'
              size='sm'
            >
              <Camera className='w-3 h-3' />
            </Button>
          </div>

          {(formData.serial_numbers || []).length > 0 && (
            <div className='space-y-2'>
              <Label className='text-xs text-gray-500'>Added Serial Numbers & Asset Statuses ({(formData.serial_numbers || []).length})</Label>
              <div className='flex flex-wrap gap-2'>
                {(formData.serial_numbers || []).map((serial, index) => (
                  <div key={index} className='flex items-center gap-1 bg-muted p-1 rounded'>
                    <Input
                      value={serial || ''}
                      onChange={(e) => updateSerialNumber(index, e.target.value)}
                      className='font-mono text-xs w-40'
                      placeholder={`Serial ${index + 1}`}
                    />
                    <Select
                      key={`asset-status-${index}-${formData.asset_statuses?.[index] || 'Fresh'}`}
                      value={formData.asset_statuses?.[index] || 'Fresh'}
                      onValueChange={(value) => updateAssetStatus(index, value)}
                    >
                      <SelectTrigger className='text-sm w-24'>
                        <SelectValue placeholder='Asset Status' />
                      </SelectTrigger>
                      <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[120px]'>
                        {assetStatuses.map(status => (
                          <SelectItem key={status} value={status} className='text-sm'>{status}</SelectItem>
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
                      <Camera className='w-3 h-3' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeSerialNumber(index)}
                    >
                      <X className='w-3 h-3' />
                    </Button>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, formData.quantity - (formData.serial_numbers?.length || 0)) }, (_, i) => (
                  <div key={`empty-${i}`} className='flex items-center gap-1 bg-muted p-1 rounded'>
                    <Input
                      value=''
                      onChange={(e) => updateSerialNumber((formData.serial_numbers?.length || 0) + i, e.target.value)}
                      className='font-mono text-xs w-40'
                      placeholder={`Serial ${((formData.serial_numbers?.length || 0) + i + 1)}`}
                    />
                    <Select
                      key={`empty-asset-status-${i}-${formData.asset_statuses?.[(formData.serial_numbers?.length || 0) + i] || 'Fresh'}`}
                      value={formData.asset_statuses?.[(formData.serial_numbers?.length || 0) + i] || 'Fresh'}
                      onValueChange={(value) => updateAssetStatus((formData.serial_numbers?.length || 0) + i, value)}
                    >
                      <SelectTrigger className='text-sm w-24'>
                        <SelectValue placeholder='Asset Status' />
                      </SelectTrigger>
                      <SelectContent className='z-[1000] bg-white shadow-lg border min-w-[120px]'>
                        {assetStatuses.map(status => (
                          <SelectItem key={status} value={status} className='text-sm'>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setCurrentSerialIndex((formData.serial_numbers?.length || 0) + i);
                        setShowScanner(true);
                      }}
                    >
                      <Camera className='w-3 h-3' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeSerialNumber((formData.serial_numbers?.length || 0) + i)}
                    >
                      <X className='w-3 h-3' />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onCancel} disabled={loading} size='sm'>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} size='sm'>
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