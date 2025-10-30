// constants.ts
export const API_ENDPOINT = 'https://apigw.leadschool.in/oms/warehouse/orders/devices';
export const API_KEY = 'f6kA3UF8?9GV';

export const orderTypes = [
  'Hardware',
  'Additional Hardware',
  'Replacement Hardware (FOC)',
  'Replacement Hardware (CB)',
  'Exp Hub',
  'SD Card',
  'Stock Movement',
  'Employee',
  'Stock',
  'Return',
  'Other',
];

export const tabletModels = [
  'Lenovo TB301XU',
  'Lenovo TB301FU',
  'Lenovo TB-8505F',
  'Lenovo TB-7306F',
  'Lenovo TB-7306X',
  'Lenovo TB-7305X',
  'IRA T811',
];

export const tvModels = [
  'Xentec TV - 39"',
  'Xentec TV - 43"',
  'Hyundai TV - 39"',
  'Hyundai TV - 43"',
  'Hyundai TV - 50"',
  'Hyundai TV - 55"',
  'Hyundai TV - 65"',
  'Hyundai TV - 75"',
  'Hyundai TV - 85"',
  'Other TV - 39"',
];

export const configurations = [
  '1G+8 GB (Android-7)',
  '1G+16 GB (Android-9)',
  '1G+32 GB (Android-9)',
  '2G+16 GB (Android-9)',
  '2G+32 GB (Android-9)',
  '2G+32 GB (Android-10)',
  '3G+32 GB (Android-10)',
  '3G+32 GB (Android-13)',
  '4G+64 GB (Android-13)',
];

export const tvConfigurations = [
  'Non Smart TV',
  'Smart TV',
  'Android TV',
  'Web OS',
];

export const products = [
  'Lead',
  'Propel',
  'Pinnacle',
  'Techbook',
  'BoardAce',
];

export const coverModels = [
  'M7 Flap Cover',
  'M8 Flap Cover',
  'M8 Flap Cover 4th gen - Lead',
  'M8 Flap Cover 4th gen - Propel',
  'M8 Flap Cover 4th gen - Pinnacle',
  'M8 Flap Cover 4th gen - Techbook',
  'M8 Flap Cover 4th gen - BoardAce',
];

export const sdCardSizes = [
  '64 GB',
  '128 GB',
  '256 GB',
  '512 GB',
];

export const pendriveSizes = [
  '8 GB',
  '16 GB',
  '32 GB',
  '64 GB',
  '128 GB',
];

export const additionalAssetTypes = [
  'Dongle',
  'USB Wall Adapter',
  'Synology NAS',
  'Netgear NAS',
  '1 TB HDD',
  'Access Point',
  'Hybrid Router',
  'Sim Router',
  'NAS Power Adapter',
  'Router Power Adapter',
  'HDMI Cable',
  'Mini VGA Gender Changer',
  'HDMI to VGA Converter',
  'Tablet Charger - C Type',
  'Tablet Charger - Micro USB',
];

export const locations = [
  'Trichy',
  'Bangalore',
  'Hyderabad',
  'Kolkata',
  'Bhiwandi',
  'Ghaziabad',
  'Zirakpur',
  'Indore',
  'Jaipur',
];

export const assetStatuses = [
  'Fresh',
  'Refurb',
  'Scrap',
];

export const assetGroups = [
  'NFA',
  'FA',
];

export const assetTypes = [
  'Tablet',
  'TV',
  'SD Card',
  'Cover',
  'Pendrive',
] as const;

// Model options per additional asset type
export const assetModels: Record<string, string[]> = {
  'Synology NAS': ['1 Bay', '2 Bay'],
  'Netgear NAS': ['1 Bay', '2 Bay'],
  'Dongle': ['Dongle'],
  'USB Wall Adapter': ['USB Wall Adapter'],
  'HDD': ['1 TB', '2 TB', '4 TB', '8 TB', '10 TB'],
  'Access Point': ['Asus', 'LB Link'],
  'Hybrid Router': ['CP Plus'],
  'Sim Router': ['Sim Router'],
  'NAS Power Adapter': ['NAS Power Adapter'],
  'Router Power Adapter': ['Router Power Adapter'],
  'HDMI Cable': ['1m', '2m', '3m', '4m', '5m'],
  'Mini VGA Gender Changer': ['Mini VGA Gender Changer'],
  'HDMI to VGA Converter': ['HDMI to VGA Converter'],
  'Tablet Charger - C Type': ['Tablet Charger - C Type'],
  'Tablet Charger - Micro USB': ['Tablet Charger - Micro USB'],
  // Defaults to empty for others
};

export const deviceStatuses = [
  'Available',
  'Assigned',
  'Stock',
];

// New constant for excluded items in AuditTable
export const excludedAuditItems = {
  assetTypes: ['Cover', 'SD Card', 'Pendrive'] as const,
  models: ['SD Card Box', 'Envelope', 'HDMI Cable', 'USB Wall Adapter', 'Dongle'] as const,
};