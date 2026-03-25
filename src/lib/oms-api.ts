import { OMS_API_CONFIG } from './api-config';
import { supabase } from '@/integrations/supabase/client';

export interface OMSOrderDetails {
  dealId: string;
  nucleusId: string;
  schoolName: string;
  agreementType: string;
}

export const fetchOrderDetails = async (soNo: string): Promise<OMSOrderDetails | null> => {
  try {
    const { data: json, error } = await supabase.functions.invoke(OMS_API_CONFIG.FUNCTION_NAME, {
      body: { soNo },
    });

    if (error) {
      throw new Error(error.message || 'Failed to call OMS proxy');
    }

    const response = json as any;

    if (!response?.success) {
      throw new Error(`OMS API responded false: ${response?.msg || response?.error || 'no message'}`);
    }

    if (!response.data) {
      throw new Error('OMS API responded success:true but empty data');
    }

    const data = response.data;
    const firstDevice = data.devices && data.devices.length > 0 ? data.devices[0] : null;

    return {
      dealId: data.dealId?.toString() || '',
      nucleusId: firstDevice?.nucleusId?.toString() || '',
      schoolName: firstDevice?.schoolName || '',
      agreementType: data.agreementType || '',
    };
  } catch (error: any) {
    console.error('Error fetching OMS order details:', error);
    return null;
  }
};
