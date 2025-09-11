import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X } from 'lucide-react';

interface Device {
  id: string;
  product: string;
  model: string;
  warehouse: string;
  status: string;
  asset_status?: string;
  sales_order?: string;
}

interface DeviceFiltersProps {
  devices: Device[];
  filters: {
    products: string[];
    models: string[];
    warehouses: string[];
    statuses: string[];
    asset_statuses: string[];
    sales_orders: string[];
  };
  onFiltersChange: (filters: any) => void;
}

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  devices,
  filters,
  onFiltersChange,
}) => {
  const getUniqueValues = (key: keyof Device) => {
    const values = devices
      .map(device => device[key])
      .filter((value, index, self) => value && self.indexOf(value) === index) as string[];
    return values.sort();
  };

  const getUniqueAssetStatuses = () => {
    const values = devices
      .map(device => device.asset_status || 'Fresh')
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.sort();
  };

  const updateFilter = (filterType: string, value: string, checked: boolean) => {
    const newFilters = { ...filters };
    if (checked) {
      newFilters[filterType as keyof typeof filters] = [...filters[filterType as keyof typeof filters], value];
    } else {
      newFilters[filterType as keyof typeof filters] = filters[filterType as keyof typeof filters].filter((item: string) => item !== value);
    }
    onFiltersChange(newFilters);
  };

  const clearFilter = (filterType: string) => {
    const newFilters = { ...filters };
    newFilters[filterType as keyof typeof filters] = [];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      products: [],
      models: [],
      warehouses: [],
      statuses: [],
      asset_statuses: [],
      sales_orders: []
    });
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

  const hasActiveFilters = Object.values(filters).some(filter => filter.length > 0);

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
        title="Status"
        filterType="statuses"
        values={getUniqueValues('status')}
        selectedValues={filters.statuses}
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
      
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          Clear all
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
};