import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OrderFilters } from './OrderFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface Order {
  id: string;
  product: string;
  model: string;
  quantity: number;
  warehouse: string;
  order_type: string;
  asset_status?: string;
  sales_order: string;
  school_name?: string;
  order_date: string;
  serial_numbers: string[];
}

export const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('is_deleted', false)
        .order('order_date', { ascending: false })
        .order('sales_order', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sales_order.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.school_name && order.school_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDateRange = !filters.date_range || 
        (new Date(order.order_date) >= filters.date_range.from && 
         new Date(order.order_date) <= filters.date_range.to);

      const matchesFilters = 
        (filters.products.length === 0 || filters.products.includes(order.product)) &&
        (filters.models.length === 0 || filters.models.includes(order.model)) &&
        (filters.warehouses.length === 0 || filters.warehouses.includes(order.warehouse)) &&
        (filters.order_types.length === 0 || filters.order_types.includes(order.order_type)) &&
        (filters.asset_statuses.length === 0 || filters.asset_statuses.includes(order.asset_status || 'Fresh')) &&
        (filters.sales_orders.length === 0 || filters.sales_orders.includes(order.sales_order));

      return matchesSearch && matchesFilters && matchesDateRange;
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Product', 'Model', 'Quantity', 'Warehouse', 'Order Type', 'Asset Status', 'Sales Order', 'School', 'Order Date', 'Serial Numbers'],
      ...filteredOrders.map(order => [
        order.product,
        order.model,
        order.quantity.toString(),
        order.warehouse,
        order.order_type,
        order.asset_status || 'Fresh',
        order.sales_order,
        order.school_name || '',
        new Date(order.order_date).toLocaleDateString(),
        order.serial_numbers.join(';')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
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

  const getAssetStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Fresh': return 'default';
      case 'Refurb': return 'secondary';
      case 'Scrap': return 'destructive';
      default: return 'default';
    }
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <CardTitle>View Orders ({filteredOrders.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} title="Export CSV">
                <Download className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders..."
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
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <>
              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Order Type</TableHead>
                      <TableHead>Asset Status</TableHead>
                      <TableHead>Sales Order</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.product}</TableCell>
                        <TableCell>{order.model}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.warehouse}</TableCell>
                        <TableCell>
                          <Badge variant={getOrderTypeBadgeVariant(order.order_type)}>
                            {order.order_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAssetStatusBadgeVariant(order.asset_status)}>
                            {order.asset_status || 'Fresh'}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.sales_order}</TableCell>
                        <TableCell>{order.school_name || '-'}</TableCell>
                        <TableCell>
                          {new Date(order.order_date).toLocaleDateString('en-GB')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};