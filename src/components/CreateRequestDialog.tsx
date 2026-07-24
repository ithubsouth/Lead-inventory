import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import {
  REQUEST_TYPE_LABELS,
  RequestType,
  getFlow,
} from '@/lib/requestFlows';
import {
  assetTypes, locations, agreementTypes, assetGroups,
  tabletModels, tvModels, coverModels, sdCardSizes, pendriveSizes,
  configurations, tvConfigurations,
} from './constants';
import ComboInput from './ComboInput';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
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
  const [quantity, setQuantity] = useState<string>('');
  const [assetGroup, setAssetGroup] = useState('');
  const [agreementType, setAgreementType] = useState('');
  const [serialsRaw, setSerialsRaw] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
      const serials = serialsRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

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
          quantity: quantity ? Number(quantity) : null,
          asset_group: assetGroup || null,
          agreement_type: agreementType || null,
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

      if (serials.length) {
        const existing = await supabase
          .from('devices')
          .select('serial_number')
          .in('serial_number', serials);
        const existingSet = new Set(
          (existing.data || []).map((d: any) => d.serial_number)
        );
        const seen = new Set<string>();
        const rows = serials.map((sn) => {
          const dup = seen.has(sn);
          seen.add(sn);
          return {
            request_id: requestId,
            serial_number: sn,
            asset_group: assetGroup || null,
            warehouse: warehouse || null,
            exists_in_devices: existingSet.has(sn),
            is_duplicate: dup,
          };
        });
        await supabase.from('request_serials').insert(rows);
      }

      await supabase.from('notifications').insert({
        target_dept: first.dept,
        request_id: requestId,
        kind: 'stage_assigned',
        title: `New ${REQUEST_TYPE_LABELS[type]} request`,
        body: `${title} · assigned to ${first.dept} (${first.label})`,
      });

      toast.success('Request created');
      onCreated?.(requestId);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Raise a New Request</DialogTitle>
        </DialogHeader>
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
          <div>
            <Label>Quantity (PO Qty)</Label>
            <Input type='number' min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Asset Group</Label>
            <Select value={assetGroup} onValueChange={setAssetGroup}>
              <SelectTrigger><SelectValue placeholder='Select' /></SelectTrigger>
              <SelectContent>
                {assetGroups.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agreement Type</Label>
            <Select value={agreementType} onValueChange={setAgreementType}>
              <SelectTrigger><SelectValue placeholder='Select' /></SelectTrigger>
              <SelectContent>
                {agreementTypes.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='col-span-2'>
            <Label>Serial Numbers (one per line or comma separated)</Label>
            <Textarea
              value={serialsRaw}
              onChange={(e) => setSerialsRaw(e.target.value)}
              rows={4}
              placeholder='SN001&#10;SN002&#10;...'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              Duplicates and serials already in devices will be flagged automatically.
            </p>
          </div>
          <div className='col-span-2'>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
