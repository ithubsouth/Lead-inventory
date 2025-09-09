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
    product: 'Tablet',
    model: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
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

  const tabletModels = ['iPad 9th Gen', 'iPad Air', 'iPad Pro', 'Samsung Tab A8', 'Samsung Tab S8', 'Lenovo Tab M10'];
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
    onSave(formData);
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
    product: 'TV',
    model: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const tvModels = ['Samsung 43" Smart TV', 'LG 50" LED TV', 'Sony 55" 4K TV', 'TCL 43" Android TV', 'Mi TV 50"', 'OnePlus 55" TV'];
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
    onSave(formData);
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
    product: 'SD Card',
    model: '',
    sd_card_size: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const sdCardSizes = ['32GB', '64GB', '128GB', '256GB', '512GB'];
  const sdCardModels = ['SanDisk Ultra', 'Samsung EVO Select', 'Kingston Canvas Select', 'Lexar Professional', 'PNY Elite'];
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
    if (!formData.model || !formData.sd_card_size || !formData.warehouse || !formData.school_name.trim()) {
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
    onSave({ ...formData, model: `${formData.model} ${formData.sd_card_size}` });
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
              <Label>SD Card Size *</Label>
              <Select value={formData.sd_card_size} onValueChange={(value) => setFormData(prev => ({ ...prev, sd_card_size: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SD card size" />
                </SelectTrigger>
                <SelectContent>
                  {sdCardSizes.map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
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

// Pendrive Order Form
export const PendriveOrderForm: React.FC<BaseOrderFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product: 'Pendrive',
    model: '',
    pendrive_size: '',
    quantity: 1,
    warehouse: '',
    order_type: 'Inward' as 'Inward' | 'Outward',
    sales_order: '',
    deal_id: '',
    school_name: '',
    nucleus_id: '',
    serial_numbers: ['']
  });
  
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const pendriveSizes = ['8GB', '16GB', '32GB', '64GB', '128GB'];
  const pendriveModels = ['SanDisk Cruzer Blade', 'Kingston DataTraveler', 'HP v236w', 'Sony USM32CA3', 'Transcend JetFlash'];
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
    if (!formData.model || !formData.pendrive_size || !formData.warehouse || !formData.school_name.trim()) {
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
    onSave({ ...formData, model: `${formData.model} ${formData.pendrive_size}` });
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
              <Label>Pendrive Size *</Label>
              <Select value={formData.pendrive_size} onValueChange={(value) => setFormData(prev => ({ ...prev, pendrive_size: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pendrive size" />
                </SelectTrigger>
                <SelectContent>
                  {pendriveSizes.map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
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