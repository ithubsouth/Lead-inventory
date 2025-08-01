import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Package, BarChart3, Archive, RotateCcw, Plus, Trash2, Search, Edit, Camera, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';

interface Order {
  id: string;
  order_type: 'Inward' | 'Outward';
  product: 'Tablet' | 'TV';
  model: string;
  quantity: number;
  warehouse: string;
  serial_numbers: string[];
  order_date: string;
  sales_order: string;
  school_name?: string;
  deal_id?: string;
  nucleus_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
  created_by?: string;
  last_modified_by?: string;
}

interface Device {
  id: string;
  product: 'Tablet' | 'TV';
  model: string;
  serial_number: string;
  warehouse: string;
  status: 'Available' | 'Assigned' | 'Maintenance';
  order_id?: string;
  sales_order?: string;
  school_name?: string;
  nucleus_id?: string;
  profile_id?: string;
  sd_card_size?: string;
  deal_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
  created_by?: string;
  last_modified_by?: string;
}

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentView, setCurrentView] = useState<'create' | 'view' | 'edit' | 'warehouse' | 'devices'>('create');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentSerialIndex, setCurrentSerialIndex] = useState<number>(-1);
  const { toast } = useToast();
  
  // Filters and search
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState({
    order_type: '',
    product: '',
    model: '',
    quantity: 1,
    warehouse: '',
    sales_order: '',
    school_name: '',
    deal_id: '',
    nucleus_id: '',
    serial_numbers: ['']
  });

  const orderTypes = ['Inward', 'Outward'];
  const tabletModels = ['TB301FU', 'TB301XU', 'TB-8505F', 'TB-7306F', 'TB-7306X', 'TB-7305X'];
  const tvModels = ['Hyundai TV - 39"', 'Hyundai TV - 43"', 'Hyundai TV - 50"', 'Hyundai TV - 55"', 'Hyundai TV - 65"', 'Xentec TV - 39"', 'Xentec TV - 43"'];
  const locations = ['Trichy', 'Bangalore', 'Hyderabad', 'Kolkata', 'Bhiwandi', 'Ghaziabad', 'Zirakpur', 'Indore', 'Jaipur'];
  const warehouseOptions = ['All', ...locations];
  const productOptions = ['All', 'Tablet', 'TV'];

  const getModelsForProduct = (productType: string) => {
    if (productType === 'Tablet') return tabletModels;
    if (productType === 'TV') return tvModels;
    return [...tabletModels, ...tvModels];
  };

  const getAllModels = () => [...tabletModels, ...tvModels];
  const modelOptions = ['All', ...getAllModels()];

  useEffect(() => {
    loadOrders();
    loadDevices();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
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
      setDevices((data as Device[]) || []);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    }
  };

  const validateForm = () => {
    if (!formData.order_type || !formData.product || !formData.model || 
        !formData.warehouse || !formData.sales_order || formData.quantity < 1) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }

    // Check for duplicate sales order
    const existingOrder = orders.find(order => 
      order.sales_order === formData.sales_order && !order.is_deleted
    );
    
    if (existingOrder) {
      toast({
        title: "Duplicate Sales Order",
        description: `Sales order ${formData.sales_order} already exists`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const orderData = {
        order_type: formData.order_type as 'Inward' | 'Outward',
        product: formData.product as 'Tablet' | 'TV',
        model: formData.model,
        quantity: formData.quantity,
        warehouse: formData.warehouse,
        sales_order: formData.sales_order,
        school_name: formData.school_name || null,
        deal_id: formData.deal_id || null,
        nucleus_id: formData.nucleus_id || null,
        serial_numbers: formData.serial_numbers.filter(sn => sn.trim())
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Create devices if serial numbers are provided
      if (orderData.serial_numbers.length > 0) {
        const deviceData = orderData.serial_numbers.map(serial => ({
          product: orderData.product,
          model: orderData.model,
          serial_number: serial,
          warehouse: orderData.warehouse,
          status: 'Available' as const,
          order_id: data.id,
          sales_order: orderData.sales_order,
          school_name: orderData.school_name,
          nucleus_id: orderData.nucleus_id,
          deal_id: orderData.deal_id
        }));

        const { error: deviceError } = await supabase
          .from('devices')
          .insert(deviceData);

        if (deviceError) throw deviceError;
      }

      toast({
        title: "Success",
        description: "Order created successfully",
      });

      // Reset form
      setFormData({
        order_type: '',
        product: '',
        model: '',
        quantity: 1,
        warehouse: '',
        sales_order: '',
        school_name: '',
        deal_id: '',
        nucleus_id: '',
        serial_numbers: ['']
      });

      loadOrders();
      loadDevices();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const editOrder = async () => {
    if (!selectedOrder || !validateForm()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('orders')
        .update({
          order_type: formData.order_type,
          product: formData.product,
          model: formData.model,
          quantity: formData.quantity,
          warehouse: formData.warehouse,
          sales_order: formData.sales_order,
          school_name: formData.school_name || null,
          deal_id: formData.deal_id || null,
          nucleus_id: formData.nucleus_id || null,
          serial_numbers: formData.serial_numbers.filter(sn => sn.trim())
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      setCurrentView('view');
      setSelectedOrder(null);
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreOrder = async (orderId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order restored successfully",
      });

      loadOrders();
    } catch (error) {
      console.error('Error restoring order:', error);
      toast({
        title: "Error",
        description: "Failed to restore order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = (result: string) => {
    if (currentSerialIndex >= 0) {
      const newSerialNumbers = [...formData.serial_numbers];
      newSerialNumbers[currentSerialIndex] = result;
      setFormData({ ...formData, serial_numbers: newSerialNumbers });
      setScannerOpen(false);
      setCurrentSerialIndex(-1);
      
      toast({
        title: "Serial Number Scanned",
        description: `Serial number ${result} added successfully`,
      });
    }
  };

  const openScanner = (index: number) => {
    setCurrentSerialIndex(index);
    setScannerOpen(true);
  };

  const addSerialField = () => {
    setFormData({
      ...formData,
      serial_numbers: [...formData.serial_numbers, '']
    });
  };

  const removeSerialField = (index: number) => {
    const newSerialNumbers = formData.serial_numbers.filter((_, i) => i !== index);
    setFormData({ ...formData, serial_numbers: newSerialNumbers });
  };

  const updateSerialNumber = (index: number, value: string) => {
    const newSerialNumbers = [...formData.serial_numbers];
    newSerialNumbers[index] = value;
    setFormData({ ...formData, serial_numbers: newSerialNumbers });
  };

  // Filter functions
  const filteredOrders = orders.filter(order => {
    if (!showDeleted && order.is_deleted) return false;
    if (showDeleted && !order.is_deleted) return false;
    
    if (selectedWarehouse !== 'All' && order.warehouse !== selectedWarehouse) return false;
    if (selectedProduct !== 'All' && order.product !== selectedProduct) return false;
    if (selectedModel !== 'All' && order.model !== selectedModel) return false;
    
    if (fromDate && new Date(order.order_date) < new Date(fromDate)) return false;
    if (toDate && new Date(order.order_date) > new Date(toDate)) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.sales_order.toLowerCase().includes(query) ||
        order.deal_id?.toLowerCase().includes(query) ||
        order.school_name?.toLowerCase().includes(query) ||
        order.nucleus_id?.toLowerCase().includes(query) ||
        order.serial_numbers.some(sn => sn.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const filteredDevices = devices.filter(device => {
    if (!showDeleted && device.is_deleted) return false;
    if (showDeleted && !device.is_deleted) return false;
    
    if (selectedWarehouse !== 'All' && device.warehouse !== selectedWarehouse) return false;
    if (selectedProduct !== 'All' && device.product !== selectedProduct) return false;
    if (selectedModel !== 'All' && device.model !== selectedModel) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        device.serial_number.toLowerCase().includes(query) ||
        device.sales_order?.toLowerCase().includes(query) ||
        device.deal_id?.toLowerCase().includes(query) ||
        device.school_name?.toLowerCase().includes(query) ||
        device.nucleus_id?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to download",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const startEdit = (order: Order) => {
    setSelectedOrder(order);
    setFormData({
      order_type: order.order_type,
      product: order.product,
      model: order.model,
      quantity: order.quantity,
      warehouse: order.warehouse,
      sales_order: order.sales_order,
      school_name: order.school_name || '',
      deal_id: order.deal_id || '',
      nucleus_id: order.nucleus_id || '',
      serial_numbers: order.serial_numbers.length > 0 ? order.serial_numbers : ['']
    });
    setCurrentView('edit');
  };

  const renderCreateOrder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create New Order</CardTitle>
        <CardDescription>Fill in the details to create a new inventory order</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="order_type">Order Type</Label>
            <Select value={formData.order_type} onValueChange={(value) => setFormData({...formData, order_type: value})}>
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

          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={formData.product} onValueChange={(value) => setFormData({...formData, product: value, model: ''})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="TV">TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {getModelsForProduct(formData.product).map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select value={formData.warehouse} onValueChange={(value) => setFormData({...formData, warehouse: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_order">Sales Order</Label>
            <Input
              value={formData.sales_order}
              onChange={(e) => setFormData({...formData, sales_order: e.target.value})}
              placeholder="Enter sales order"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_name">School Name</Label>
            <Input
              value={formData.school_name}
              onChange={(e) => setFormData({...formData, school_name: e.target.value})}
              placeholder="Enter school name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal_id">Deal ID</Label>
            <Input
              value={formData.deal_id}
              onChange={(e) => setFormData({...formData, deal_id: e.target.value})}
              placeholder="Enter deal ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nucleus_id">Nucleus ID</Label>
            <Input
              value={formData.nucleus_id}
              onChange={(e) => setFormData({...formData, nucleus_id: e.target.value})}
              placeholder="Enter nucleus ID"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Serial Numbers</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSerialField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Serial
            </Button>
          </div>
          
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openScanner(index)}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {formData.serial_numbers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSerialField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button onClick={createOrder} disabled={loading}>
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('view')}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEditOrder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Edit Order</CardTitle>
        <CardDescription>Update the order details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="order_type">Order Type</Label>
            <Select value={formData.order_type} onValueChange={(value) => setFormData({...formData, order_type: value})}>
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

          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={formData.product} onValueChange={(value) => setFormData({...formData, product: value, model: ''})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="TV">TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {getModelsForProduct(formData.product).map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select value={formData.warehouse} onValueChange={(value) => setFormData({...formData, warehouse: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_order">Sales Order</Label>
            <Input
              value={formData.sales_order}
              onChange={(e) => setFormData({...formData, sales_order: e.target.value})}
              placeholder="Enter sales order"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_name">School Name</Label>
            <Input
              value={formData.school_name}
              onChange={(e) => setFormData({...formData, school_name: e.target.value})}
              placeholder="Enter school name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal_id">Deal ID</Label>
            <Input
              value={formData.deal_id}
              onChange={(e) => setFormData({...formData, deal_id: e.target.value})}
              placeholder="Enter deal ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nucleus_id">Nucleus ID</Label>
            <Input
              value={formData.nucleus_id}
              onChange={(e) => setFormData({...formData, nucleus_id: e.target.value})}
              placeholder="Enter nucleus ID"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Serial Numbers</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSerialField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Serial
            </Button>
          </div>
          
          {formData.serial_numbers.map((serial, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={serial}
                onChange={(e) => updateSerialNumber(index, e.target.value)}
                placeholder={`Serial number ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openScanner(index)}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {formData.serial_numbers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSerialField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button onClick={editOrder} disabled={loading}>
            {loading ? 'Updating...' : 'Update Order'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentView('view');
              setSelectedOrder(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              {warehouseOptions.map(warehouse => (
                <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map(product => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="From Date"
          />

          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="To Date"
          />

          <Button
            variant={showDeleted ? "destructive" : "outline"}
            onClick={() => setShowDeleted(!showDeleted)}
            className="w-full"
          >
            {showDeleted ? <RotateCcw className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showDeleted ? 'Show Active' : 'Show Deleted'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSearchBox = () => (
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
  );

  const renderOrdersTable = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>
              {showDeleted ? 'Deleted orders' : 'Active orders'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadCSV(filteredOrders, 'orders.csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderSearchBox()}
        {renderFilters()}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>School Name</TableHead>
                <TableHead>Deal ID</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Badge variant={order.order_type === 'Inward' ? 'default' : 'secondary'}>
                      {order.order_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.model}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.warehouse}</TableCell>
                  <TableCell>{order.sales_order}</TableCell>
                  <TableCell>{order.school_name || '-'}</TableCell>
                  <TableCell>{order.deal_id || '-'}</TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!order.is_deleted && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {order.is_deleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreOrder(order.id)}
                        >
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
            <CardDescription>
              {showDeleted ? 'Deleted devices' : 'Active devices'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadCSV(filteredDevices, 'devices.csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderSearchBox()}
        {renderFilters()}
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
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.product}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell className="font-mono">{device.serial_number}</TableCell>
                  <TableCell>{device.warehouse}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        device.status === 'Available' ? 'default' : 
                        device.status === 'Assigned' ? 'secondary' : 'destructive'
                      }
                    >
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{device.sales_order || '-'}</TableCell>
                  <TableCell>{device.school_name || '-'}</TableCell>
                  <TableCell>{device.deal_id || '-'}</TableCell>
                  <TableCell>{new Date(device.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderWarehouseSummary = () => {
    const warehouseSummary = locations.map(location => {
      const locationDevices = devices.filter(device => 
        device.warehouse === location && !device.is_deleted
      );
      
      const tablets = locationDevices.filter(device => device.product === 'Tablet');
      const tvs = locationDevices.filter(device => device.product === 'TV');
      
      return {
        location,
        totalDevices: locationDevices.length,
        tablets: tablets.length,
        tvs: tvs.length,
        available: locationDevices.filter(device => device.status === 'Available').length,
        assigned: locationDevices.filter(device => device.status === 'Assigned').length,
        maintenance: locationDevices.filter(device => device.status === 'Maintenance').length
      };
    });

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Warehouse Summary</CardTitle>
              <CardDescription>Inventory summary by warehouse location</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => downloadCSV(warehouseSummary, 'warehouse-summary.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderSearchBox()}
          {renderFilters()}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouseSummary.map((summary) => (
              <Card key={summary.location} className="p-4">
                <h3 className="font-semibold text-lg mb-3">{summary.location}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Devices:</span>
                    <Badge variant="outline">{summary.totalDevices}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tablets:</span>
                    <Badge variant="default">{summary.tablets}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>TVs:</span>
                    <Badge variant="secondary">{summary.tvs}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <Badge variant="default">{summary.available}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned:</span>
                    <Badge variant="secondary">{summary.assigned}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance:</span>
                    <Badge variant="destructive">{summary.maintenance}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory orders and track devices across warehouses
          </p>
        </div>

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="create">Create Order</TabsTrigger>
            <TabsTrigger value="view">View Orders</TabsTrigger>
            <TabsTrigger value="warehouse">Warehouse Summary</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedOrder}>Edit Order</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {renderCreateOrder()}
          </TabsContent>

          <TabsContent value="view" className="space-y-6">
            {renderOrdersTable()}
          </TabsContent>

          <TabsContent value="warehouse" className="space-y-6">
            {renderWarehouseSummary()}
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            {renderDevicesTable()}
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            {selectedOrder && renderEditOrder()}
          </TabsContent>
        </Tabs>

        {/* Enhanced Barcode Scanner Modal */}
        <EnhancedBarcodeScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
        />

        {/* Order Details Modal */}
        {selectedOrder && currentView !== 'edit' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Order Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Type</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.order_type}</p>
                  </div>
                  <div>
                    <Label>Product</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.product}</p>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.model}</p>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <Label>Warehouse</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.warehouse}</p>
                  </div>
                  <div>
                    <Label>Sales Order</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.sales_order}</p>
                  </div>
                  <div>
                    <Label>School Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.school_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Deal ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.deal_id || '-'}</p>
                  </div>
                  <div>
                    <Label>Nucleus ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.nucleus_id || '-'}</p>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {selectedOrder.serial_numbers.length > 0 && (
                  <div>
                    <Label>Serial Numbers</Label>
                    <div className="mt-2 space-y-1">
                      {selectedOrder.serial_numbers.map((serial, index) => (
                        <p key={index} className="text-sm text-muted-foreground font-mono">
                          {serial}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                {!selectedOrder.is_deleted && (
                  <>
                    <Button onClick={() => startEdit(selectedOrder)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        deleteOrder(selectedOrder.id);
                        setSelectedOrder(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
                {selectedOrder.is_deleted && (
                  <Button 
                    onClick={() => {
                      restoreOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;