import { supabase } from '@/integrations/supabase/client';
import { TabletItem, TVItem, SDCardItem, PendriveItem } from './types';

interface CreateOrderParams {
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
  setOrderType: (value: string) => void;
  setSalesOrder: (value: string) => void;
  setDealId: (value: string) => void;
  setNucleusId: (value: string) => void;
  setSchoolName: (value: string) => void;
  setTablets: (value: TabletItem[]) => void;
  setTvs: (value: TVItem[]) => void;
  setSDCards: (value: SDCardItem[]) => void;
  setPendrives: (value: PendriveItem[]) => void;
  setLoading: (value: boolean) => void;
  loadOrders: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrderSummary: () => Promise<void>;
  validateForm: () => boolean;
  toast: ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => void;
  generateDummyId: (prefix: string) => string;
}

export const validateForm = (
  orderType: string,
  schoolName: string,
  tabletsDialogOpen: boolean,
  tvsDialogOpen: boolean,
  sdCardsDialogOpen: boolean,
  pendrivesDialogOpen: boolean,
  tablets: TabletItem[],
  tvs: TVItem[],
  sdCards: SDCardItem[],
  pendrives: PendriveItem[],
  toast: ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' }) => void
): boolean => {
  if (!orderType) {
    toast({ title: 'Error', description: 'Please select an order type', variant: 'destructive' });
    return false;
  }
  if (!schoolName.trim()) {
    toast({ title: 'Error', description: 'School Name is required', variant: 'destructive' });
    return false;
  }
  if (!tabletsDialogOpen && !tvsDialogOpen && !sdCardsDialogOpen && !pendrivesDialogOpen) {
    toast({ title: 'Error', description: 'Please select at least one of Tablets, TVs, SD Cards, or Pendrives', variant: 'destructive' });
    return false;
  }

  const validTablets = tabletsDialogOpen ? tablets.filter(t => t.model && t.location && t.quantity > 0) : [];
  const validTVs = tvsDialogOpen ? tvs.filter(t => t.model && t.location && t.quantity > 0) : [];
  const validSDCards = sdCardsDialogOpen ? sdCards.filter(s => s.size && s.location && s.quantity > 0) : [];
  const validPendrives = pendrivesDialogOpen ? pendrives.filter(p => p.size && p.location && p.quantity > 0) : [];

  if (!validTablets.length && !validTVs.length && !validSDCards.length && !validPendrives.length) {
    toast({ title: 'Error', description: 'Please add at least one valid item with required fields', variant: 'destructive' });
    return false;
  }

  for (const tablet of validTablets) {
    const validSerials = tablet.serialNumbers.filter(sn => sn.trim());
    if (validSerials.length !== tablet.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of serial numbers (${validSerials.length}) does not match quantity (${tablet.quantity}) for tablet order`,
        variant: 'destructive',
      });
      return false;
    }
    if (tablet.assetStatuses.length !== tablet.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of asset statuses (${tablet.assetStatuses.length}) does not match quantity (${tablet.quantity}) for tablet order`,
        variant: 'destructive',
      });
      return false;
    }
  }

  for (const tv of validTVs) {
    const validSerials = tv.serialNumbers.filter(sn => sn.trim());
    if (validSerials.length !== tv.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of serial numbers (${validSerials.length}) does not match quantity (${tv.quantity}) for TV order`,
        variant: 'destructive',
      });
      return false;
    }
    if (tv.assetStatuses.length !== tv.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of asset statuses (${tv.assetStatuses.length}) does not match quantity (${tv.quantity}) for TV order`,
        variant: 'destructive',
      });
      return false;
    }
  }

  for (const sdCard of validSDCards) {
    const validSerials = sdCard.serialNumbers.filter(sn => sn.trim());
    if (validSerials.length !== sdCard.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of serial numbers (${validSerials.length}) does not match quantity (${sdCard.quantity}) for SD Card order`,
        variant: 'destructive',
      });
      return false;
    }
    if (sdCard.assetStatuses.length !== sdCard.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of asset statuses (${sdCard.assetStatuses.length}) does not match quantity (${sdCard.quantity}) for SD Card order`,
        variant: 'destructive',
      });
      return false;
    }
  }

  for (const pendrive of validPendrives) {
    const validSerials = pendrive.serialNumbers.filter(sn => sn.trim());
    if (validSerials.length !== pendrive.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of serial numbers (${validSerials.length}) does not match quantity (${pendrive.quantity}) for Pendrive order`,
        variant: 'destructive',
      });
      return false;
    }
    if (pendrive.assetStatuses.length !== pendrive.quantity) {
      toast({
        title: 'Validation Error',
        description: `Number of asset statuses (${pendrive.assetStatuses.length}) does not match quantity (${pendrive.quantity}) for Pendrive order`,
        variant: 'destructive',
      });
      return false;
    }
  }

  return true;
};

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
  setOrderType,
  setSalesOrder,
  setDealId,
  setNucleusId,
  setSchoolName,
  setTablets,
  setTvs,
  setSDCards,
  setPendrives,
  setLoading,
  loadOrders,
  loadDevices,
  loadOrderSummary,
  validateForm,
  toast,
  generateDummyId,
}: CreateOrderParams) => {
  if (!validateForm(
    orderType,
    schoolName,
    tabletsDialogOpen,
    tvsDialogOpen,
    sdCardsDialogOpen,
    pendrivesDialogOpen,
    tablets,
    tvs,
    sdCards,
    pendrives,
    toast
  )) return;

  setLoading(true);
  try {
    console.log('Creating order with:', { orderType, salesOrder, dealId, nucleusId, schoolName, tablets, tvs, sdCards, pendrives });
    const validTablets = tabletsDialogOpen ? tablets.filter(t => t.model && t.location && t.quantity > 0) : [];
    const validTVs = tvsDialogOpen ? tvs.filter(t => t.model && t.location && t.quantity > 0) : [];
    const validSDCards = sdCardsDialogOpen ? sdCards.filter(s => s.size && s.location && s.quantity > 0) : [];
    const validPendrives = pendrivesDialogOpen ? pendrives.filter(p => p.size && p.location && p.quantity > 0) : [];

    // Process Tablets
    for (const tablet of validTablets) {
      const salesOrderId = salesOrder || generateDummyId('SO');
      const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: effectiveOrderType,
          asset_type: 'Tablet',
          model: tablet.model,
          quantity: tablet.quantity,
          warehouse: tablet.location,
          sales_order: salesOrderId,
          deal_id: dealId || null,
          school_name: schoolName,
          nucleus_id: nucleusId || null,
          serial_numbers: tablet.serialNumbers.filter(sn => sn.trim()),
          asset_statuses: tablet.assetStatuses,
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          configuration: tablet.configuration || null,
          product: tablet.product || null,
          sd_card_size: tablet.sdCardSize || null,
          profile_id: tablet.profileId || null,
        })
        .select()
        .single();
      if (orderError) throw new Error(`Order insertion failed for tablet: ${orderError.message}`);

      for (let i = 0; i < tablet.quantity; i++) {
        const serialNumber = tablet.serialNumbers[i] || generateDummyId('SN');
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            asset_type: 'Tablet',
            model: tablet.model,
            serial_number: serialNumber.trim(),
            warehouse: tablet.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            configuration: tablet.configuration || null,
            product: tablet.product || null,
            asset_status: tablet.assetStatuses[i] || 'Fresh',
            sd_card_size: tablet.sdCardSize || null,
            profile_id: tablet.profileId || null,
          });
        if (deviceError) throw new Error(`Device insertion failed for tablet: ${deviceError.message}`);
      }
    }

    // Process TVs
    for (const tv of validTVs) {
      const salesOrderId = salesOrder || generateDummyId('SO');
      const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: effectiveOrderType,
          asset_type: 'TV',
          model: tv.model,
          quantity: tv.quantity,
          warehouse: tv.location,
          sales_order: salesOrderId,
          deal_id: dealId || null,
          school_name: schoolName,
          nucleus_id: nucleusId || null,
          serial_numbers: tv.serialNumbers.filter(sn => sn.trim()),
          asset_statuses: tv.assetStatuses,
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          configuration: tv.configuration || null,
          product: tv.product || null,
        })
        .select()
        .single();
      if (orderError) throw new Error(`Order insertion failed for TV: ${orderError.message}`);

      for (let i = 0; i < tv.quantity; i++) {
        const serialNumber = tv.serialNumbers[i] || generateDummyId('SN');
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            asset_type: 'TV',
            model: tv.model,
            serial_number: serialNumber.trim(),
            warehouse: tv.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            configuration: tv.configuration || null,
            product: tv.product || null,
            asset_status: tv.assetStatuses[i] || 'Fresh',
          });
        if (deviceError) throw new Error(`Device insertion failed for TV: ${deviceError.message}`);
      }
    }

    // Process SD Cards
    for (const sdCard of validSDCards) {
      const salesOrderId = salesOrder || generateDummyId('SO');
      const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: effectiveOrderType,
          asset_type: 'SD Card',
          model: sdCard.size,
          quantity: sdCard.quantity,
          warehouse: sdCard.location,
          sales_order: salesOrderId,
          deal_id: dealId || null,
          school_name: schoolName,
          nucleus_id: nucleusId || null,
          serial_numbers: sdCard.serialNumbers.filter(sn => sn.trim()),
          asset_statuses: sdCard.assetStatuses,
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
        })
        .select()
        .single();
      if (orderError) throw new Error(`Order insertion failed for SD Card: ${orderError.message}`);

      for (let i = 0; i < sdCard.quantity; i++) {
        const serialNumber = sdCard.serialNumbers[i] || generateDummyId('SN');
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            asset_type: 'SD Card',
            model: sdCard.size,
            serial_number: serialNumber.trim(),
            warehouse: sdCard.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            asset_status: sdCard.assetStatuses[i] || 'Fresh',
          });
        if (deviceError) throw new Error(`Device insertion failed for SD Card: ${deviceError.message}`);
      }
    }

    // Process Pendrives
    for (const pendrive of validPendrives) {
      const salesOrderId = salesOrder || generateDummyId('SO');
      const effectiveOrderType = orderType === 'Stock' || orderType === 'Return' ? 'Inward' : 'Outward';
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: effectiveOrderType,
          asset_type: 'Pendrive',
          model: pendrive.size,
          quantity: pendrive.quantity,
          warehouse: pendrive.location,
          sales_order: salesOrderId,
          deal_id: dealId || null,
          school_name: schoolName,
          nucleus_id: nucleusId || null,
          serial_numbers: pendrive.serialNumbers.filter(sn => sn.trim()),
          asset_statuses: pendrive.assetStatuses,
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
        })
        .select()
        .single();
      if (orderError) throw new Error(`Order insertion failed for Pendrive: ${orderError.message}`);

      for (let i = 0; i < pendrive.quantity; i++) {
        const serialNumber = pendrive.serialNumbers[i] || generateDummyId('SN');
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            asset_type: 'Pendrive',
            model: pendrive.size,
            serial_number: serialNumber.trim(),
            warehouse: pendrive.location,
            sales_order: salesOrderId,
            deal_id: dealId || null,
            school_name: schoolName,
            nucleus_id: nucleusId || null,
            status: effectiveOrderType === 'Inward' ? 'Available' : 'Assigned',
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            asset_status: pendrive.assetStatuses[i] || 'Fresh',
          });
        if (deviceError) throw new Error(`Device insertion failed for Pendrive: ${deviceError.message}`);
      }
    }

    // Reset form state
    setOrderType('');
    setSalesOrder('');
    setDealId('');
    setNucleusId('');
    setSchoolName('');
    setTablets([]);
    setTvs([]);
    setSDCards([]);
    setPendrives([]);

    // Refresh data
    await Promise.all([loadOrders(), loadDevices(), loadOrderSummary()]);

    toast({
      title: 'Success',
      description: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    toast({
      title: 'Error',
      description: 'Failed to create order. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};