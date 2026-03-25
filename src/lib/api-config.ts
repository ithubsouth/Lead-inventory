export const OMS_API_CONFIG = {
  // Use proxy in development to avoid CORS/timeout issues
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api-oms/oms/warehouse/orders/devices'
    : 'https://apigw.leadschool.in/oms/warehouse/orders/devices',
  API_KEY: 'f6kA3UF8?9GV',
};
