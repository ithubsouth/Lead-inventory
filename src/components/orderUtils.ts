import { supabase } from '@/integrations/supabase/client';
import { Order, TabletItem, TVItem, SDCardItem, PendriveItem } from './types';

export interface CreateOrderParams {
  orderType: string;
  salesOrder: string;
  dealId: string;
  nucleusId: string;
  schoolName: string;
  tablets: TabletItem[];
  tvs: TVItem[];
  sdCards: SDCardItem[];
  pendrives: PendriveItem[];
  tabletsDialogOpen: boolean;
  tvsDialogOpen: boolean;
  sdCardsDialogOpen: boolean;
  pendrivesDialogOpen: boolean;
  setLoading: (loading: boolean) => void;
  loadOrders: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrderSummary: () => Promise<void>;
  validateForm: () => boolean;
  toast: (options: { title: string; description: string; variant?: 'destructive' }) => void;
  generateDummyId: (prefix: string) => string;
}

export const createOrder = async ({
  orderType,
  salesOrder,
  dealId,
  nucleusId,
  schoolName,
  tablets,
  tvs,
  sdCards,
  pendrives,
  tabletsDialogOpen,
  tvsDialogOpen,
  sdCardsDialogOpen,
  pendrivesDialogOpen,
  setLoading,
  loadOrders,
  loadDevices,
  loadOrderSummary,
  validateForm,
  toast,
  generateDummyId,
}: CreateOrderParams) => {
  if (!validateForm()) {
    return;
  }

  setLoading(true);
  try {
    console.log('Creating order with:', { orderType, salesOrder, dealId, nucleusId, schoolName, tablets, tvs, sdCards, pendrives });
    const validTablets = tabletsDialogOpen ? tablets.filter(t => t.model && t.location && t.quantity > 0) : [];
    const validTVs = tvsDialogOpen ? tvs.filter(t => t.model && t.location && t.quantity > 0) : [];
    const validSDCards = sdCardsDialogOpen ? sdCards.filter(s => s.size && s.location && s.quantity > 0) : [];
    const validPendrives = pendrivesDialogOpen ? pendrives.filter(p => p.size && p.location && p.quantity > 0) : [];

    // For now, create simplified orders using only existing columns
    const allItems = [
      ...validTablets.map(t => ({ type: 'Tablet', item: t })),
      ...validTVs.map(t => ({ type: 'TV', item: t })),
      ...validSDCards.map(s => ({ type: 'SD Card', item: s })),
      ...validPendrives.map(p => ({ type: 'Pendrive', item: p }))
    ];

    for (const { type, item } of allItems) {
      const model = 'model' in item ? item.model : item.size;
      const serialNumbers = item.serialNumbers.filter((sn: string) => sn.trim());
      
      // Create order with existing columns only
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: orderType,
          model: model,
          product: 'Lead', // Default product
          quantity: item.quantity,
          warehouse: item.location,
          sales_order: salesOrder,
          deal_id: dealId || null,
          school_name: schoolName,
          nucleus_id: nucleusId || null,
          serial_numbers: serialNumbers,
        })
        .select()
        .single();
        
      if (orderError) {
        console.error(`Order insertion failed for ${type}:`, orderError);
        toast({
          title: 'Error',
          description: `Failed to create order for ${type}`,
          variant: 'destructive'
        });
        continue;
      }

      // Create devices for this order
      for (let i = 0; i < item.quantity; i++) {
        const serialNumber = serialNumbers[i] || generateDummyId('SN');
        
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            model: model,
            product: 'Lead', // Default product
            serial_number: serialNumber,
            warehouse: item.location,
            order_id: orderData.id,
          });
          
        if (deviceError) {
          console.error(`Device insertion failed for ${type}:`, deviceError);
        }
      }
    }

    await Promise.all([loadOrders(), loadDevices(), loadOrderSummary()]);
    
    toast({
      title: 'Success',
      description: 'Orders created successfully'
    });

  } catch (error) {
    console.error('Error creating order:', error);
    toast({
      title: 'Error',
      description: 'Failed to create order. Please try again.',
      variant: 'destructive'
    });
  } finally {
    setLoading(false);
  }
};