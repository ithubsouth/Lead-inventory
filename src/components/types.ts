export interface Order {
  id: string;
  order_type: string;
  material_type: 'Inward' | 'Outward';
  asset_type: 'Tablet' | 'TV' | 'SD Card' | 'Pendrive';
  model: string;
  product: string | null;
  configuration: string | null;
  asset_statuses: string[];
  quantity: number;
  warehouse: string;
  sales_order: string | null;
  deal_id: string | null;
  school_name: string;
  nucleus_id: string | null;
  serial_numbers: string[];
  order_date: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  editHistory?: EditHistoryEntry[];
  status?: 'Success' | 'Failed' | 'Pending';
  statusDetails?: string;
}

export interface Device {
  id: string;
  asset_type: 'Tablet' | 'TV' | 'SD Card' | 'Pendrive';
  model: string;
  product: string | null;
  configuration: string | null;
  asset_status: string;
  serial_number: string;
  warehouse: string;
  sales_order: string | null;
  deal_id: string | null;
  school_name: string;
  nucleus_id: string | null;
  status: 'Available' | 'Assigned';
  order_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
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
}

export interface SDCardItem {
  id: string;
  size: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
}

export interface PendriveItem {
  id: string;
  size: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
}

export interface EditHistoryEntry {
  timestamp: string;
  changes: string;
  changedFields: string[];
}