import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Package, BarChart3, Archive, RotateCcw, Plus, Trash2, Search, Camera, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';

// Interfaces remain unchanged
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

interface WarehouseSummary {
  warehouse: string;
  product: string;
  model: string;
  total_devices: number;
  available_count: number;
  assigned_count: number;
  maintenance_count: number;
}

// Add interface for tablet/TV entries
interface DeviceEntry {
  product: 'Tablet' | 'TV';
  model: string;
  quantity: number;
  serial_numbers: string[];
}

const InventoryManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [warehouseSummary, setWarehouseSummary] = useState<WarehouseSummary[]>([]);
  const [currentView, setCurrentView] = useState<'create' | 'view' | 'warehouse' | 'devices'>('create');
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

  // Add state for tracking tablet/TV entries
  const [tabletEntries, setTabletEntries] = useState<DeviceEntry[]>([]);
  const [tvEntries, setTvEntries] = useState<DeviceEntry[]>([]);
  
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
    serial_numbers: [''],
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
    loadWarehouseSummary();
  }, []);

  // Load functions remain unchanged
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

  const loadWarehouseSummary = async () => {
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('devices')
        .select('warehouse, product, model, status')
        .eq('is_deleted', false);
      
      if (fallbackError) throw fallbackError;
      
      const summaryMap = new Map();
      fallbackData?.forEach(device => {
        const key = `${device.warehouse}-${device.product}-${device.model}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            warehouse: device.warehouse,
            product: device.product,
            model: device.model,
            total_devices: 0,
            available_count: 0,
            assigned_count: 0,
            maintenance_count: 0
          });
        }
        const summary = summaryMap.get(key);
        summary.total_devices++;
        if (device.status === 'Available') summary.available_count++;
        else if (device.status === 'Assigned') summary.assigned_count++;
        else if (device.status === 'Maintenance') summary.maintenance_count++;
      });
      
      setWarehouseSummary(Array.from(summaryMap.values()));
    } catch (error) {
      console.error('Error loading warehouse summary:', error);
      toast({
        title: "Error",
        description: "Failed to load warehouse summary",
        variant: "destructive"
      });
    }
  };

  const validateForm = () => {
    if (!formData.order_type || !formData.warehouse || !formData.sales_order) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Order Type, Warehouse, Sales Order)",
        variant: "destructive"
      });
      return false;
    }

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
      
      // Combine tablet and TV entries into orders
      const allEntries = [...tabletEntries, ...tvEntries];
      
      for (const entry of allEntries) {
        const orderData = {
          order_type: formData.order_type as 'Inward' | 'Outward',
          product: entry.product as 'Tablet' | 'TV',
          model: entry.model,
          quantity: entry.quantity,
          warehouse: formData.warehouse,
          sales_order: formData.sales_order,
          school_name: formData.school_name || null,
          deal_id: formData.deal_id || null,
          nucleus_id: formData.nucleus_id || null,
          serial_numbers: entry.serial_numbers.filter(sn => sn.trim())
        };

        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;

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
      }

      toast({
        title: "Success",
        description: "Order created successfully",
      });

      // Reset form and entries
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
      setTabletEntries([]);
      setTvEntries([]);

      loadOrders();
      loadDevices();
      loadWarehouseSummary();
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

  const deleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: deviceError } = await supabase
        .from('devices')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('order_id', orderId);

      if (deviceError) throw deviceError;

      toast({
        title: "Success",
        description: "Order and related devices deleted successfully",
      });

      loadOrders();
      loadDevices();
      loadWarehouseSummary();
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
      const [entryType, entryIndex, serialIndex] = currentSerialIndex.toString().split('-');
      const entries = entryType === 'tablet' ? tabletEntries : tvEntries;
      const newEntries = [...entries];
      newEntries[parseInt(entryIndex)].serial_numbers[parseInt(serialIndex)] = result;
      
      if (entryType === 'tablet') {
        setTabletEntries(newEntries);
      } else {
        setTvEntries(newEntries);
      }
      
      setScannerOpen(false);
      setCurrentSerialIndex(-1);
      
      toast({
        title: "Serial Number Scanned",
        description: `Serial number ${result} added successfully`,
      });
    }
  };

  const openScanner = (entryType: 'tablet' | 'tv', entryIndex: number, serialIndex: number) => {
    setCurrentSerialIndex(parseInt(`${entryType === 'tablet' ? '0' : '1'}-${entryIndex}-${serialIndex}`));
    setScannerOpen(true);
  };

  const addSerialField = (entryType: 'tablet' | 'tv', entryIndex: number) => {
    const entries = entryType === 'tablet' ? tabletEntries : tvEntries;
    const newEntries = [...entries];
    newEntries[entryIndex].serial_numbers.push('');
    
    if (entryType === 'tablet') {
      setTabletEntries(newEntries);
    } else {
      setTvEntries(newEntries);
    }
  };

  const removeSerialField = (entryType: 'tablet' | 'tv', entryIndex: number, serialIndex: number) => {
    const entries = entryType === 'tablet' ? tabletEntries : tvEntries;
    const newEntries = [...entries];
    newEntries[entryIndex].serial_numbers = newEntries[entryIndex].serial_numbers.filter((_, i) => i !== serialIndex);
    
    if (entryType === 'tablet') {
      setTabletEntries(newEntries);
    } else {
      setTvEntries(newEntries);
    }
  };

  const updateSerialNumber = (entryType: 'tablet' | 'tv', entryIndex: number, serialIndex: number, value: string) => {
    const entries = entryType === 'tablet' ? tabletEntries : tvEntries;
    const newEntries = [...entries];
    newEntries[entryIndex].serial_numbers[serialIndex] = value;
    
    if (entryType === 'tablet') {
      setTabletEntries(newEntries);
    } else {
      setTvEntries(newEntries);
    }
  };

  // Add function to handle adding a tablet or TV entry
  const addDeviceEntry = (product: 'Tablet' | 'TV') => {
    const newEntry: DeviceEntry = {
      product,
      model: '',
      quantity: 1,
      serial_numbers: [''],
    };
    
    if (product === 'Tablet') {
      setTabletEntries([...tabletEntries, newEntry]);
    } else {
      setTvEntries([...tvEntries, newEntry]);
    }
    
    toast({
      title: "Success",
      description: `${product} entry added`,
    });
  };

  const removeDeviceEntry = (entryType: 'tablet' | 'tv', entryIndex: number) => {
    if (entryType === 'tablet') {
      setTabletEntries(tabletEntries.filter((_, i) => i !== entryIndex));
    } else {
      setTvEntries(tvEntries.filter((_, i) => i !== entryIndex));
    }
  };

  const updateDeviceEntry = (entryType: 'tablet' | 'tv', entryIndex: number, field: keyof DeviceEntry, value: any) => {
    const entries = entryType === 'tablet' ? tabletEntries : tvEntries;
    const newEntries = [...entries];
    newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
    
    if (entryType === 'tablet') {
      setTabletEntries(newEntries);
    } else {
      setTvEntries(newEntries);
    }
  };

  // Filter functions remain unchanged
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
    
    return !device.is_deleted;
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

  const downloadAvailableDevicesCSV = () => {
    const availableDevices = devices.filter(device => 
      device.status === 'Available' && !device.is_deleted
    );
    downloadCSV(availableDevices, 'available-devices.csv');
  };

  const renderCreateOrder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create Order</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Order Information Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Order Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_type">Order Type *</Label>
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
                <Label htmlFor="sales_order">Sales Order *</Label>
                <Input
                  value={formData.sales_order}
                  onChange={(e) => setFormData({...formData, sales_order: e.target.value})}
                  placeholder="Enter sales order"
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deal_id">Deal ID</Label>
                <Input
                  value={formData.deal_id}
                  onChange={(e) => setFormData({...formData, deal_id: e.target.value})}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select value={formData.warehouse} onValueChange={(value) => setFormData({...formData, warehouse: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(warehouse => (
                      <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_name">School Name</Label>
                <Input
                  value={formData.school_name}
                  onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nucleus_id">Nucleus ID</Label>
                <Input
                  value={formData.nucleus_id}
                  onChange={(e) => setFormData({...formData, nucleus_id: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Tablets Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-lg font-semibold">Tablets</h3>
            <div className="flex items-center justify-end">
              <Button 
                type="button" 
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => addDeviceEntry('Tablet')}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tablet
              </Button>
            </div>
            {tabletEntries.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No tablets added
              </div>
            ) : (
              tabletEntries.map((entry, entryIndex) => (
                <div key={entryIndex} className="border rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Model *</Label>
                      <Select 
                        value={entry.model} 
                        onValueChange={(value) => updateDeviceEntry('tablet', entryIndex, 'model', value)}
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
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.quantity}
                        onChange={(e) => updateDeviceEntry('tablet', entryIndex, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDeviceEntry('tablet', entryIndex)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Numbers</Label>
                    {entry.serial_numbers.map((serial, serialIndex) => (
                      <div key={serialIndex} className="flex gap-2 items-center">
                        <Input
                          value={serial}
                          onChange={(e) => updateSerialNumber('tablet', entryIndex, serialIndex, e.target.value)}
                          placeholder="Scan or enter serial number"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openScanner('tablet', entryIndex, serialIndex)}
                          disabled={loading}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        {entry.serial_numbers.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSerialField('tablet', entryIndex, serialIndex)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSerialField('tablet', entryIndex)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Serial Number
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TVs Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-lg font-semibold">TVs</h3>
            <div className="flex items-center justify-end">
              <Button 
                type="button" 
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => addDeviceEntry('TV')}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add TV
              </Button>
            </div>
            {tvEntries.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No TVs added
              </div>
            ) : (
              tvEntries.map((entry, entryIndex) => (
                <div key={entryIndex} className="border rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Model *</Label>
                      <Select 
                        value={entry.model} 
                        onValueChange={(value) => updateDeviceEntry('tv', entryIndex, 'model', value)}
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
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.quantity}
                        onChange={(e) => updateDeviceEntry('tv', entryIndex, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDeviceEntry('tv', entryIndex)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Numbers</Label>
                    {entry.serial_numbers.map((serial, serialIndex) => (
                      <div key={serialIndex} className="flex gap-2 items-center">
                        <Input
                          value={serial}
                          onChange={(e) => updateSerialNumber('tv', entryIndex, serialIndex, e.target.value)}
                          placeholder="Scan or enter serial number"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openScanner('tv', entryIndex, serialIndex)}
                          disabled={loading}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        {entry.serial_numbers.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSerialField('tv', entryIndex, serialIndex)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSerialField('tv', entryIndex)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Serial Number
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              className="bg-green-500 text-white hover:bg-green-600"
              onClick={createOrder}
              disabled={loading || (tabletEntries.length === 0 && tvEntries.length === 0)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </div>

          {/* Hidden form fields removed as they are now handled by tabletEntries and tvEntries */}
        </div>
      </CardContent>
    </Card>
  );

  // Other render functions remain unchanged
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
            <CardTitle>View Orders ({filteredOrders.length})</CardTitle>
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
                <TableHead>Serial Numbers</TableHead>
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
                  <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {order.serial_numbers.slice(0, 2).map((sn, idx) => (
                        <div key={idx} className="text-xs font-mono">{sn}</div>
                      ))}
                      {order.serial_numbers.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{order.serial_numbers.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOrder(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={downloadAvailableDevicesCSV}
            >
              Available
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCSV(filteredDevices, 'devices.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
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
                <TableHead>Nucleus ID</TableHead>
                <TableHead>Profile ID</TableHead>
                <TableHead>SD Card Size</TableHead>
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
                  <TableCell>{device.nucleus_id || '-'}</TableCell>
                  <TableCell>{device.profile_id || '-'}</TableCell>
                  <TableCell>{device.sd_card_size || '-'}</TableCell>
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
    const totalInward = warehouseSummary.reduce((sum, item) => sum + item.assigned_count + item.maintenance_count, 0);
    const totalOutward = warehouseSummary.reduce((sum, item) => sum + 23, 0); // Placeholder
    const totalAvailable = warehouseSummary.reduce((sum, item) => sum + item.available_count, 0);

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
                      {warehouseOptions.map(warehouse => (
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
                      {productOptions.map(product => (
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
                      {modelOptions.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="dd-mm-yyyy"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="dd-mm-yyyy"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant={showDeleted ? "destructive" : "outline"}
                    onClick={() => setShowDeleted(!showDeleted)}
                    className="w-full"
                  >
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
                <CardTitle>Warehouse Summary</CardTitle>
                <CardDescription>Updated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</CardDescription>
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
                <div className="text-3xl font-bold text-blue-600">-{Math.abs(totalAvailable - totalOutward)}</div>
                <div className="text-sm text-gray-600">Available</div>
              </Card>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-center">Inward</TableHead>
                    <TableHead className="text-center">Outward</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseSummary
                    .filter(summary => {
                      if (selectedWarehouse !== 'All' && summary.warehouse !== selectedWarehouse) return false;
                      if (selectedProduct !== 'All' && summary.product !== selectedProduct) return false;
                      if (selectedModel !== 'All' && summary.model !== selectedModel) return false;
                      return true;
                    })
                    .map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell>{summary.product}</TableCell>
                        <TableCell>{summary.model}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-semibold">{summary.assigned_count + summary.maintenance_count}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-600 font-semibold">0</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-blue-600 font-semibold">{summary.available_count}</span>
                        </TableCell>
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
          <p className="text-muted-foreground">
            Manage your inventory orders and track devices across warehouses
          </p>
        </div>

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Create Order</TabsTrigger>
            <TabsTrigger value="view">View Orders</TabsTrigger>
            <TabsTrigger value="warehouse">Warehouse Summary</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
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
        </Tabs>

        <EnhancedBarcodeScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
        />

        {selectedOrder && (
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
                    <Label>Sales Order</Label>
                    <p className="text-sm text-muted-foreground font-mono">{selectedOrder.sales_order}</p>
                  </div>
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
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
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