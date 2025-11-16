export type ORDER_TYPES = typeof import('./constants').orderTypes[number];
export type TABLET_MODELS = typeof import('./constants').tabletModels[number];
export type TV_MODELS = typeof import('./constants').tvModels[number];
export type COVER_MODELS = typeof import('./constants').coverModels[number];
export type ASSET_TYPES = 'Tablet' | 'TV' | 'SD Card' | 'Cover' | 'Pendrive' | 'Other';

export interface TabletItem {
  id: string;
  model: TABLET_MODELS;
  configuration: string;
  product: string;
  sdCardSize: string;
  profileId: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroups: string[];
}

export interface TVItem {
  id: string;
  model: TV_MODELS;
  configuration: string;
  product: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
  assetStatuses: string[];
  assetGroups: string[];
}

export interface SDCardItem {
  id: string;
  sdCardSize: string;
  profileId: string;
  quantity: number;
  location: string;
  serialNumbers?: string[];
}

export interface CoverItem {
  id: string;
  coverType: string;
  quantity: number;
  location: string;
}

export interface PendriveItem {
  id: string;
  size: string;
  quantity: number;
  location: string;
  serialNumbers: string[];
}

export interface OtherItem {
  id: string;
  material: string;
  quantity: number;
  location: string;
}

export interface Order {
  id: string;
  order_type: ORDER_TYPES;
  material_type: 'Inward' | 'Outward';
  asset_type: ASSET_TYPES;
  model: string;
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
  configuration?: string | null;
  product?: string | null;
  sd_card_size?: string | null;
  profile_id?: string | null;
  created_by?: string;
  updated_by?: string;
  status?: string;
  statusDetails?: string;
}

export interface Device {
  id: string;
  sales_order: string | null;
  order_type: string;
  warehouse: string;
  deal_id: string | null;
  nucleus_id: string | null;
  school_name: string;
  asset_type: ASSET_TYPES;
  model: string;
  configuration?: string | null;
  serial_number?: string | null;
  sd_card_size?: string | null;
  profile_id?: string | null;
  product?: string | null;
  asset_status?: string | null;
  asset_group?: string | null;
  asset_condition?: string | null;
  far_code?: string | null; // Added to match DevicesTable usage
  status: 'Stock' | 'Assigned' | 'Available';
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string | null;
  is_deleted: boolean;
  order_id: string;
  material_type?: 'Inward' | 'Outward';
}

export interface OrderSummary {
  warehouse: string;
  asset_type: ASSET_TYPES;
  model: string;
  inward: number;
  outward: number;
  stock: number;
}