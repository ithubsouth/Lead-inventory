// types.ts
// types.ts
export interface Order {
    id: string;
    order_type: string;
    asset_type: string;
    model: string;
    quantity: number;
    warehouse: string;
    sales_order?: string;
    deal_id?: string;
    school_name: string;
    nucleus_id?: string;
    serial_numbers: string[];
    configuration?: string;
    product?: string;
    material_type: string;
    order_date: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    is_deleted: boolean;
}

export interface Device {
    id: string;
    order_id: string;
    asset_type: string;
    model: string;
    serial_number: string;
    warehouse: string;
    sales_order?: string;
    deal_id?: string;
    school_name: string;
    nucleus_id?: string;
    status: string;
    material_type: string;
    configuration?: string;
    product?: string;
    asset_status: string; // e.g., 'Fresh', 'Refurb', 'Scrap'
    asset_group: string;  // e.g., 'NFA', 'FA'
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    is_deleted: boolean;
}

export interface OrderSummary {
  warehouse: string;
  asset_type: 'Tablet' | 'TV' | 'SD Card' | 'Pendrive';
  model: string;
  inward: number;
  outward: number;
  stock: number;
}

export interface TabletItem {
  id: string;
  model: string;
  configuration: string;
  product: string;
  sdCardSize: string;
  profileId: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroup: 'FA' | 'NFA' | ''; // Added assetGroup with empty string for initial state
}

export interface TVItem {
  id: string;
  model: string;
  configuration: string;
  product: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroup: 'FA' | 'NFA' | ''; // Added assetGroup with empty string for initial state
}

export interface SDCardItem {
  id: string;
  size: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroup: 'FA' | 'NFA' | ''; // Added assetGroup with empty string for initial state
}

export interface PendriveItem {
  id: string;
  size: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroup: 'FA' | 'NFA' | ''; // Added assetGroup with empty string for initial state
}

export interface EditHistoryEntry {
  timestamp: string;
  changes: string;
  changedFields: string[];
}