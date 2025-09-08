import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  product: string;
  model: string;
  warehouse: string;
  order_type: string;
  asset_status?: string;
  sales_order: string;
  order_date: string;
}

interface OrderFiltersProps {
  orders: Order[];
  filters: {
    products: string[];
    models: string[];
    warehouses: string[];
    order_types: string[];
    asset_statuses: string[];
    sales_orders: string[];
    date_range: { from: Date; to: Date } | null;
  };
  onFiltersChange: (filters: any) => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  orders,
  filters,
  onFiltersChange,
}) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date; to: Date } | null>(filters.date_range);

  const getUniqueValues = (key: keyof Order) => {
    const values = orders
      .map(order => order[key])
      .filter((value, index, self) => value && self.indexOf(value) === index) as string[];
    return values.sort();
  };

  const getUniqueAssetStatuses = () => {
    const values = orders
      .map(order => order.asset_status || 'Fresh')
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.sort();
  };

  const updateFilter = (filterType: string, value: string, checked: boolean) => {
    const newFilters = { ...filters };
    const currentFilter = filters[filterType as keyof typeof filters];
    
    if (Array.isArray(currentFilter)) {
      if (checked) {
        (newFilters[filterType as keyof typeof filters] as string[]) = [...currentFilter, value];
      } else {
        (newFilters[filterType as keyof typeof filters] as string[]) = currentFilter.filter((item: string) => item !== value);
      }
    }
    onFiltersChange(newFilters);
  };

  const clearFilter = (filterType: string) => {
    const newFilters = { ...filters };
    if (filterType === 'date_range') {
      newFilters.date_range = null;
    } else {
      (newFilters[filterType as keyof typeof filters] as string[]) = [];
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      products: [],
      models: [],
      warehouses: [],
      order_types: [],
      asset_statuses: [],
      sales_orders: [],
      date_range: null
    });
    setTempDateRange(null);
  };

  const applyDateRange = () => {
    onFiltersChange({ ...filters, date_range: tempDateRange });
    setDatePickerOpen(false);
  };

  const FilterPopover = ({ 
    title, 
    filterType, 
    values, 
    selectedValues 
  }: { 
    title: string;
    filterType: string;
    values: string[];
    selectedValues: string[];
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 border-dashed">
          {title}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
              {selectedValues.length}
            </Badge>
          )}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-60 overflow-auto">
          {selectedValues.length > 0 && (
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-xs font-medium">
                {selectedValues.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => clearFilter(filterType)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="p-1">
            {values.map((value) => (
              <div key={value} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded">
                <Checkbox
                  id={`${filterType}-${value}`}
                  checked={selectedValues.includes(value)}
                  onCheckedChange={(checked) => 
                    updateFilter(filterType, value, checked as boolean)
                  }
                />
                <label
                  htmlFor={`${filterType}-${value}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {value}
                </label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const hasActiveFilters = 
    Object.values(filters).some(filter => 
      Array.isArray(filter) ? filter.length > 0 : filter !== null
    );

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
      <FilterPopover
        title="Product"
        filterType="products"
        values={getUniqueValues('product')}
        selectedValues={filters.products}
      />
      <FilterPopover
        title="Model"
        filterType="models"
        values={getUniqueValues('model')}
        selectedValues={filters.models}
      />
      <FilterPopover
        title="Warehouse"
        filterType="warehouses"
        values={getUniqueValues('warehouse')}
        selectedValues={filters.warehouses}
      />
      <FilterPopover
        title="Order Type"
        filterType="order_types"
        values={getUniqueValues('order_type')}
        selectedValues={filters.order_types}
      />
      <FilterPopover
        title="Asset Status"
        filterType="asset_statuses"
        values={getUniqueAssetStatuses()}
        selectedValues={filters.asset_statuses}
      />
      <FilterPopover
        title="Sales Order"
        filterType="sales_orders"
        values={getUniqueValues('sales_order')}
        selectedValues={filters.sales_orders}
      />
      
      {/* Date Range Picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 border-dashed">
            <CalendarIcon className="mr-2 h-3 w-3" />
            Date Range
            {filters.date_range && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDateRange?.from}
              selected={tempDateRange}
              onSelect={(range) => setTempDateRange(range as { from: Date; to: Date })}
              numberOfMonths={2}
            />
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={applyDateRange} disabled={!tempDateRange}>
                Apply
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setTempDateRange(null);
                  clearFilter('date_range');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          Clear all
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
};