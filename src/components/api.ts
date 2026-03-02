// API service for external integrations

const WAREHOUSE_API_URL = 'https://apigw.leadschool.in/oms/warehouse/orders/devices';
const API_KEY = 'f6kA3UF8?9GV';

export interface SalesOrderApiResponse {
  schoolName?: string;
  dealId?: string;
  nucleusId?: string;
  agreementType?: string;
  valid: boolean;
  raw?: any;
}

export async function fetchSalesOrderDetails(salesOrderNo: string): Promise<SalesOrderApiResponse> {
  try {
    const response = await fetch(`${WAREHOUSE_API_URL}?soNo=${encodeURIComponent(salesOrderNo)}`, {
      method: 'GET',
      headers: {
        'api_key': API_KEY,
      },
    });

    if (!response.ok) {
      console.warn(`Sales order API returned status ${response.status}`);
      return { valid: false };
    }

    const data = await response.json();
    console.log('Sales Order API response:', data);

    // Handle array or object response
    const record = Array.isArray(data) ? data[0] : data;

    if (!record || (Array.isArray(data) && data.length === 0)) {
      return { valid: false };
    }

    return {
      valid: true,
      schoolName: record.schoolName || record.school_name || record.SchoolName || '',
      dealId: record.dealId || record.deal_id || record.DealId || '',
      nucleusId: record.nucleusId || record.nucleus_id || record.NucleusId || '',
      agreementType: record.agreementType || record.agreement_type || record.AgreementType || '',
      raw: record,
    };
  } catch (error) {
    console.error('Error fetching sales order details:', error);
    return { valid: false };
  }
}
