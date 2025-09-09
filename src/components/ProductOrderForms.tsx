import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';

interface BaseOrderFormProps {
  onSave: (orderData: any) => void;
  onCancel: () => void;
}

// Tablet Order Form
export const TabletOrderForm: React.FC<BaseOrderFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product: 'Lead',
    model: '',
    configuration: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    asset_status: 'Fresh',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    profile_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const productOptions = ['Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];
  const tabletModels = ['Lenovo TB301XU', 'IRA T811', 'iPad 9th Gen', 'iPad Air', 'iPad Pro', 'Samsung Tab A8', 'Samsung Tab S8', 'Lenovo Tab M10'];
  const configurationOptions = [
    '1G+8 GB (Android-7)',
    '1G+16 GB (Android-9)', 
    '1G+32 GB (Android-9)',
    '2G+16 GB (Android-9)',
    '2G+32 GB (Android-9)',
    '2G+32 GB (Android-10)',
    '3G+32 GB (Android-10)',
    '3G+32 GB (Android-13)',
    '4G+64 GB (Android-13)'
  ];
  const assetStatusOptions = ['Fresh', 'Refurb', 'Scrap'];
  const warehouses = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];

  const handleQuantityChange = (newQuantity: number) => {
    const quantity = Math.max(1, newQuantity);
    const currentSerials = formData.serial_numbers;
    let newSerials = [...currentSerials];
    
    if (quantity > currentSerials.length) {
      newSerials = [...currentSerials, ...Array(quantity - currentSerials.length).fill('')];
    } else {
      newSerials = currentSerials.slice(0, quantity);
    }
    
    setFormData(prev => ({ ...prev, quantity, serial_numbers: newSerials }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const newSerials = [...formData.serial_numbers];
    newSerials[index] = value;
    setFormData(prev => ({ ...prev, serial_numbers: newSerials }));
  };

  const handleScanSuccess = (result: string) => {
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  const validateForm = () => {
    if (!formData.model || !formData.warehouse || !formData.school_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }
    
    const validSerials = formData.serial_numbers.filter(sn => sn.trim());
    if (validSerials.length !== formData.quantity) {
      toast({
        title: 'Error',
        description: `Number of serial numbers (${validSerials.length}) must match quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave({ ...formData, asset_type: 'Tablet' });
  };

  return (
    <div className="space-y-6">
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EnhancedBarcodeScanner
              isOpen={true}
              onClose={() => setShowScanner(false)}
              onScan={handleScanSuccess}
              existingSerials={formData.serial_numbers}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tablet Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={formData.product} onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Order Type *</Label>
              <Select value={formData.order_type} onValueChange={(value: 'Inward' | 'Outward') => setFormData(prev => ({ ...prev, order_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inward">Inward</SelectItem>
                  <SelectItem value="Outward">Outward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tablet Model *</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tablet model" />
                </SelectTrigger>
                <SelectContent>
                  {tabletModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Configuration</Label>
              <Select value={formData.configuration} onValueChange={(value) => setFormData(prev => ({ ...prev, configuration: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {configurationOptions.map(config => (
                    <SelectItem key={config} value={config}>{config}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset Status *</Label>
              <Select value={formData.asset_status} onValueChange={(value) => setFormData(prev => ({ ...prev, asset_status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warehouse *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  className="text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sales Order</Label>
              <Input
                value={formData.sales_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                placeholder="Enter sales order"
              />
            </div>

            <div>
              <Label>Deal ID</Label>
              <Input
                value={formData.deal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                placeholder="Enter deal ID"
              />
            </div>

            <div>
              <Label>School Name *</Label>
              <Input
                value={formData.school_name}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                placeholder="Enter school name"
                required
              />
            </div>

            <div>
              <Label>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                placeholder="Enter nucleus ID"
              />
            </div>

            <div>
              <Label>Profile ID</Label>
              <Input
                value={formData.profile_id}
                onChange={(e) => setFormData(prev => ({ ...prev, profile_id: e.target.value }))}
                placeholder="Enter profile ID"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers ({formData.serial_numbers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Label className="w-12 text-sm">#{index + 1}</Label>
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentSerialIndex(index);
                  setShowScanner(true);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Create Order</Button>
      </div>
    </div>
  );
};

// TV Order Form  
export const TVOrderForm: React.FC<BaseOrderFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product: 'Lead',
    model: '',
    configuration: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    asset_status: 'Fresh',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const productOptions = ['Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];
  const tvModels = ['Samsung 43" Smart TV', 'LG 50" LED TV', 'Sony 55" 4K TV', 'TCL 43" Android TV', 'Mi TV 50"', 'OnePlus 55" TV'];
  const configurationOptions = [
    '1G+8 GB (Android-7)',
    '1G+16 GB (Android-9)', 
    '1G+32 GB (Android-9)',
    '2G+16 GB (Android-9)',
    '2G+32 GB (Android-9)',
    '2G+32 GB (Android-10)',
    '3G+32 GB (Android-10)',
    '3G+32 GB (Android-13)',
    '4G+64 GB (Android-13)'
  ];
  const assetStatusOptions = ['Fresh', 'Refurb', 'Scrap'];
  const warehouses = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];

  const handleQuantityChange = (newQuantity: number) => {
    const quantity = Math.max(1, newQuantity);
    const currentSerials = formData.serial_numbers;
    let newSerials = [...currentSerials];
    
    if (quantity > currentSerials.length) {
      newSerials = [...currentSerials, ...Array(quantity - currentSerials.length).fill('')];
    } else {
      newSerials = currentSerials.slice(0, quantity);
    }
    
    setFormData(prev => ({ ...prev, quantity, serial_numbers: newSerials }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const newSerials = [...formData.serial_numbers];
    newSerials[index] = value;
    setFormData(prev => ({ ...prev, serial_numbers: newSerials }));
  };

  const handleScanSuccess = (result: string) => {
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  const validateForm = () => {
    if (!formData.model || !formData.warehouse || !formData.school_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }
    
    const validSerials = formData.serial_numbers.filter(sn => sn.trim());
    if (validSerials.length !== formData.quantity) {
      toast({
        title: 'Error',
        description: `Number of serial numbers (${validSerials.length}) must match quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave({ ...formData, asset_type: 'TV' });
  };

  return (
    <div className="space-y-6">
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EnhancedBarcodeScanner
              isOpen={true}
              onClose={() => setShowScanner(false)}
              onScan={handleScanSuccess}
              existingSerials={formData.serial_numbers}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>TV Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={formData.product} onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Order Type *</Label>
              <Select value={formData.order_type} onValueChange={(value: 'Inward' | 'Outward') => setFormData(prev => ({ ...prev, order_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inward">Inward</SelectItem>
                  <SelectItem value="Outward">Outward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>TV Model *</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select TV model" />
                </SelectTrigger>
                <SelectContent>
                  {tvModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Configuration</Label>
              <Select value={formData.configuration} onValueChange={(value) => setFormData(prev => ({ ...prev, configuration: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {configurationOptions.map(config => (
                    <SelectItem key={config} value={config}>{config}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset Status *</Label>
              <Select value={formData.asset_status} onValueChange={(value) => setFormData(prev => ({ ...prev, asset_status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warehouse *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  className="text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sales Order</Label>
              <Input
                value={formData.sales_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                placeholder="Enter sales order"
              />
            </div>

            <div>
              <Label>Deal ID</Label>
              <Input
                value={formData.deal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                placeholder="Enter deal ID"
              />
            </div>

            <div>
              <Label>School Name *</Label>
              <Input
                value={formData.school_name}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                placeholder="Enter school name"
                required
              />
            </div>

            <div>
              <Label>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                placeholder="Enter nucleus ID"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers ({formData.serial_numbers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Label className="w-12 text-sm">#{index + 1}</Label>
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentSerialIndex(index);
                  setShowScanner(true);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Create Order</Button>
      </div>
    </div>
  );
};

// SD Card Order Form
export const SDCardOrderForm: React.FC<BaseOrderFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product: 'Lead',
    model: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    asset_status: 'Fresh',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    sd_card_size: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const productOptions = ['Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];
  const sdCardModels = ['SanDisk 32GB', 'SanDisk 64GB', 'SanDisk 128GB', 'Kingston 32GB', 'Kingston 64GB', 'Samsung EVO 64GB'];
  const assetStatusOptions = ['Fresh', 'Refurb', 'Scrap'];
  const warehouses = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];

  const handleQuantityChange = (newQuantity: number) => {
    const quantity = Math.max(1, newQuantity);
    const currentSerials = formData.serial_numbers;
    let newSerials = [...currentSerials];
    
    if (quantity > currentSerials.length) {
      newSerials = [...currentSerials, ...Array(quantity - currentSerials.length).fill('')];
    } else {
      newSerials = currentSerials.slice(0, quantity);
    }
    
    setFormData(prev => ({ ...prev, quantity, serial_numbers: newSerials }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const newSerials = [...formData.serial_numbers];
    newSerials[index] = value;
    setFormData(prev => ({ ...prev, serial_numbers: newSerials }));
  };

  const handleScanSuccess = (result: string) => {
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  const validateForm = () => {
    if (!formData.model || !formData.warehouse || !formData.school_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }
    
    const validSerials = formData.serial_numbers.filter(sn => sn.trim());
    if (validSerials.length !== formData.quantity) {
      toast({
        title: 'Error',
        description: `Number of serial numbers (${validSerials.length}) must match quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave({ ...formData, asset_type: 'SD Card' });
  };

  return (
    <div className="space-y-6">
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EnhancedBarcodeScanner
              isOpen={true}
              onClose={() => setShowScanner(false)}
              onScan={handleScanSuccess}
              existingSerials={formData.serial_numbers}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SD Card Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={formData.product} onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Order Type *</Label>
              <Select value={formData.order_type} onValueChange={(value: 'Inward' | 'Outward') => setFormData(prev => ({ ...prev, order_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inward">Inward</SelectItem>
                  <SelectItem value="Outward">Outward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>SD Card Model *</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SD card model" />
                </SelectTrigger>
                <SelectContent>
                  {sdCardModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset Status *</Label>
              <Select value={formData.asset_status} onValueChange={(value) => setFormData(prev => ({ ...prev, asset_status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warehouse *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  className="text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sales Order</Label>
              <Input
                value={formData.sales_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                placeholder="Enter sales order"
              />
            </div>

            <div>
              <Label>Deal ID</Label>
              <Input
                value={formData.deal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                placeholder="Enter deal ID"
              />
            </div>

            <div>
              <Label>School Name *</Label>
              <Input
                value={formData.school_name}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                placeholder="Enter school name"
                required
              />
            </div>

            <div>
              <Label>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                placeholder="Enter nucleus ID"
              />
            </div>

            <div>
              <Label>SD Card Size</Label>
              <Input
                value={formData.sd_card_size}
                onChange={(e) => setFormData(prev => ({ ...prev, sd_card_size: e.target.value }))}
                placeholder="Enter SD card size"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers ({formData.serial_numbers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Label className="w-12 text-sm">#{index + 1}</Label>
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentSerialIndex(index);
                  setShowScanner(true);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Create Order</Button>
      </div>
    </div>
  );
};

// Pendrive Order Form  
export const PendriveOrderForm: React.FC<BaseOrderFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product: 'Lead',
    model: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    asset_status: 'Fresh',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const productOptions = ['Lead', 'Propel', 'Pinnacle', 'Techbook', 'BoardAce'];
  const pendriveModels = ['SanDisk 32GB USB 3.0', 'Kingston 64GB USB 3.0', 'HP 32GB USB 2.0', 'Transcend 64GB'];
  const assetStatusOptions = ['Fresh', 'Refurb', 'Scrap'];
  const warehouses = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];

  const handleQuantityChange = (newQuantity: number) => {
    const quantity = Math.max(1, newQuantity);
    const currentSerials = formData.serial_numbers;
    let newSerials = [...currentSerials];
    
    if (quantity > currentSerials.length) {
      newSerials = [...currentSerials, ...Array(quantity - currentSerials.length).fill('')];
    } else {
      newSerials = currentSerials.slice(0, quantity);
    }
    
    setFormData(prev => ({ ...prev, quantity, serial_numbers: newSerials }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const newSerials = [...formData.serial_numbers];
    newSerials[index] = value;
    setFormData(prev => ({ ...prev, serial_numbers: newSerials }));
  };

  const handleScanSuccess = (result: string) => {
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  const validateForm = () => {
    if (!formData.model || !formData.warehouse || !formData.school_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }
    
    const validSerials = formData.serial_numbers.filter(sn => sn.trim());
    if (validSerials.length !== formData.quantity) {
      toast({
        title: 'Error',
        description: `Number of serial numbers (${validSerials.length}) must match quantity (${formData.quantity})`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave({ ...formData, asset_type: 'Pendrive' });
  };

  return (
    <div className="space-y-6">
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EnhancedBarcodeScanner
              isOpen={true}
              onClose={() => setShowScanner(false)}
              onScan={handleScanSuccess}
              existingSerials={formData.serial_numbers}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pendrive Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={formData.product} onValueChange={(value) => setFormData(prev => ({ ...prev, product: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Order Type *</Label>
              <Select value={formData.order_type} onValueChange={(value: 'Inward' | 'Outward') => setFormData(prev => ({ ...prev, order_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inward">Inward</SelectItem>
                  <SelectItem value="Outward">Outward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pendrive Model *</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pendrive model" />
                </SelectTrigger>
                <SelectContent>
                  {pendriveModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset Status *</Label>
              <Select value={formData.asset_status} onValueChange={(value) => setFormData(prev => ({ ...prev, asset_status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warehouse *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  className="text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sales Order</Label>
              <Input
                value={formData.sales_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
                placeholder="Enter sales order"
              />
            </div>

            <div>
              <Label>Deal ID</Label>
              <Input
                value={formData.deal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                placeholder="Enter deal ID"
              />
            </div>

            <div>
              <Label>School Name *</Label>
              <Input
                value={formData.school_name}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                placeholder="Enter school name"
                required
              />
            </div>

            <div>
              <Label>Nucleus ID</Label>
              <Input
                value={formData.nucleus_id}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
                placeholder="Enter nucleus ID"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers ({formData.serial_numbers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Label className="w-12 text-sm">#{index + 1}</Label>
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentSerialIndex(index);
                  setShowScanner(true);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Create Order</Button>
      </div>
    </div>
  );
};

// Main component to handle product type selection
interface ProductOrderFormsProps {
  productType: string | null;
  onClose: () => void;
}

export const ProductOrderForms: React.FC<ProductOrderFormsProps> = ({ productType, onClose }) => {
  const handleOrderSave = (orderData: any) => {
    console.log('Order saved:', orderData);
    // TODO: Implement actual order saving
    onClose();
  };

  const renderForm = () => {
    switch (productType) {
      case 'Tablet':
        return <TabletOrderForm onSave={handleOrderSave} onCancel={onClose} />;
      case 'TV':
        return <TVOrderForm onSave={handleOrderSave} onCancel={onClose} />;
      case 'SD Card':
        return <SDCardOrderForm onSave={handleOrderSave} onCancel={onClose} />;
      case 'Pendrive':
        return <PendriveOrderForm onSave={handleOrderSave} onCancel={onClose} />;
      default:
        return null;
    }
  };

  return renderForm();
};
