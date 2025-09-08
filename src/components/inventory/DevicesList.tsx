import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DeviceFilters } from './DeviceFilters';

interface Device {
  id: string;
  product: string;
  model: string;
  serial_number: string;
  warehouse: string;
  status: string;
  asset_status?: string;
  school_name?: string;
  sales_order?: string;
  created_at: string;
}

export const DevicesList: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    products: [] as string[],
    models: [] as string[],
    warehouses: [] as string[],
    statuses: [] as string[],
    asset_statuses: [] as string[],
    sales_orders: [] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [devices, searchTerm, filters]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = devices.filter(device => {
      const matchesSearch = 
        device.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.school_name && device.school_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilters = 
        (filters.products.length === 0 || filters.products.includes(device.product)) &&
        (filters.models.length === 0 || filters.models.includes(device.model)) &&
        (filters.warehouses.length === 0 || filters.warehouses.includes(device.warehouse)) &&
        (filters.statuses.length === 0 || filters.statuses.includes(device.status)) &&
        (filters.asset_statuses.length === 0 || filters.asset_statuses.includes(device.asset_status || 'Fresh')) &&
        (filters.sales_orders.length === 0 || (device.sales_order && filters.sales_orders.includes(device.sales_order)));

      return matchesSearch && matchesFilters;
    });

    setFilteredDevices(filtered);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Product', 'Model', 'Serial Number', 'Warehouse', 'Status', 'Asset Status', 'School', 'Sales Order', 'Created'],
      ...filteredDevices.map(device => [
        device.product,
        device.model,
        device.serial_number,
        device.warehouse,
        device.status,
        device.asset_status || 'Fresh',
        device.school_name || '',
        device.sales_order || '',
        new Date(device.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Stock': return 'default';
      case 'Deployed': return 'secondary';
      case 'In Transit': return 'outline';
      case 'Maintenance': return 'destructive';
      default: return 'outline';
    }
  };

  const getAssetStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Fresh': return 'default';
      case 'Refurb': return 'secondary';  
      case 'Scrap': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Devices ({filteredDevices.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DeviceFilters 
            devices={devices}
            filters={filters}
            onFiltersChange={setFilters}
          />
          
          {loading ? (
            <div className="text-center py-8">Loading devices...</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Asset Status</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Sales Order</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.product}</TableCell>
                      <TableCell>{device.model}</TableCell>
                      <TableCell>{device.serial_number}</TableCell>
                      <TableCell>{device.warehouse}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(device.status)}>
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAssetStatusBadgeVariant(device.asset_status)}>
                          {device.asset_status || 'Fresh'}
                        </Badge>
                      </TableCell>
                      <TableCell>{device.school_name || '-'}</TableCell>
                      <TableCell>{device.sales_order || '-'}</TableCell>
                      <TableCell>
                        {new Date(device.created_at).toLocaleDateString('en-GB')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDevices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No devices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};