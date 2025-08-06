import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, Package, BarChart3, Archive, RotateCcw, Plus, Trash2, Search, Camera, Eye, Edit, X, Minus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TabletItem {
  id: string;
  model: string;
  sdCardSize?: string;
  profileId?: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
}

interface TVItem {
  id: string;
  model: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
}

interface Order {
  id: string;
  order_type: 'Inward' | 'Outward';
  product: 'Tablet' | 'TV';
  model: string;
  quantity: number;
  warehouse: string;
  serial_numbers: string[];
  sales_order?: string;
  deal_id?: string;
  school_name?: string;
  nucleus_id?: string;
  order_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
  created_by?: string;
  updated_by?: string;
  status?: 'Success' | 'Failed' | 'Pending';
  orderCount?: string;
}

interface Device {
  id: string;
  product: 'Tablet' | 'TV';
  model: string;
  serial_number: string;
  warehouse: string;
  status: 'Available' | 'Assigned' | 'Unassigned';
  order_id?: string;
  sales_order?: string;
  deal_id?: string;
  school_name?: string;
  nucleus_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
  created_by?: string;
  updated_by?: string;
}

interface OrderSummary {
  warehouse: string;
  product: string;
  model: string;
  inward: number;
  outward: number;
  available: number;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const EditOrderForm = ({ order, onSave, onCancel }: {
  order: Order;
  onSave: (order: Order) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Order>({ ...order });
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const addSerialNumber = (serial: string) => {
    if (serial) {
      setFormData(prev => ({
        ...prev,
        serial_numbers: [...prev.serial_numbers, serial.trim()]
      }));
      setNewSerialNumber('');
    }
  };

  const removeSerialNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serial_numbers: prev.serial_numbers.filter((_, i) => i !== index)
    }));
  };

  const updateSerialNumber = (index: number, value: string) => {
    const trimmedValue = value.trim();
    const newSerialNumbers = [...formData.serial_numbers];
    newSerialNumbers[index] = trimmedValue;
    setFormData(prev => ({
      ...prev,
      serial_numbers: newSerialNumbers
    }));
  };

  const handleScanSuccess = (result: string) => {
    if (currentSerialIndex !== null) {
      updateSerialNumber(currentSerialIndex, result);
      setCurrentSerialIndex(null);
    } else {
      addSerialNumber(result);
    }
    setShowScanner(false);
  };

  const handleQuantityChange = (value: number) => {
    const newQuantity = Math.max(1, value);
    const currentSerials = formData.serial_numbers || [];
    const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '');
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      serial_numbers: newSerialNumbers
    }));
  };

  const validateForm = () => {
    if (!formData.school_name?.trim()) {
      toast({
        title: "Validation Error",
        description: "School Name is required",
        variant: "destructive"
      });
      return false;
    }
    const validSerials = formData.serial_numbers.filter(sn => sn.trim());
    if (formData.quantity !== validSerials.length) {
      toast({
        title: "Validation Error",
        description: "The number of serial numbers must match the quantity",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.warehouse) {
      toast({
        title: "Validation Error",
        description: "Warehouse is required",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Sales Order</Label>
              <Input
                value={formData.sales_order || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_order: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Deal ID</Label>
              <Input
                value={formData.deal_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">School Name *</Label>
              <Input
                value={formData.school_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nucleus ID</Label>
              <Input
                value={formData.nucleus_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleus_id: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Order Type</Label>
              <Badge variant={formData.order_type === 'Inward' ? 'default' : 'secondary'}>
                {formData.order_type}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Product</Label>
              <p>{formData.product}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Model</Label>
              <p>{formData.model}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
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
                  className="text-center"
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
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Warehouse</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'].map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
              <p>{formatDate(formData.order_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers ({formData.serial_numbers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter serial number"
              value={newSerialNumber}
              onChange={(e) => setNewSerialNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSerialNumber(newSerialNumber);
                }
              }}
            />
            <Button 
              onClick={() => addSerialNumber(newSerialNumber)}
              variant="outline"
            >
              Add
            </Button>
            <Button 
              onClick={() => {
                setCurrentSerialIndex(null);
                setShowScanner(true);
              }}
              variant="outline"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          {formData.serial_numbers.length > 0 && (
            <div className="space-y-2">
              <Label>Added Serial Numbers ({formData.serial_numbers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {formData.serial_numbers.map((serial, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted p-2 rounded">
                    <Input
                      value={serial}
                      onChange={(e) => updateSerialNumber(index, e.target.value)}
                      className="font-mono text-sm w-40"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentSerialIndex(index);
                        setShowScanner(true);
                      }}
                    >
                      <Camera className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSerialNumber(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
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

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<{ itemId: string; index: number; type: 'tablet' | 'tv' } | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusDialogOrder, setStatusDialogOrder] = useState<Order | null>(null);
  const [statusError, setStatusError] = useState<string>('');
  
  // Pagination states
  const [currentOrdersPage, setCurrentOrdersPage] = useState(1);
  const [currentDevicesPage, setCurrentDevicesPage] = useState(1);
  const [ordersPerPage] = useState(100);
  const [devicesPerPage] = useState(100);
  
  const { toast } = useToast();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [orderType, setOrderType] = useState('');
  const [salesOrder, setSalesOrder] = useState('');
  const [dealId, setDealId] = useState('');
  const [nucleusId, setNucleusId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [tablets, setTablets] = useState<TabletItem[]>([]);
  const [tvs, setTvs] = useState<TVItem[]>([]);

  const orderTypes = [
    'Hardware',
    'Additional hardware',
    'Exp Hub',
    'Stock movement',
    'Employee',
    'Stock',
    'Return',
    'Other'
  ];
  const tabletModels = ['TB301FU', 'TB301XU', 'TB-8505F', 'TB-7306F', 'TB-7306X', 'TB-7305X'];
  const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];
  const sdCardSizes = ['64 GB', '128 GB'];
  const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const warehouseOptions = ['All', ...locations];
  const productOptions = ['All', 'Tablet', 'TV'];
  const modelOptions = ['All', ...tabletModels, ...tvModels];

  useEffect(() => {
    loadOrders();
    loadDevices();
    loadOrderSummary();
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const generateDummyId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('order_id, serial_number');
      if (devicesError) throw devicesError;

      const devicesByOrderId = new Map<string, string[]>();
      devicesData.forEach((device: { order_id: string; serial_number: string }) => {
        if (device.order_id) {
          if (!devicesByOrderId.has(device.order_id)) {
            devicesByOrderId.set(device.order_id, []);
          }
          devicesByOrderId.get(device.order_id)!.push(device.serial_number);
        }
      });

      const ordersWithStatus = (ordersData || []).map((order: any) => {
        const orderDevices = devicesByOrderId.get(order.id) || [];
        const validSerials = order.serial_numbers.filter((sn: string) => sn.trim());

        let status: 'Success' | 'Failed' | 'Pending' = 'Pending';
        
        // Check for duplicates within the same sales order
        const duplicateSerials = validSerials.filter((serial, index) => 
          validSerials.indexOf(serial) !== index
        );
        
        if (validSerials.length === 0) {
          status = 'Pending'; // No serial numbers provided
        } else if (duplicateSerials.length > 0) {
          status = 'Failed'; // Duplicate serial numbers found
        } else if (orderDevices.length === validSerials.length) {
          status = 'Success'; // All serial numbers available, no duplicates
        } else {
          status = 'Failed'; // Missing serial numbers
        }

        return {
          ...order,
          order_type: order.order_type as 'Inward' | 'Outward',
          product: order.product as 'Tablet' | 'TV',
          status
        } as Order;
      });

      setOrders(ordersWithStatus);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch related order details to determine order_type
      const orderIds = [...new Set(data.map((device: any) => device.order_id).filter(id => id))];
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_type')
        .in('id', orderIds);
      if (ordersError) throw ordersError;

      const orderTypeMap = new Map(ordersData.map((order: { id: string; order_type: 'Inward' | 'Outward' }) => [order.id, order.order_type]));

      // Group devices by serial number and track the latest entry per serial number
      const serialNumberMap = new Map<string, { device: any; orderType: 'Inward' | 'Outward' | undefined }>();
      data.forEach((device: any) => {
        const orderType = device.order_id ? orderTypeMap.get(device.order_id) : undefined;
        if (!serialNumberMap.has(device.serial_number) || new Date(device.created_at) > new Date(serialNumberMap.get(device.serial_number)!.device.created_at)) {
          serialNumberMap.set(device.serial_number, { device, orderType });
        }
      });

      // Update statuses based on order_type and duplicate handling
      const updatedDevices = data.map((device: any) => {
        const latestEntry = serialNumberMap.get(device.serial_number);
        const isLatest = latestEntry?.device.id === device.id;
        const orderType = device.order_id ? orderTypeMap.get(device.order_id) : undefined;

        let status: 'Available' | 'Assigned' | 'Unassigned';
        if (isLatest) {
          status = orderType === 'Outward' ? 'Assigned' : 'Available'; // Latest entry follows order_type
        } else {
          status = 'Unassigned'; // Earlier duplicates are Unassigned
        }

        return {
          ...device,
          status,
        };
      });

      setDevices(updatedDevices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({ title: 'Error', description: 'Failed to load devices', variant: 'destructive' });
    }
  };

  const loadOrderSummary = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('warehouse, product, model, order_type, quantity')
        .eq('is_deleted', false);
      if (ordersError) throw ordersError;

      const summaryMap = new Map<string, OrderSummary>();
      locations.forEach(warehouse => {
        productOptions.forEach(product => {
          if (product !== 'All') {
            modelOptions.forEach(model => {
              if (model !== 'All' && (product === 'Tablet' ? tabletModels.includes(model) : tvModels.includes(model))) {
                const key = `${warehouse}-${product}-${model}`;
                if (!summaryMap.has(key)) {
                  summaryMap.set(key, { warehouse, product, model, inward: 0, outward: 0, available: 0 });
                }
              }
            });
          }
        });
      });

      ordersData?.forEach((order) => {
        const key = `${order.warehouse}-${order.product}-${order.model}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, { warehouse: order.warehouse, product: order.product, model: order.model, inward: 0, outward: 0, available: 0 });
        }
        const summary = summaryMap.get(key)!;
        if (order.order_type === 'Inward') summary.inward += order.quantity;
        else summary.outward += order.quantity;
        summary.available = summary.inward - summary.outward;
      });

      setOrderSummary(Array.from(summaryMap.values()));
    } catch (error) {
      console.error('Error loading order summary:', error);
      toast({ title: 'Error', description: 'Failed to load order summary', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addTablet = () => {
    const newTablet: TabletItem = { id: generateId(), model: '', sdCardSize: '', profileId: '', quantity: 1, location: '', serialNumbers: [] };
    setTablets([...tablets, newTablet]);
  };

  const addTV = () => {
    const newTV: TVItem = { id: generateId(), model: '', quantity: 1, location: '', serialNumbers: [] };
    setTvs([...tvs, newTV]);
  };

  const updateTablet = (id: string, field: keyof TabletItem, value: string | number | string[]) => {
    setTablets(tablets.map(tablet => {
      if (tablet.id === id) {
        if (field === 'quantity' && typeof value === 'number') {
          const newQuantity = Math.max(1, value);
          const currentSerials = tablet.serialNumbers || [];
          const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '');
          return { ...tablet, quantity: newQuantity, serialNumbers: newSerialNumbers };
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
          const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => currentSerials[i] || '');
          return { ...tv, quantity: newQuantity, serialNumbers: newSerialNumbers };
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
    const hasValidTablets = tablets.some(t => t.model && t.location && t.quantity > 0);
    const hasValidTVs = tvs.some(t => t.model && t.location && t.quantity > 0);
    if (!hasValidTablets && !hasValidTVs) {
      toast({ title: 'Error', description: 'Please add at least one tablet or TV with model, location, and quantity', variant: 'destructive' });
      return false;
    }
    const validTablets = tablets.filter(t => t.model && t.location && t.quantity > 0);
    const validTVs = tvs.filter(t => t.model && t.location && t.quantity > 0);

    for (const tablet of validTablets) {
      const validSerials = tablet.serialNumbers.filter(sn => sn.trim());
      if (validSerials.length !== tablet.quantity) {
        toast({
          title: "Validation Error",
          description: `Number of serial numbers (${validSerials.length}) does not match quantity (${tablet.quantity}) for tablet order`,
          variant: "destructive"
        });
        return false;
      }
    }

    for (const tv of validTVs) {
      const validSerials = tv.serialNumbers.filter(sn => sn.trim());
      if (validSerials.length !== tv.quantity) {
        toast({
          title: "Validation Error",
          description: `Number of serial numbers (${validSerials.length}) does not match quantity (${tv.quantity}) for TV order`,
          variant: "destructive"
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
      const validTablets = tablets.filter(t => t.model && t.location && t.quantity > 0);
      const validTVs = tvs.filter(t => t.model && t.location && t.quantity > 0);

      for (const tablet of validTablets) {
        const salesOrderId = salesOrder || generateDummyId('SO');
        const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: effectiveOrderType,
            product: 'Tablet',
            model: tablet.model,
            quantity: tablet.quantity,
            warehouse: tablet.location,
            sales_order: salesOrderId,
            deal_id: dealId || '',
            school_name: schoolName,
            nucleus_id: nucleusId || '',
            serial_numbers: tablet.serialNumbers.filter(sn => sn.trim()),
            order_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
          })
          .select()
          .single();
        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);

        for (let i = 0; i < tablet.quantity; i++) {
          const serialNumber = tablet.serialNumbers[i] || generateDummyId('SN');
          const { error: deviceError } = await supabase
            .from('devices')
            .insert({
              product: 'Tablet',
              model: tablet.model,
              serial_number: serialNumber.trim(),
              warehouse: tablet.location,
              sales_order: salesOrderId,
              deal_id: dealId || '',
              school_name: schoolName,
              nucleus_id: nucleusId || '',
              status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
              order_id: orderData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
            });
          if (deviceError) throw new Error(`Device insertion failed: ${deviceError.message}`);
        }
      }

      for (const tv of validTVs) {
        const salesOrderId = salesOrder || generateDummyId('SO');
        const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_type: effectiveOrderType,
            product: 'TV',
            model: tv.model,
            quantity: tv.quantity,
            warehouse: tv.location,
            sales_order: salesOrderId,
            deal_id: dealId || '',
            school_name: schoolName,
            nucleus_id: nucleusId || '',
            serial_numbers: tv.serialNumbers.filter(sn => sn.trim()),
            order_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
          })
          .select()
          .single();
        if (orderError) throw new Error(`Order insertion failed: ${orderError.message}`);

        for (let i = 0; i < tv.quantity; i++) {
          const serialNumber = tv.serialNumbers[i] || generateDummyId('SN');
          const { error: deviceError } = await supabase
            .from('devices')
            .insert({
              product: 'TV',
              model: tv.model,
              serial_number: serialNumber.trim(),
              warehouse: tv.location,
              sales_order: salesOrderId,
              deal_id: dealId || '',
              school_name: schoolName,
              nucleus_id: nucleusId || '',
              status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
              order_id: orderData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
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
      
      // Expected CSV format: order_type,product,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers
      if (headers.length < 9) {
        toast({
          title: "Invalid CSV Format",
          description: "CSV must have at least 9 columns: order_type,product,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers",
          variant: "destructive"
        });
        return;
      }

      const importedData = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const serialNumbers = values[9] ? values[9].split(';').map(s => s.trim()).filter(s => s) : [];
        
        return {
          order_type: values[0] as 'Inward' | 'Outward',
          product: values[1] as 'Tablet' | 'TV',
          model: values[2],
          quantity: parseInt(values[3]) || 1,
          warehouse: values[4],
          sales_order: values[5],
          deal_id: values[6],
          school_name: values[7],
          nucleus_id: values[8],
          serial_numbers: serialNumbers
        };
      });

      // Process the imported data
      importedData.forEach(data => {
        if (data.product === 'Tablet') {
          const newTablet: TabletItem = {
            id: generateId(),
            model: data.model,
            quantity: data.quantity,
            location: data.warehouse,
            serialNumbers: data.serial_numbers
          };
          setTablets(prev => [...prev, newTablet]);
        } else if (data.product === 'TV') {
          const newTV: TVItem = {
            id: generateId(),
            model: data.model,
            quantity: data.quantity,
            location: data.warehouse,
            serialNumbers: data.serial_numbers
          };
          setTvs(prev => [...prev, newTV]);
        }
        
        // Set other form fields from the first row
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
        title: "Import Successful",
        description: `Imported ${importedData.length} items successfully`,
      });
    };

    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const template = 'order_type,product,model,quantity,warehouse,sales_order,deal_id,school_name,nucleus_id,serial_numbers\nInward,Tablet,TB301FU,2,Trichy,SO001,DEAL001,Example School,NUC001,"SN001;SN002"\nInward,TV,Hyundai TV - 43",1,Bangalore,SO002,DEAL002,Another School,NUC002,SN003';
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

  const updateOrder = async (updatedOrder: Order) => {
    try {
      setLoading(true);
      const validSerials = updatedOrder.serial_numbers.filter(sn => sn.trim());
      if (!updatedOrder.school_name?.trim()) {
        toast({
          title: "Validation Error",
          description: "School Name is required",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      if (updatedOrder.quantity !== validSerials.length) {
        toast({
          title: "Validation Error",
          description: "The number of serial numbers must match the quantity",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      await supabase.from('devices').delete().eq('order_id', updatedOrder.id);
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          sales_order: updatedOrder.sales_order,
          deal_id: updatedOrder.deal_id,
          school_name: updatedOrder.school_name,
          nucleus_id: updatedOrder.nucleus_id,
          quantity: updatedOrder.quantity,
          warehouse: updatedOrder.warehouse,
          serial_numbers: validSerials,
          updated_at: new Date().toISOString(),
          order_type: updatedOrder.order_type,
        })
        .eq('id', updatedOrder.id);
      if (orderError) throw orderError;

      for (let i = 0; i < updatedOrder.quantity; i++) {
        const serialNumber = updatedOrder.serial_numbers[i] || generateDummyId('SN');
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            product: updatedOrder.product,
            model: updatedOrder.model,
            serial_number: serialNumber.trim(),
            warehouse: updatedOrder.warehouse,
            sales_order: updatedOrder.sales_order || generateDummyId('SO'),
            deal_id: updatedOrder.deal_id || '',
            school_name: updatedOrder.school_name,
            nucleus_id: updatedOrder.nucleus_id || '',
            status: updatedOrder.order_type === 'Inward' ? 'Available' : 'Assigned',
            order_id: updatedOrder.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
          });
        if (deviceError) throw deviceError;
      }

      setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
      await loadDevices();
      await loadOrderSummary();
      toast({ title: 'Success', description: 'Order updated successfully' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const softDeleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await supabase
        .from('orders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', orderId);
      await supabase
        .from('devices')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('order_id', orderId);
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
      toast({ title: 'Success', description: 'Order and associated devices moved to archive' });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({ title: 'Error', description: 'Failed to delete order', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const restoreOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await supabase
        .from('orders')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', orderId);
      await supabase
        .from('devices')
        .update({ is_deleted: false, deleted_at: null })
        .eq('order_id', orderId);
      await loadOrders();
      await loadDevices();
      await loadOrderSummary();
      toast({ title: 'Success', description: 'Order restored successfully' });
    } catch (error) {
      console.error('Error restoring order:', error);
      toast({ title: 'Error', description: 'Failed to restore order', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openScanner = (itemId: string, index: number, type: 'tablet' | 'tv') => {
    setCurrentSerialIndex({ itemId, index, type });
    setShowScanner(true);
  };

  const handleScanResult = (scannedValue: string) => {
    if (currentSerialIndex) {
      const { itemId, index, type } = currentSerialIndex;
      if (type === 'tablet') {
        setTablets(tablets.map(tablet => {
          if (tablet.id === itemId) {
            const newSerialNumbers = [...tablet.serialNumbers];
            newSerialNumbers[index] = scannedValue.trim();
            return { ...tablet, serialNumbers: newSerialNumbers };
          }
          return tablet;
        }));
      } else {
        setTvs(tvs.map(tv => {
          if (tv.id === itemId) {
            const newSerialNumbers = [...tv.serialNumbers];
            newSerialNumbers[index] = scannedValue.trim();
            return { ...tv, serialNumbers: newSerialNumbers };
          }
          return tv;
        }));
      }
      setCurrentSerialIndex(null);
    }
    setShowScanner(false);
  };

  const filteredOrders = orders.filter((order) => {
    if (!showDeleted && order.is_deleted) return false;
    if (showDeleted && !order.is_deleted) return false;
    if (selectedWarehouse !== 'All' && order.warehouse !== selectedWarehouse) return false;
    if (selectedProduct !== 'All' && order.product !== selectedProduct) return false;
    if (selectedModel !== 'All' && order.model !== selectedModel) return false;
    if (fromDate && new Date(order.order_date) <= new Date(fromDate)) return false;
    if (toDate && new Date(order.order_date) >= new Date(toDate)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.sales_order?.toLowerCase().includes(query) ||
        order.deal_id?.toLowerCase().includes(query) ||
        order.school_name?.toLowerCase().includes(query) ||
        order.nucleus_id?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredDevices = devices.filter((device) => {
    if (!showDeleted && device.is_deleted) return false;
    if (showDeleted && !device.is_deleted) return false;
    if (selectedWarehouse !== 'All' && device.warehouse !== selectedWarehouse) return false;
    if (selectedProduct !== 'All' && device.product !== selectedProduct) return false;
    if (selectedModel !== 'All' && device.model !== selectedModel) return false;
    if (fromDate && new Date(device.created_at) <= new Date(fromDate)) return false;
    if (toDate && new Date(device.created_at) >= new Date(toDate)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        device.sales_order?.toLowerCase().includes(query) ||
        device.deal_id?.toLowerCase().includes(query) ||
        device.school_name?.toLowerCase().includes(query) ||
        device.nucleus_id?.toLowerCase().includes(query) ||
        device.serial_number.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group orders by sales order and calculate counts
  const ordersBySalesOrder = filteredOrders.reduce((acc, order) => {
    const salesOrder = order.sales_order || 'No Sales Order';
    if (!acc[salesOrder]) {
      acc[salesOrder] = [];
    }
    acc[salesOrder].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Create display orders with order counts
  const ordersWithCounts = Object.entries(ordersBySalesOrder).flatMap(([salesOrder, orders]) => 
    orders.map((order, index) => ({
      ...order,
      orderCount: `${index + 1}/${orders.length}`
    }))
  );

  // Check for duplicate serial numbers in same sales order for highlighting
  const duplicateSerials = new Set<string>();
  Object.values(ordersBySalesOrder).forEach(salesOrderGroup => {
    const allSerials = salesOrderGroup.flatMap(order => order.serial_numbers);
    const duplicates = allSerials.filter((serial, index) => allSerials.indexOf(serial) !== index);
    duplicates.forEach(serial => duplicateSerials.add(serial));
  });

  // Pagination logic
  const paginatedOrders = ordersWithCounts.slice(
    (currentOrdersPage - 1) * ordersPerPage,
    currentOrdersPage * ordersPerPage
  );

  const paginatedDevices = filteredDevices.slice(
    (currentDevicesPage - 1) * devicesPerPage,
    currentDevicesPage * devicesPerPage
  );

  const totalOrdersPages = Math.ceil(ordersWithCounts.length / ordersPerPage);
  const totalDevicesPages = Math.ceil(filteredDevices.length / devicesPerPage);

  const handleStatusClick = (order: Order) => {
    if (order.status === 'Pending' || order.status === 'Failed') {
      let errorMessage = '';
      const validSerials = order.serial_numbers.filter(sn => sn.trim());
      const duplicateSerials = validSerials.filter((serial, index) => 
        validSerials.indexOf(serial) !== index
      );
      
      if (validSerials.length === 0) {
        errorMessage = 'No serial numbers provided for this order.';
      } else if (duplicateSerials.length > 0) {
        errorMessage = `Duplicate serial numbers found: ${duplicateSerials.join(', ')}`;
      } else {
        errorMessage = 'Some serial numbers are missing or not properly configured.';
      }
      
      setStatusError(errorMessage);
      setStatusDialogOrder(order);
      setShowStatusDialog(true);
    }
  };


  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to download', variant: 'destructive' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) =>
            typeof row[header] === 'string' && row[header].includes(',')
              ? `"${row[header]}"`
              : row[header]
          )
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAvailableDevicesCSV = () => {
    const availableDevices = filteredDevices.filter((device) => device.status === 'Available' && !device.is_deleted);
    downloadCSV(availableDevices, 'available-devices.csv');
  };

  const renderCreateOrder = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="orderType">Order Type *</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  {orderTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="salesOrder">Sales Order</Label>
              <Input
                value={salesOrder}
                onChange={(e) => setSalesOrder(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label htmlFor="dealId">Deal ID</Label>
              <Input
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Required"
                required
              />
            </div>
            <div>
              <Label htmlFor="nucleusId">Nucleus ID</Label>
              <Input
                value={nucleusId}
                onChange={(e) => setNucleusId(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tablets</CardTitle>
          <Button onClick={addTablet} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Tablet
          </Button>
        </CardHeader>
        <CardContent>
          {tablets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No tablets added</p>
          ) : (
            <div className="space-y-4">
              {tablets.map((tablet) => (
                <Card key={tablet.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">Tablet {tablets.indexOf(tablet) + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removeTablet(tablet.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Model *</Label>
                      <Select
                        value={tablet.model}
                        onValueChange={(value) => updateTablet(tablet.id, 'model', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {tabletModels.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>SD Card Size</Label>
                      <Select
                        value={tablet.sdCardSize}
                        onValueChange={(value) => updateTablet(tablet.id, 'sdCardSize', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {sdCardSizes.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Profile ID</Label>
                      <Input
                        value={tablet.profileId}
                        onChange={(e) => updateTablet(tablet.id, 'profileId', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateTablet(tablet.id, 'quantity', tablet.quantity - 1)}
                          disabled={tablet.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={tablet.quantity}
                          onChange={(e) => updateTablet(tablet.id, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateTablet(tablet.id, 'quantity', tablet.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Location *</Label>
                      <Select
                        value={tablet.location}
                        onValueChange={(value) => updateTablet(tablet.id, 'location', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(location => (
                            <SelectItem key={location} value={location}>{location}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Serial Numbers</Label>
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: tablet.quantity }, (_, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder={`Serial number ${index + 1}`}
                            value={tablet.serialNumbers[index] || ''}
                            onChange={(e) => {
                              const newSerialNumbers = [...tablet.serialNumbers];
                              newSerialNumbers[index] = e.target.value;
                              updateTablet(tablet.id, 'serialNumbers', newSerialNumbers);
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScanner(tablet.id, index, 'tablet')}
                            title="Scan Barcode/QR Code"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>TVs</CardTitle>
          <Button onClick={addTV} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add TV
          </Button>
        </CardHeader>
        <CardContent>
          {tvs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No TVs added</p>
          ) : (
            <div className="space-y-4">
              {tvs.map((tv) => (
                <Card key={tv.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">TV {tvs.indexOf(tv) + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removeTV(tv.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Model *</Label>
                      <Select
                        value={tv.model}
                        onValueChange={(value) => updateTV(tv.id, 'model', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {tvModels.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
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
                          onClick={() => updateTV(tv.id, 'quantity', tv.quantity - 1)}
                          disabled={tv.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={tv.quantity}
                          onChange={(e) => updateTV(tv.id, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateTV(tv.id, 'quantity', tv.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Location *</Label>
                      <Select
                        value={tv.location}
                        onValueChange={(value) => updateTV(tv.id, 'location', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(location => (
                            <SelectItem key={location} value={location}>{location}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Serial Numbers</Label>
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: tv.quantity }, (_, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder={`Serial number ${index + 1}`}
                            value={tv.serialNumbers[index] || ''}
                            onChange={(e) => {
                              const newSerialNumbers = [...tv.serialNumbers];
                              newSerialNumbers[index] = e.target.value;
                              updateTV(tv.id, 'serialNumbers', newSerialNumbers);
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScanner(tv.id, index, 'tv')}
                            title="Scan Barcode/QR Code"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={createOrder} disabled={loading} className="w-full" size="lg">
        {loading ? 'Creating...' : 'Create Order'}
      </Button>

      {/* Import Orders Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Orders
          </CardTitle>
          <CardDescription>
            Bulk import orders from CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Orders from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Upload a CSV file with the following format:
                    <br />
                    order_type, product, model, quantity, warehouse, sales_order, deal_id, school_name, nucleus_id, serial_numbers
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={downloadCSVTemplate} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOrdersTable = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>View Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>{showDeleted ? 'Deleted orders' : 'Active orders'}</CardDescription>
          </div>
          <Button variant="outline" onClick={() => downloadCSV(filteredOrders, 'orders.csv')}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by sales order, deal ID, school name, or nucleus ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              {warehouseOptions.map((warehouse) => (
                <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((product) => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From Date" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To Date" />
          <Button variant={showDeleted ? 'destructive' : 'outline'} onClick={() => setShowDeleted(!showDeleted)} className="w-full">
            {showDeleted ? <RotateCcw className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showDeleted ? 'Show Active' : 'Show Deleted'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales Order</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>School Name</TableHead>
                <TableHead>Deal ID</TableHead>
                <TableHead>Nucleus ID</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.sales_order}</TableCell>
                  <TableCell>
                    <Badge variant={order.order_type === 'Inward' ? 'default' : 'secondary'}>
                      {order.order_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.model}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.warehouse}</TableCell>
                  <TableCell>{order.school_name || '-'}</TableCell>
                  <TableCell>{order.deal_id || '-'}</TableCell>
                  <TableCell>{order.nucleus_id || '-'}</TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === 'Success'
                          ? 'default'
                          : order.status === 'Failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setViewingOrder(order); setShowViewDialog(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingOrder(order); setShowEditDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!order.is_deleted && (
                        <Button variant="ghost" size="sm" onClick={() => softDeleteOrder(order.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {order.is_deleted && (
                        <Button variant="ghost" size="sm" onClick={() => restoreOrder(order.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderDevicesTable = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Devices ({filteredDevices.length})</CardTitle>
            <CardDescription>{showDeleted ? 'Deleted devices' : 'Active devices'}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={downloadAvailableDevicesCSV}>
              Available
            </Button>
            <Button variant="outline" onClick={() => downloadCSV(filteredDevices, 'devices.csv')}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by sales order, deal ID, school name, nucleus ID, or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-4">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              {warehouseOptions.map((warehouse) => (
                <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((product) => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From Date" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To Date" />
          <Button variant={showDeleted ? 'destructive' : 'outline'} onClick={() => setShowDeleted(!showDeleted)} className="w-full">
            {showDeleted ? <RotateCcw className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showDeleted ? 'Show Active' : 'Show Deleted'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>School Name</TableHead>
                <TableHead>Deal ID</TableHead>
                <TableHead>Nucleus ID</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.product}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell 
                    className={`font-mono ${duplicateSerials.has(device.serial_number) ? 'bg-red-100 text-red-800 border border-red-300' : ''}`}
                  >
                    {device.serial_number}
                  </TableCell>
                  <TableCell>{device.warehouse}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        device.status === 'Available'
                          ? 'default'
                          : device.status === 'Assigned'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{device.sales_order || '-'}</TableCell>
                  <TableCell>{device.school_name || '-'}</TableCell>
                  <TableCell>{device.deal_id || '-'}</TableCell>
                  <TableCell>{device.nucleus_id || '-'}</TableCell>
                  <TableCell>{formatDate(device.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Devices Pagination */}
        {totalDevicesPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentDevicesPage - 1) * devicesPerPage) + 1} to {Math.min(currentDevicesPage * devicesPerPage, filteredDevices.length)} of {filteredDevices.length} devices
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDevicesPage(prev => Math.max(1, prev - 1))}
                disabled={currentDevicesPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentDevicesPage} of {totalDevicesPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDevicesPage(prev => Math.min(totalDevicesPages, prev + 1))}
                disabled={currentDevicesPage === totalDevicesPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOrderSummary = () => {
    const filteredSummary = orderSummary.filter((summary) => {
      if (selectedWarehouse !== 'All' && summary.warehouse !== selectedWarehouse) return false;
      if (selectedProduct !== 'All' && summary.product !== selectedProduct) return false;
      if (selectedModel !== 'All' && summary.model !== selectedModel) return false;
      return true;
    });

    const totalInward = filteredSummary.reduce((sum, item) => sum + (item.inward || 0), 0);
    const totalOutward = filteredSummary.reduce((sum, item) => sum + (item.outward || 0), 0);
    const totalAvailable = filteredSummary.reduce((sum, item) => sum + (item.available || 0), 0);

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search
              </h2>
              <Input
                placeholder="Search by Sales Order, Deal ID, School Name, Nucleus ID, or Serial Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <Label className="text-sm font-medium">Warehouse</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseOptions.map((warehouse) => (
                        <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((product) => (
                        <SelectItem key={product} value={product}>{product}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">From Date</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="dd-mm-yyyy" />
                </div>
                <div>
                  <Label className="text-sm font-medium">To Date</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="dd-mm-yyyy" />
                </div>
                <div className="flex items-end">
                  <Button variant={showDeleted ? 'destructive' : 'outline'} onClick={() => setShowDeleted(!showDeleted)} className="w-full">
                    Show Deleted
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  Updated: {formatDate(new Date().toISOString())} {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => downloadCSV(orderSummary, 'order-summary.csv')}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{totalInward}</div>
                <div className="text-sm text-gray-600">Total Inward</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{totalOutward}</div>
                <div className="text-sm text-gray-600">Total Outward</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{totalAvailable}</div>
                <div className="text-sm text-gray-600">Available</div>
              </Card>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-center">Inward</TableHead>
                    <TableHead className="text-center">Outward</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell>{summary.warehouse}</TableCell>
                      <TableCell>{summary.product}</TableCell>
                      <TableCell>{summary.model}</TableCell>
                      <TableCell className="text-center"><span className="text-green-600 font-semibold">{summary.inward || 0}</span></TableCell>
                      <TableCell className="text-center"><span className="text-red-600 font-semibold">{summary.outward || 0}</span></TableCell>
                      <TableCell className="text-center"><span className="text-blue-600 font-semibold">{summary.available || 0}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your inventory orders and track devices across warehouses</p>
        </div>

        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">
              <Package className="w-4 h-4 mr-2" />
              Create Order
            </TabsTrigger>
            <TabsTrigger value="view">
              <Archive className="w-4 h-4 mr-2" />
              View Orders
            </TabsTrigger>
            <TabsTrigger value="order">
              <BarChart3 className="w-4 h-4 mr-2" />
              Order Summary
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Archive className="w-4 h-4 mr-2" />
              Devices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {renderCreateOrder()}
          </TabsContent>
          <TabsContent value="view" className="space-y-6">
            {renderOrdersTable()}
          </TabsContent>
          <TabsContent value="order" className="space-y-6">
            {renderOrderSummary()}
          </TabsContent>
          <TabsContent value="devices" className="space-y-6">
            {renderDevicesTable()}
          </TabsContent>
        </Tabs>

        <EnhancedBarcodeScanner
          isOpen={showScanner}
          onClose={() => { setShowScanner(false); setCurrentSerialIndex(null); }}
          onScan={handleScanResult}
        />

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Summary</DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Sales Order</Label>
                        <p className="font-mono">{viewingOrder.sales_order || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Deal ID</Label>
                        <p>{viewingOrder.deal_id || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">School Name</Label>
                        <p>{viewingOrder.school_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nucleus ID</Label>
                        <p>{viewingOrder.nucleus_id || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Order Type</Label>
                        <Badge variant={viewingOrder.order_type === 'Inward' ? 'default' : 'secondary'}>
                          {viewingOrder.order_type}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Product</Label>
                        <p>{viewingOrder.product}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <p>{viewingOrder.model}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Warehouse</Label>
                        <p>{viewingOrder.warehouse}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                        <p>{viewingOrder.quantity}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                        <p>{formatDate(viewingOrder.order_date)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <Badge
                          variant={
                            viewingOrder.status === 'Success'
                              ? 'default'
                              : viewingOrder.status === 'Failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {viewingOrder.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Serial Numbers ({viewingOrder.serial_numbers.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingOrder.serial_numbers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingOrder.serial_numbers.map((serial, index) => (
                          <Badge key={index} variant="outline" className="font-mono">
                            {serial}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No serial numbers entered</p>
                    )}
                  </CardContent>
                </Card>
                <div className="flex gap-2 mt-6">
                  {!viewingOrder.is_deleted && (
                    <Button
                      variant="destructive"
                      onClick={() => { softDeleteOrder(viewingOrder.id); setShowViewDialog(false); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  {viewingOrder.is_deleted && (
                    <Button
                      onClick={() => { restoreOrder(viewingOrder.id); setShowViewDialog(false); }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
            </DialogHeader>
            {editingOrder && (
              <EditOrderForm 
                order={editingOrder} 
                onSave={(updatedOrder) => {
                  updateOrder(updatedOrder);
                  setShowEditDialog(false);
                  setEditingOrder(null);
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingOrder(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Status Error Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-600" />
                Order Status Error
              </DialogTitle>
            </DialogHeader>
            {statusDialogOrder && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Sales Order:</strong> {statusDialogOrder.sales_order}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Product:</strong> {statusDialogOrder.product} - {statusDialogOrder.model}
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">Error Details:</p>
                  <p className="text-sm text-red-700 mt-1">{statusError}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowStatusDialog(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InventoryManagement;
