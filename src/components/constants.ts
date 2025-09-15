// constants.ts
export const ORDER_TYPES = [
  'Hardware',
  'Additional Hardware',
  'Replacement Hardware (FOC)',
  'Replacement Hardware (CB)',
  'Exp Hub',
  'Stock Movement',
  'Employee',
  'Stock',
  'Return',
  'Other',
] as const;

export const TABLET_MODELS = [
  'Lenovo TB301XU',
  'Lenovo TB301FU',
  'Lenovo TB-8505F',
  'Lenovo TB-7306F',
  'Lenovo TB-7306X',
  'Lenovo TB-7305X',
  'IRA T811',
] as const;

export const TV_MODELS = [
  'Hyundai TV - 39"',
  'Hyundai TV - 43"',
  'Hyundai TV - 50"',
  'Hyundai TV - 55"',
  'Hyundai TV - 65"',
  'Xentec TV - 39"',
  'Xentec TV - 43"',
] as const;

export const SD_CARD_MODELS = [
  '64 GB',
  '128 GB',
  '256 GB',
  '512 GB',
] as const;

export const COVER_MODELS = [
  'M7 Flap Cover',
  'M7 Normal Cover',
  'M8 Flap Cover',
  'M8 Normal Cover',
  'M8 4th Gen Flap Cover - Lead',
  'M8 4th Gen Flap Cover - Propel',
  'M8 4th Gen Flap Cover - Pinnacle',
  'M8 4th Gen Flap Cover - Techbook',
  'M8 4th Gen Flap Cover - BoardAce',
] as const;

export const TABLET_CONFIGURATIONS = [
  '1G+8 GB (Android-7)',
  '1G+16 GB (Android-9)',
  '1G+32 GB (Android-9)',
  '2G+16 GB (Android-9)',
  '2G+32 GB (Android-9)',
  '2G+32 GB (Android-10)',
  '3G+32 GB (Android-10)',
  '3G+32 GB (Android-13)',
  '4G+64 GB (Android-13)',
] as const;

export const TV_CONFIGURATIONS = [
  'Non Smart TV',
  'Smart TV',
  'Android TV',
  'Web OS',
] as const;

export const SD_CARD_CONFIGURATIONS = SD_CARD_MODELS; // Same as models

export const COVER_CONFIGURATIONS = COVER_MODELS; // Same as models

export const PRODUCTS = [
  'Lead',
  'Propel',
  'Pinnacle',
  'Techbook',
  'BoardAce',
] as const;

export const SD_CARD_SIZES = SD_CARD_MODELS; // Reuse for Tablet SD field

export const LOCATIONS = [
  'Trichy',
  'Bangalore',
  'Hyderabad',
  'Kolkata',
  'Bhiwandi',
  'Ghaziabad',
  'Zirakpur',
  'Indore',
  'Jaipur',
] as const;

export const ASSET_STATUSES = [
  'Fresh',
  'Refurb',
  'Scrap',
] as const;

export const ASSET_GROUPS = [
  'NFA',
  'FA',
] as const;

export const ASSET_TYPES = [
  'Tablet',
  'TV',
  'SD Card',
  'Covers',
] as const;