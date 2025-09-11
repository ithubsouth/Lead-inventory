import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OrderFilters } from './OrderFilters';

interface OrderSummary {
  product: string;
  model: string;
  warehouse: string;
  order_type: string;
  asset_status: string;
  total_quantity: number;
  total_orders: number;
}

export const OrderSummary: React.FC = () => {
  const [summaryData, setSummaryData] = useState<OrderSummary[]>([]);
  const [filteredData, setFilteredData] = useState<OrderSummary[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    products: [] as string[],
    models: [] as string[],
    warehouses: [] as string[],
    order_types: [] as string[],
    asset_statuses: [] as string[],
    sales_orders: [] as string[],
    date_range: null as { from: Date; to: Date } | null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOrderSummary();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [summaryData, searchTerm, filters]);

  const fetchOrderSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('is_deleted', false);

      if (error) throw error;

      setOrders(data || []);
      
      // Group orders to create summary
      const grouped = (data || []).reduce((acc: any, order) => {
        const key = `${order.product}-${order.model}-${order.warehouse}-${order.order_type}-${order.asset_status || 'Fresh'}`;
        
        if (!acc[key]) {
          acc[key] = {
            product: order.product,
            model: order.model,
            warehouse: order.warehouse,
            order_type: order.order_type,
            asset_status: order.asset_status || 'Fresh',
            total_quantity: 0,
            total_orders: 0
          };
        }
        
        acc[key].total_quantity += order.quantity;
        acc[key].total_orders += 1;
        
        return acc;
      }, {});

      setSummaryData(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching order summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch order summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = summaryData.filter(item => {
      const matchesSearch = 
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.warehouse.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilters = 
        (filters.products.length === 0 || filters.products.includes(item.product)) &&
        (filters.models.length === 0 || filters.models.includes(item.model)) &&
        (filters.warehouses.length === 0 || filters.warehouses.includes(item.warehouse)) &&
        (filters.order_types.length === 0 || filters.order_types.includes(item.order_type)) &&
        (filters.asset_statuses.length === 0 || filters.asset_statuses.includes(item.asset_status));

      return matchesSearch && matchesFilters;
    });

    setFilteredData(filtered);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Product', 'Model', 'Warehouse', 'Order Type', 'Asset Status', 'Total Quantity', 'Total Orders'],
      ...filteredData.map(item => [
        item.product,
        item.model,
        item.warehouse,
        item.order_type,
        item.asset_status,
        item.total_quantity.toString(),
        item.total_orders.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getOrderTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'Inbound': return 'default';
      case 'Outbound': return 'secondary';
      case 'Transfer': return 'outline';
      default: return 'outline';
    }
  };

  const getAssetStatusBadgeVariant = (status: string) => {
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
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Order Summary ({filteredData.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrderFilters 
            orders={orders}
            filters={filters}
            onFiltersChange={setFilters}
          />
          
          {loading ? (
            <div className="text-center py-8">Loading order summary...</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Order Type</TableHead>
                    <TableHead>Asset Status</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Total Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>{item.warehouse}</TableCell>
                      <TableCell>
                        <Badge variant={getOrderTypeBadgeVariant(item.order_type)}>
                          {item.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAssetStatusBadgeVariant(item.asset_status)}>
                          {item.asset_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.total_quantity}</TableCell>
                      <TableCell>{item.total_orders}</TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No summary data found
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