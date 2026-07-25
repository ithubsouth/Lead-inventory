import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import {
  REQUEST_TYPE_LABELS,
  RequestType,
  getFlow,
} from '@/lib/requestFlows';
import {
  assetTypes, locations, assetGroups, assetStatuses,
  tabletModels, tvModels, coverModels, sdCardSizes, pendriveSizes,
  configurations, tvConfigurations,
} from './constants';
import ComboInput from './ComboInput';
import { Plus, Minus, Camera, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazy, Suspense } from 'react';

const EnhancedBarcodeScanner = lazy(() => import('./EnhancedBarcodeScanner'));

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
}

interface SerialEntry {
  serial_number: string;
  asset_status: string;
  asset_group: string;
  asset_code: string;
  asset_condition: string;
}

export default function CreateRequestDialog({ open, onOpenChange, onCreated }: Props) {
  const { profile } = useUserProfile();
  const [type, setType] = useState<RequestType>('new_hardware');
  const [title, setTitle] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [assetType, setAssetType] = useState<string>('');
  const [model, setModel] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [assetStatus, setAssetStatus] = useState('Fresh');
  const [assetGroup, setAssetGroup] = useState('NFA');
  const [assetCode, setAssetCode] = useState('');
  const [assetCondition, setAssetCondition] = useState('');
  const [serialEntries, setSerialEntries] = useState<SerialEntry[]>([
    { serial_number: '', asset_status: 'Fresh', asset_group: 'NFA', asset_code: '', asset_condition: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const STORAGE_KEY = 'nucleus_request_draft';

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.type) setType(draft.type);
        if (draft.title) setTitle(draft.title);
        if (draft.poNumber) setPoNumber(draft.poNumber);
        if (draft.warehouse) setWarehouse(draft.warehouse);
        if (draft.assetType) setAssetType(draft.assetType);
        if (draft.model) setModel(draft.model);
        if (draft.configuration) setConfiguration(draft.configuration);
        if (draft.quantity) setQuantity(draft.quantity);
        if (draft.assetStatus) setAssetStatus(draft.assetStatus);
        if (draft.assetGroup) setAssetGroup(draft.assetGroup);
        if (draft.assetCode) setAssetCode(draft.assetCode);
        if (draft.assetCondition) setAssetCondition(draft.assetCondition);
        if (draft.serialEntries) setSerialEntries(draft.serialEntries);
        if (draft.notes) setNotes(draft.notes);

        toast('Restored draft request');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Save draft whenever state changes
  useEffect(() => {
    const draft = {
      type, title, poNumber, warehouse, assetType, model, configuration,
      quantity, assetStatus, assetGroup, assetCode, assetCondition,
      serialEntries, notes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    type, title, poNumber, warehouse, assetType, model, configuration,
    quantity, assetStatus, assetGroup, assetCode, assetCondition,
    serialEntries, notes
  ]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTitle('');
    setPoNumber('');
    setWarehouse('');
    setAssetType('');
    setModel('');
    setConfiguration('');
    setQuantity(1);
    setAssetStatus('Fresh');
    setAssetGroup('NFA');
    setAssetCode('');
    setAssetCondition('');
    setSerialEntries([{ serial_number: '', asset_status: 'Fresh', asset_group: 'NFA', asset_code: '', asset_condition: '' }]);
    setNotes('');
    setDeleteConfirmOpen(false);
    toast.success('Draft deleted');
  };

  // New state for system duplicates and camera
  const [systemDuplicateInfo, setSystemDuplicateInfo] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeScannerIndex, setActiveScannerIndex] = useState<number | null>(null);

  // Validation: Check for duplicates within the current entry list
  const duplicateSerials = useMemo(() => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    serialEntries.forEach(e => {
      const s = e.serial_number?.trim();
      if (!s) return;
      if (seen.has(s)) dups.add(s);
      seen.add(s);
    });
    return dups;
  }, [serialEntries]);

  // System validation: Check Supabase devices table for existing serials
  useEffect(() => {
    const timer = setTimeout(async () => {
      const serialsToCheck = serialEntries
        .map(e => e.serial_number?.trim())
        .filter(Boolean);

      if (serialsToCheck.length === 0) {
        setSystemDuplicateInfo({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from('devices')
          .select('serial_number, warehouse')
          .in('serial_number', serialsToCheck)
          .eq('is_deleted', false);

        if (error) throw error;

        const info: Record<string, string> = {};
        (data || []).forEach(d => {
          if (d.serial_number) info[d.serial_number] = d.warehouse || 'Unknown Warehouse';
        });
        setSystemDuplicateInfo(info);
      } catch (err) {
        console.error('System duplicate check failed:', err);
      }
    }, 400); // Debounce check

    return () => clearTimeout(timer);
  }, [serialEntries]);

  // Sync serialEntries length with quantity
  useEffect(() => {
    if (quantity < 1) return;
    setSerialEntries(prev => {
      if (prev.length === quantity) return prev;
      if (prev.length < quantity) {
        const added = Array.from({ length: quantity - prev.length }, () => ({
          serial_number: '',
          asset_status: assetStatus || 'Fresh',
          asset_group: assetGroup || 'NFA',
          asset_code: assetCode || '',
          asset_condition: assetCondition || ''
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, quantity);
    });
  }, [quantity, assetStatus, assetGroup, assetCode, assetCondition]);

  // Sync bulk asset group change to individual entries
  const handleBulkAssetGroupChange = (val: string) => {
    setAssetGroup(val);
    setSerialEntries(prev => prev.map(e => ({ ...e, asset_group: val })));
  };

  // Sync bulk asset status change to individual entries
  const handleBulkAssetStatusChange = (val: string) => {
    setAssetStatus(val);
    setSerialEntries(prev => prev.map(e => ({ ...e, asset_status: val })));
  };

  // Sync bulk asset code change to individual entries
  const handleBulkAssetCodeChange = (val: string) => {
    setAssetCode(val);
    setSerialEntries(prev => prev.map(e => ({ ...e, asset_code: val })));
  };

  // Sync bulk asset condition change to individual entries
  const handleBulkAssetConditionChange = (val: string) => {
    setAssetCondition(val);
    setSerialEntries(prev => prev.map(e => ({ ...e, asset_condition: val })));
  };

  const updateEntry = (index: number, field: keyof SerialEntry, value: string) => {
    setSerialEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleBulkPaste = () => {
    const serials = bulkText
      .split(/[\n\r, ]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serials.length === 0) return;

    const newEntries = serials.map(s => ({
      serial_number: s,
      asset_status: assetStatus || 'Fresh',
      asset_group: assetGroup || 'NFA',
      asset_code: assetCode || '',
      asset_condition: assetCondition || ''
    }));

    setQuantity(serials.length);
    setSerialEntries(newEntries);
    setShowBulk(false);
    setBulkText('');
    toast.success(`${serials.length} serials imported`);
  };

  const handleScanResult = (scannedText: string) => {
    if (activeScannerIndex !== null) {
      updateEntry(activeScannerIndex, 'serial_number', scannedText);
      setScannerOpen(false);
      setActiveScannerIndex(null);
    }
  };

  const submit = async () => {
    if (!profile?.id) {
      toast.error('You must be signed in.');
      return;
    }
    if (!title.trim()) {
      toast.error('Please add a short title.');
      return;
    }
    setSaving(true);
    try {
      const flow = getFlow(type);
      const first = flow[0];

      const { data: reqRows, error: reqErr } = await supabase
        .from('requests')
        .insert({
          type,
          status: 'open' as const,
          title: title.trim(),
          current_stage: first.key,
          current_stage_dept: first.dept,
          po_number: poNumber || null,
          warehouse: warehouse || null,
          asset_type: assetType || null,
          model: model || null,
          configuration: configuration || null,
          quantity: quantity,
          asset_group: assetGroup || null,
          notes: notes || null,
          raised_by: profile.id,
          raised_by_email: profile.email,
          raised_dept: profile.department || 'Administrators',
        })
        .select('id')
        .single();
      if (reqErr) throw reqErr;
      const requestId = reqRows!.id as string;

      await supabase.from('request_stages').insert({
        request_id: requestId,
        stage_key: first.key,
        stage_label: first.label,
        order_index: 0,
        assigned_dept: first.dept,
        action: 'submitted' as const,
        actor_id: profile.id,
        actor_email: profile.email,
        actor_dept: profile.department,
        comment: 'Request raised',
      });

      if (serialEntries.length) {
        const seen = new Set<string>();
        const rows = serialEntries.map((e) => {
          const s = e.serial_number?.trim();
          const dup = s ? seen.has(s) : false;
          if (s) seen.add(s);

          return {
            request_id: requestId,
            serial_number: e.serial_number,
            asset_group: e.asset_group || null,
            asset_status: e.asset_status || null,
            asset_code: e.asset_code || null,
            asset_condition: e.asset_condition || null,
            warehouse: warehouse || null,
            exists_in_devices: s ? !!systemDuplicateInfo[s] : false,
            is_duplicate: dup,
          };
        });
        await (supabase as any).from('request_serials').insert(rows);
      }

      await supabase.from('notifications').insert({
        target_dept: first.dept,
        request_id: requestId,
        kind: 'stage_assigned',
        title: `New ${REQUEST_TYPE_LABELS[type]} request`,
        body: `${title} · assigned to ${first.dept} (${first.label})`,
      });

      localStorage.removeItem(STORAGE_KEY);
      toast.success('Request created');
      onCreated?.(requestId);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw] w-full max-h-[95vh] flex flex-col p-0'>
        <DialogHeader className='p-6 pb-2'>
          <DialogTitle>Raise a New Request</DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-2 space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='col-span-2'>
              <Label>Request Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='new_hardware'>{REQUEST_TYPE_LABELS.new_hardware}</SelectItem>
                  <SelectItem value='asset_movement'>{REQUEST_TYPE_LABELS.asset_movement}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='col-span-2'>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Short description' />
            </div>
            <div>
              <Label>PO Number</Label>
              <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div>
              <Label>Warehouse</Label>
              <Select value={warehouse} onValueChange={setWarehouse}>
                <SelectTrigger><SelectValue placeholder='Select' /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger><SelectValue placeholder='Select' /></SelectTrigger>
                <SelectContent>
                  {assetTypes.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <ComboInput
                fieldKey={`req_model_${assetType || 'any'}`}
                baseOptions={
                  assetType === 'Tablet' ? tabletModels :
                  assetType === 'TV' ? tvModels :
                  assetType === 'Cover' ? coverModels :
                  assetType === 'SD Card' ? sdCardSizes :
                  assetType === 'Pendrive' ? pendriveSizes : []
                }
                value={model}
                onChange={setModel}
                placeholder={assetType ? 'Select or type model' : 'Select asset type first'}
              />
            </div>
            <div>
              <Label>Configuration</Label>
              <ComboInput
                fieldKey={`req_config_${assetType || 'any'}`}
                baseOptions={
                  assetType === 'Tablet' ? configurations :
                  assetType === 'TV' ? tvConfigurations : []
                }
                value={configuration}
                onChange={setConfiguration}
                placeholder='Select or type configuration'
              />
            </div>
          </div>

          <div className='space-y-4 pt-4 border-t'>
            <div className='flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200'>
              <div className='flex items-center gap-4'>
                <span className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>Bulk Apply to All Rows:</span>
                <div className='flex gap-2'>
                  <div className='w-[120px]'>
                    <Select value={assetStatus} onValueChange={handleBulkAssetStatusChange}>
                      <SelectTrigger className="h-8 text-[10px] font-bold bg-white"><SelectValue placeholder='Status' /></SelectTrigger>
                      <SelectContent>
                        {assetStatuses.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='w-[100px]'>
                    <Select value={assetGroup} onValueChange={handleBulkAssetGroupChange}>
                      <SelectTrigger className="h-8 text-[10px] font-bold bg-white"><SelectValue placeholder='Group' /></SelectTrigger>
                      <SelectContent>
                        {assetGroups.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <Label className='text-xs font-bold text-slate-600'>Quantity</Label>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className='h-3 w-3' />
                  </Button>
                  <Input
                    type='number'
                    className='w-12 h-7 text-center text-xs'
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowBulk(!showBulk)}
                  className='h-7 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border-blue-100'
                >
                  {showBulk ? 'Cancel' : 'Bulk Paste'}
                </Button>
              </div>
            </div>

            {showBulk && (
              <div className='space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100'>
                <Label className='text-xs font-bold text-blue-600 uppercase tracking-wider'>Paste Serial Numbers (one per line or comma separated)</Label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Enter serials here..."
                  className='h-32 bg-white'
                />
                <Button onClick={handleBulkPaste} className='w-full bg-blue-600 hover:bg-blue-700'>
                  Apply Bulk Paste
                </Button>
              </div>
            )}

            <div className='space-y-2'>
              <div className='grid grid-cols-[220px,40px,120px,100px,100px,120px,1fr] gap-3 px-1'>
                <Label className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>Serial Number</Label>
                <div />
                <Label className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>Asset Status</Label>
                <Label className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>Asset Group</Label>
                <Label className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>Asset Code</Label>
                <Label className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>Asset Condition</Label>
                <div />
              </div>

              <div className='space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-thin border border-slate-100 rounded-xl p-2'>
                {serialEntries.map((entry, i) => {
                  const s = entry.serial_number?.trim();
                  const isLocalDup = s && duplicateSerials.has(s);
                  const systemLocation = s ? systemDuplicateInfo[s] : null;

                  return (
                    <div key={i} className='flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-50 shadow-sm'>
                      <div className='w-[220px]'>
                        <Input
                          placeholder={`Serial ${i + 1}`}
                          value={entry.serial_number}
                          onChange={(e) => updateEntry(i, 'serial_number', e.target.value)}
                          className={cn(
                            'h-10 text-xs w-full font-mono transition-all',
                            (isLocalDup || systemLocation) && 'border-red-500 bg-red-50/30 ring-red-200'
                          )}
                        />
                      </div>
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-10 w-10 shrink-0 hover:bg-blue-50 hover:text-blue-600 transition-colors'
                        onClick={() => {
                          setActiveScannerIndex(i);
                          setScannerOpen(true);
                        }}
                      >
                        <Camera className='h-4 w-4' />
                      </Button>

                      <div className="w-[120px]">
                        <Select value={entry.asset_status} onValueChange={(v) => updateEntry(i, 'asset_status', v)}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {assetStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-[100px]">
                        <Select value={entry.asset_group} onValueChange={(v) => updateEntry(i, 'asset_group', v)}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {assetGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        className="h-10 text-xs w-[100px]"
                        value={entry.asset_code}
                        onChange={(e) => updateEntry(i, 'asset_code', e.target.value)}
                        placeholder="Code"
                      />

                      <Input
                        className="h-10 text-xs w-[120px]"
                        value={entry.asset_condition}
                        onChange={(e) => updateEntry(i, 'asset_condition', e.target.value)}
                        placeholder="Condition"
                      />

                      <div className='flex-1 flex items-center min-w-0'>
                        {isLocalDup && (
                          <span className='text-[10px] text-red-500 font-bold uppercase truncate'>
                            Local Duplicate
                          </span>
                        )}
                        {systemLocation && !isLocalDup && (
                          <span className='text-[10px] text-red-500 font-bold uppercase truncate'>
                            Currently Inward in {systemLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='col-span-2 pt-4 border-t'>
            <Label className='mb-2 block'>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder='Additional details or requirements...'
              className='resize-none'
            />
          </div>
        </div>

        <DialogFooter className='p-6 pt-3 border-t bg-muted/30 flex justify-between items-center'>
          <div className='flex gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setDeleteConfirmOpen(true)} className='text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 font-bold'>
              <Trash2 className='w-4 h-4' />
              Delete Draft
            </Button>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className='bg-blue-600 hover:bg-blue-700 min-w-[120px]'>
              {saving ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </DialogFooter>

        {scannerOpen && (
          <Suspense fallback={null}>
            <EnhancedBarcodeScanner
              isOpen={scannerOpen}
              onClose={() => {
                setScannerOpen(false);
                setActiveScannerIndex(null);
              }}
              onScan={handleScanResult}
            />
          </Suspense>
        )}

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                All your progress will be lost. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearDraft} className='bg-red-600 hover:bg-red-700 text-white'>
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
