import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Plus, Minus, Camera, Trash2, RotateCcw, Download, Upload, FileText, X, Loader2, Eye, AlertTriangle, Search } from 'lucide-react';
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
  const [receivedFrom, setReceivedFrom] = useState('');
  const [stockQuery, setStockQuery] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockDevices, setStockDevices] = useState<any[]>([]);
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const [docToDelete, setDocToDelete] = useState<number | null>(null);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (draft.receivedFrom) setReceivedFrom(draft.receivedFrom);
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
    setPendingDocs([]);
    setDeleteConfirmOpen(false);
    toast.success('Form reset');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingDocs(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingDoc = (index: number) => {
    setPendingDocs(prev => prev.filter((_, i) => i !== index));
    setDocToDelete(null);
  };

  const viewPendingDoc = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    // We don't revoke immediately because it would break the new tab
  };

  const downloadPendingDoc = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  /** Asset Movement (EH to FA): load serials that are currently in stock. */
  useEffect(() => {
    if (type !== 'asset_movement') return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setStockLoading(true);
      let q = supabase
        .from('devices')
        .select('serial_number, asset_type, model, warehouse, asset_group, asset_status, configuration')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (stockQuery.trim()) q = q.ilike('serial_number', `%${stockQuery.trim()}%`);
      if (warehouse) q = q.eq('warehouse', warehouse);
      const { data } = await q;
      if (!cancelled) {
        setStockDevices(data || []);
        setStockLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [type, stockQuery, warehouse]);

  const addStockSerial = (d: any) => {
    setSerialEntries(prev => {
      if (prev.some(e => e.serial_number === d.serial_number)) return prev;
      const entry: SerialEntry = {
        serial_number: d.serial_number,
        asset_status: d.asset_status || assetStatus || 'Fresh',
        asset_group: 'FA',
        asset_code: '',
        asset_condition: '',
      };
      const blank = prev.findIndex(e => !e.serial_number?.trim());
      const next = blank >= 0
        ? prev.map((e, i) => (i === blank ? entry : e))
        : [...prev, entry];
      setQuantity(next.length);
      return next;
    });
  };


  const downloadCSV = () => {
    const headers = [
      'Request Type', 'Title', 'PO Number', 'Warehouse', 'Asset Type', 'Model', 'Configuration',
      'Serial Number', 'Asset Status', 'Asset Group', 'Asset Code', 'Asset Condition'
    ];
    const rows = serialEntries.map(e => [
      REQUEST_TYPE_LABELS[type] || type,
      title,
      poNumber,
      warehouse,
      assetType,
      model,
      configuration,
      e.serial_number,
      e.asset_status,
      e.asset_group,
      e.asset_code,
      e.asset_condition
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `request_serials_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Template downloaded');
  };

  const handleScanResult = (scannedText: string) => {
    if (activeScannerIndex !== null) {
      updateEntry(activeScannerIndex, 'serial_number', scannedText);
      setScannerOpen(false);
      setActiveScannerIndex(null);
    }
  };

  const handleSerialPaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    const pastedText = e.clipboardData.getData('text');
    const serials = pastedText
      .split(/[\n\r\t, ]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serials.length <= 1) return; // Standard paste behavior

    e.preventDefault();

    setSerialEntries(prev => {
      const next = [...prev];
      let currentIdx = startIndex;

      for (const s of serials) {
        if (currentIdx < next.length) {
          next[currentIdx] = { ...next[currentIdx], serial_number: s };
        } else {
          next.push({
            serial_number: s,
            asset_status: assetStatus || 'Fresh',
            asset_group: assetGroup || 'NFA',
            asset_code: assetCode || '',
            asset_condition: assetCondition || ''
          });
        }
        currentIdx++;
      }

      // Update quantity if we added more rows
      if (next.length > quantity) {
        setQuantity(next.length);
      }

      return next;
    });

    toast.success(`Pasted ${serials.length} serial numbers`);
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

      // Upload pending documents
      if (pendingDocs.length > 0) {
        for (const file of pendingDocs) {
          try {
            const path = `${requestId}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
            const { error: upErr } = await supabase.storage
              .from('request-documents')
              .upload(path, file);

            if (upErr) {
              console.error(`Failed to upload ${file.name}:`, upErr);
              continue;
            }

            await supabase.from('request_documents').insert({
              request_id: requestId,
              stage_key: first.key,
              file_path: path,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: profile.id,
              uploaded_by_email: profile.email,
            });
          } catch (uploadErr) {
            console.error(`Error processing ${file.name}:`, uploadErr);
          }
        }
      }

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
              <Label>PO Number (Sales Order)</Label>
              <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div>
              <Label>Received From (School Name)</Label>
              <Input
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder='Stock'
              />
            </div>
            {type === 'asset_movement' && (
              <div className='col-span-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-blue-700'>
                    Pick serials available in stock
                  </span>
                  <div className='relative w-64'>
                    <Input
                      value={stockQuery}
                      onChange={(e) => setStockQuery(e.target.value)}
                      placeholder='Search stock serials...'
                      className='h-8 text-xs pr-8'
                    />
                    <Search className='absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400' />
                  </div>
                </div>
                <div className='max-h-48 overflow-y-auto rounded-lg bg-white border border-blue-100 divide-y'>
                  {stockLoading && (
                    <div className='p-3 text-xs text-muted-foreground flex items-center gap-2'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' /> Loading stock serials...
                    </div>
                  )}
                  {!stockLoading && stockDevices.length === 0 && (
                    <div className='p-3 text-xs text-muted-foreground'>No stock serials found.</div>
                  )}
                  {stockDevices.map((d) => {
                    const picked = serialEntries.some((e) => e.serial_number === d.serial_number);
                    return (
                      <button
                        key={d.serial_number}
                        type='button'
                        onClick={() => addStockSerial(d)}
                        disabled={picked}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors',
                          picked && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <span className='font-mono font-bold'>{d.serial_number}</span>
                        <span className='text-[10px] text-slate-500'>
                          {[d.asset_type, d.model, d.warehouse, d.asset_group].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className='text-[10px] text-muted-foreground'>
                  Approving this request updates the asset group and asset code on these existing assets — no new order is created.
                </p>
              </div>
            )}
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
                  onClick={downloadCSV}
                  className='h-7 bg-blue-50 text-blue-600 border-blue-100 flex items-center'
                  title="Download CSV Template"
                >
                  <Download className='w-3 h-3' />
                </Button>
              </div>
            </div>

            <div className='space-y-4 pt-4 border-t'>
              <div className='flex items-center gap-4 mb-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                  <Input
                    placeholder='Search serial numbers...'
                    value={serialSearchQuery}
                    onChange={(e) => setSerialSearchQuery(e.target.value)}
                    className='pl-9 h-9 text-xs'
                  />
                  {serialSearchQuery && (
                    <button
                      onClick={() => setSerialSearchQuery('')}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>
              </div>

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
                  const matchesSearch = !serialSearchQuery || s?.toLowerCase().includes(serialSearchQuery.toLowerCase());

                  if (!matchesSearch) return null;

                  const isLocalDup = s && duplicateSerials.has(s);
                  const systemLocation = s ? systemDuplicateInfo[s] : null;

                  return (
                    <div key={i} className='flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-50 shadow-sm'>
                      <div className='w-[220px]'>
                        <Input
                          placeholder={`Serial ${i + 1}`}
                          value={entry.serial_number}
                          onChange={(e) => updateEntry(i, 'serial_number', e.target.value)}
                          onPaste={(e) => handleSerialPaste(e, i)}
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

                      <div className='flex items-center min-w-0 pl-3'>
                        {isLocalDup && (
                          <span className='text-[10px] text-red-600 font-black uppercase tracking-tighter animate-pulse'>
                            Local Duplicate
                          </span>
                        )}
                        {systemLocation && !isLocalDup && (
                          <span className='text-[10px] text-amber-600 font-black uppercase tracking-tighter'>
                            Inward in {systemLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='col-span-2 pt-4 border-t space-y-4'>
            <div>
              <div className='flex items-center justify-between mb-3'>
                <div className="space-y-0.5">
                  <div className='flex items-center gap-2'>
                    <Label className='text-sm font-bold text-slate-700'>Documents</Label>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => fileInputRef.current?.click()}
                      className='h-7 px-2 text-[10px] font-bold uppercase tracking-widest gap-1.5 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100'
                    >
                      <Upload className='w-3 h-3' />
                      Click to upload files
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Upload PDF, Images, or Spreadsheets. No limit on number of uploads.</p>
                </div>
              </div>

              <input
                type='file'
                multiple
                accept='.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv'
                className='hidden'
                ref={fileInputRef}
                onChange={handleFileSelect}
              />

              {pendingDocs.length > 0 && (
                <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mt-4'>
                  {pendingDocs.map((file, idx) => (
                    <div key={idx} className='flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-100 shadow-sm text-[11px] group hover:border-blue-200 transition-colors'>
                      <div className='flex items-center gap-3 truncate'>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText className='w-4 h-4 text-blue-600' />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className='truncate font-bold text-slate-700'>{file.name}</span>
                          <span className='text-[10px] font-bold text-slate-400 uppercase'>{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Button
                          size='icon'
                          variant='ghost'
                          className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => viewPendingDoc(file)}
                          title="Preview"
                        >
                          <Eye className='w-3.5 h-3.5' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => downloadPendingDoc(file)}
                          title="Download"
                        >
                          <Download className='w-3.5 h-3.5' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className="h-7 w-7 rounded-lg hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDocToDelete(idx)}
                          title="Delete"
                        >
                          <X className='w-3.5 h-3.5' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <AlertDialog open={docToDelete !== null} onOpenChange={(o) => !o && setDocToDelete(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove <strong>{docToDelete !== null ? pendingDocs[docToDelete]?.name : ''}</strong> from this request?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => docToDelete !== null && removePendingDoc(docToDelete)}
                      className='bg-red-600 hover:bg-red-700 text-white'
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div>
              <Label className='mb-2 block text-xs font-bold text-slate-600 uppercase tracking-widest'>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder='Additional details or requirements...'
                className='resize-none'
              />
            </div>
          </div>
        </div>

        <DialogFooter className='p-6 pt-3 border-t bg-muted/30 flex justify-between items-center'>
          <div className='flex gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setDeleteConfirmOpen(true)} className='text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 font-bold'>
              <RotateCcw className='w-4 h-4' />
              Reset Form
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
              <AlertDialogTitle>Reset Form?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all fields and delete your saved draft. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearDraft} className='bg-red-600 hover:bg-red-700 text-white'>
                Reset Form
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
