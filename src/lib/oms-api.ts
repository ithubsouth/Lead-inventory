import { OMS_API_CONFIG } from './api-config';

export interface OMSOrderDetails {
  dealId: string;
  nucleusId: string;
  schoolName: string;
  agreementType: string;
}

export const fetchOrderDetails = async (soNo: string): Promise<OMSOrderDetails | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(`${OMS_API_CONFIG.BASE_URL}?soNo=${soNo}`, {
      method: 'GET',
      headers: {
        'api_key': OMS_API_CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.success && json.data) {
      const data = json.data;
      const firstDevice = data.devices && data.devices.length > 0 ? data.devices[0] : null;

      return {
        dealId: data.dealId?.toString() || '',
        nucleusId: firstDevice?.nucleusId?.toString() || '',
        schoolName: firstDevice?.schoolName || '',
        agreementType: data.agreementType || '',
      };
    }

    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('OMS API request timed out');
    } else {
      console.error('Error fetching OMS order details:', error);
    }
    return null;
  }
};
