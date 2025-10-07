// types.ts
import type { 
  ORDER_TYPES, 
  TABLET_MODELS, 
  TV_MODELS, 
  SD_CARD_MODELS, 
  COVER_MODELS,
  ASSET_TYPES 
} from './constants';

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
  model: SD_CARD_MODELS;
  configuration: string;
  product: string;
  quantity: number;
  location: string;
  // No serialNumbers, assetStatuses, assetGroups
}

export interface CoverItem {
  id: string;
  model: COVER_MODELS;
  configuration: string;
  product: string;
  quantity: number;
  location: string;
  // No serialNumbers, assetStatuses, assetGroups
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
  serial_number?: string | null; // Null for SD Card/Covers
  sd_card_size?: string | null; // Only for Tablets
  profile_id?: string | null; // Only for Tablets
  product?: string | null;
  asset_status?: string | null; // Null for SD Card/Covers
  asset_group?: string | null; // Null for SD Card/Covers
  status: 'Stock' | 'Assigned' | 'Available';
  created_at: string;
  updated_by?: string;
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