import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Search } from 'lucide-react';
import { debounce } from 'lodash';
import { DatePickerWithRange } from './DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { Device } from './types';

interface AuditTableProps {
  devices: Device[];
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedAssetType: string;
  setSelectedAssetType: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedAssetStatus: string;
  setSelectedAssetStatus: (value: string) => void;
  selectedConfiguration: string;
  setSelectedConfiguration: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedOrderType: string;
  setSelectedOrderType: (value: string) => void;
  selectedAssetGroup: string;
  setSelectedAssetGroup: (value: string) => void;
  fromDate: DateRange | undefined;
  setFromDate: (range: DateRange | undefined) => void;
  toDate: string;
  setToDate: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onUpdateAssetCheck: (deviceId: string, checkStatus: string) => void;
  onClearAllChecks: (ids: string[]) => void;
  userRole: string;
}

const AuditTable: React.FC<AuditTableProps> = ({
  devices,
  selectedWarehouse,
  setSelectedWarehouse,
  selectedAssetType,
  setSelectedAssetType,
  selectedModel,
  setSelectedModel,
  selectedAssetStatus,
  setSelectedAssetStatus,
  selectedConfiguration,
  setSelectedConfiguration,
  selectedProduct,
  setSelectedProduct,
  selectedStatus,
  setSelectedStatus,
  selectedOrderType,
  setSelectedOrderType,
  selectedAssetGroup,
  setSelectedAssetGroup,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  searchQuery,
  setSearchQuery,
  onUpdateAssetCheck,
  onClearAllChecks,
  userRole,
}) => {
  const [scannerInput, setScannerInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Debounce search input
  const debouncedSetSearchQuery = useMemo(
    () => debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  // Handle check action on button click
  const handleCheck = () => {
    const trimmedInput = scannerInput.trim();
    if (!trimmedInput) {
      // Optionally show a toast or alert for empty input
      return;
    }

    const matchedDevice = devices.find(
      (device) => device.serial_number === trimmedInput || device.id === trimmedInput
    );

    if (matchedDevice) {
      onUpdateAssetCheck(matchedDevice.id, '✓ Matched');
      setSelectedStatus('Verified');
    } else {
      // Handle case where no device is found
      toast({ title: 'Not Matched', description: `Serial number ${trimmedInput} not found.`, variant: 'destructive' });
    }
    setScannerInput(''); // Clear input after check
  };

  // Compute unique values and memoize
  const uniqueValues = useMemo(
    () => ({
      warehouses: [...new Set(devices.map((d) => d.warehouse || ''))].filter(Boolean).sort(),
      assetTypes: [...new Set(devices.map((d) => d.asset_type || ''))].filter(Boolean).sort(),
      models: [...new Set(devices.map((d) => d.model || ''))].filter(Boolean).sort(),
      configurations: [...new Set(devices.map((d) => d.configuration || ''))].filter(Boolean).sort(),
      products: [...new Set(devices.map((d) => d.product || ''))].filter(Boolean).sort(),
      assetStatuses: [...new Set(devices.map((d) => d.asset_status || ''))].filter(Boolean).sort(),
      assetGroups: [...new Set(devices.map((d) => d.asset_group || ''))].filter(Boolean).sort(),
      orderTypes: [...new Set(devices.map((d) => d.order_type || ''))].filter(Boolean).sort(),
    }),
    [devices]
  );

  // Memoized filtered devices with latest record and "Stock" only logic
  const filteredDevices = useMemo(() => {
    const latestDevices = new Map<string, Device>();
    devices.forEach((d) => {
      const existing = latestDevices.get(d.serial_number || d.id);
      if (!existing || new Date(d.updated_at) > new Date(existing.updated_at)) {
        latestDevices.set(d.serial_number || d.id, d);
      }
    });

    const latestStockDevices = Array.from(latestDevices.values()).filter((d) => d.status === 'Stock');

    return latestStockDevices.filter((d) => {
      const warehouseMatch = selectedWarehouse === 'All' || d.warehouse === selectedWarehouse;
      const assetTypeMatch = selectedAssetType === 'All' || d.asset_type === selectedAssetType;
      const modelMatch = selectedModel === 'All' || d.model === selectedModel;
      const configMatch = selectedConfiguration === 'All' || d.configuration === selectedConfiguration;
      const productMatch = selectedProduct === 'All' || d.product === selectedProduct;
      const assetStatusMatch = selectedAssetStatus === 'All' || d.asset_status === selectedAssetStatus;
      const assetGroupMatch = selectedAssetGroup === 'All' || d.asset_group === selectedAssetGroup;
      const orderTypeMatch = selectedOrderType === 'All' || d.order_type === selectedOrderType;
      const dateMatch =
        !fromDate?.from || !fromDate?.to
          ? true
          : new Date(d.updated_at) >= new Date(fromDate.from) && new Date(d.updated_at) <= new Date(fromDate.to);
      const searchMatch =
        searchQuery.trim() === '' ||
        [
          d.serial_number,
          d.model,
          d.asset_type,
          d.configuration,
          d.product,
          d.asset_status,
          d.asset_group,
          d.warehouse,
          d.order_type,
          d.sales_order,
          d.deal_id,
          d.nucleus_id,
          d.school_name,
          d.asset_check || '',
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        warehouseMatch &&
        assetTypeMatch &&
        modelMatch &&
        configMatch &&
        productMatch &&
        assetStatusMatch &&
        assetGroupMatch &&
        orderTypeMatch &&
        dateMatch &&
        searchMatch &&
        !d.is_deleted
      );
    });
  }, [
    devices,
    selectedWarehouse,
    selectedAssetType,
    selectedModel,
    selectedConfiguration,
    selectedProduct,
    selectedAssetStatus,
    selectedAssetGroup,
    selectedOrderType,
    fromDate,
    searchQuery,
  ]);

  // Paginated devices
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredDevices.slice(start, end).map((d) => ({
      ...d,
      asset_check: d.asset_check || 'X Unmatched',
    }));
  }, [filteredDevices, currentPage]);

  const totalPages = Math.ceil(filteredDevices.length / rowsPerPage);
  const matched = filteredDevices.filter((d) => d.asset_check === '✓ Matched').length;
  const unmatched = filteredDevices.length - matched;

  const clearFilters = () => {
    setSelectedWarehouse('All');
    setSelectedAssetType('All');
    setSelectedModel('All');
    setSelectedConfiguration('All');
    setSelectedProduct('All');
    setSelectedAssetStatus('All');
    setSelectedAssetGroup('All');
    setSelectedOrderType('All');
    setFromDate(undefined);
    setToDate('');
    setSearchQuery('');
    setCurrentPage(1);
    setScannerInput('');
  };

  const handleClearAllChecks = () => {
    const idsToClear = filteredDevices.map((d) => d.id);
    onClearAllChecks(idsToClear);
  };

  const canEdit = userRole === 'admin' || userRole === 'manager';

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1 text-base">
            <Filter className="h-3 w-3 text-primary" /> Audit Filters
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span>
              Matched: <span className="text-green-500">{matched}</span> Unmatched:{' '}
              <span className="text-red-500">{unmatched}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Scan barcode or enter serial number..."
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                className="pl-8 pr-10 h-7 text-xs"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={handleCheck}
            >
              Check
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedStatus('')} // Placeholder for Status action
            >
              Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="hover:bg-destructive hover:text-destructive-foreground text-xs h-7"
            >
              Clear All
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-9 gap-2 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Warehouse</label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Warehouses</SelectItem>
                {uniqueValues.warehouses
                  .filter((w) => w.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((w) => (
                    <SelectItem key={w} value={w} className="text-xs">
                      {w}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Asset Type</label>
            <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Types</SelectItem>
                {uniqueValues.assetTypes
                  .filter((at) => at.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((at) => (
                    <SelectItem key={at} value={at} className="text-xs">
                      {at}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Models" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Models</SelectItem>
                {uniqueValues.models
                  .filter((m) => m.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Configuration</label>
            <Select value={selectedConfiguration} onValueChange={setSelectedConfiguration}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Configurations" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Configurations</SelectItem>
                {uniqueValues.configurations
                  .filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Products</SelectItem>
                {uniqueValues.products
                  .filter((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Asset Status</label>
            <Select value={selectedAssetStatus} onValueChange={setSelectedAssetStatus}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Asset Statuses" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Asset Statuses</SelectItem>
                {uniqueValues.assetStatuses
                  .filter((as) => as.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((as) => (
                    <SelectItem key={as} value={as} className="text-xs">
                      {as}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Asset Group</label>
            <Select value={selectedAssetGroup} onValueChange={setSelectedAssetGroup}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Asset Groups" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Asset Groups</SelectItem>
                {uniqueValues.assetGroups
                  .filter((ag) => ag.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ag) => (
                    <SelectItem key={ag} value={ag} className="text-xs">
                      {ag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Order Type</label>
            <Select value={selectedOrderType} onValueChange={setSelectedOrderType}>
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="All Order Types" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full h-6 text-xs"
                  />
                </div>
                <SelectItem value="All">All Order Types</SelectItem>
                {uniqueValues.orderTypes
                  .filter((ot) => ot.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ot) => (
                    <SelectItem key={ot} value={ot} className="text-xs">
                      {ot}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Date Range</label>
            <DatePickerWithRange
              date={fromDate}
              setDate={(range) => {
                setFromDate(range);
                setToDate(range?.to ? range.to.toISOString().split('T')[0] : '');
              }}
              className="h-7"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No.</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Asset Status</TableHead>
              <TableHead>Asset Group</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Asset Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDevices.map((d, index) => (
              <TableRow key={d.id}>
                <TableCell>{(currentPage - 1) * rowsPerPage + index + 1}</TableCell>
                <TableCell>{d.asset_type}</TableCell>
                <TableCell>{d.model}</TableCell>
                <TableCell>{d.configuration}</TableCell>
                <TableCell>{d.serial_number}</TableCell>
                <TableCell>{d.product}</TableCell>
                <TableCell>{d.asset_status}</TableCell>
                <TableCell>{d.asset_group}</TableCell>
                <TableCell>{d.warehouse}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`check-${d.id}`}
                      checked={d.asset_check === '✓ Matched'}
                      onCheckedChange={(checked) => {
                        onUpdateAssetCheck(d.id, checked ? '✓ Matched' : 'X Unmatched');
                        if (checked) setSelectedStatus('Verified');
                      }}
                      disabled={!canEdit}
                    />
                    <Label
                      htmlFor={`check-${d.id}`}
                      className={d.asset_check === '✓ Matched' ? 'text-green-500' : 'text-red-500'}
                    >
                      {d.asset_check}
                    </Label>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditTable;