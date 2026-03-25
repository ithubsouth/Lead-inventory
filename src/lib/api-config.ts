export const OMS_API_CONFIG = {
  // Use Vite proxy in all dev environments (localhost + Lovable preview) to avoid CORS issues
  BASE_URL: import.meta.env.DEV
    ? '/api-oms/oms/warehouse/orders/devices'
    : 'https://apigw.leadschool.in/oms/warehouse/orders/devices',
  API_KEY: 'f6kA3UF8?9GV',
};
