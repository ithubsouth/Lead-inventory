import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import MentionTextarea, { extractMentions } from './MentionTextarea';
import { isLocationScopedDept } from '@/lib/appTabs';
import { toast } from 'sonner';
import {
  REQUEST_TYPE_LABELS,
  RequestType,
  RequestStatus,
  StageAction,
  canActOnStage,
  getFlow,
  nextStage,
  isTerminalStage,
} from '@/lib/requestFlows';
import { format } from 'date-fns';
import { fmtDateTime } from '@/lib/dateFormat';
import {
  Check,
  CheckCircle2,
  X,
  RotateCcw,
  Upload,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  FileDown,
  Eye,
  Loader2,
  History,
  Search,
  Pencil,
  ScanLine,
} from 'lucide-react';

interface Props {
  requestId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}


interface RequestFull {
  id: string;
  type: RequestType;
  status: RequestStatus;
  title: string | null;
  current_stage: string;
  current_stage_dept: string;
  po_number: string | null;
  grn_number: string | null;
  received_from: string | null;


  warehouse: string | null;
  asset_type: string | null;
  model: string | null;
  configuration: string | null;
  quantity: number | null;
  asset_status: string | null;
  asset_group: string | null;
  agreement_type: string | null;
  notes: string | null;
  raised_by: string;
  raised_by_email: string | null;
  raised_dept: string;
  created_at: string;
}

interface StageRow {
  id: string;
  stage_key: string;
  stage_label: string;
  assigned_dept: string;
  action: StageAction;
  actor_email: string | null;
  actor_dept: string | null;
  comment: string | null;
  acted_at: string;
}

interface SerialRow {
  id: string;
  serial_number: string;
  is_duplicate: boolean;
  exists_in_devices: boolean;
  warehouse: string | null;
  asset_group: string | null;
  asset_status: string | null;
  asset_code: string | null;
  verified: boolean | null;
  verify_result: string | null;
  verified_by: string | null;
  verified_at: string | null;
}


interface DocRow {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
  stage_key: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by_email: string | null;
}

export default function RequestDetailDialog({ requestId, open, onOpenChange, onChanged }: Props) {
  const { profile } = useUserProfile();
  const [req, setReq] = useState<RequestFull | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [grnInput, setGrnInput] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);


  const load = async () => {
    const [{ data: r }, { data: s }, { data: sn }, { data: d }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', requestId).single(),
      supabase
        .from('request_stages')
        .select('*')
        .eq('request_id', requestId)
        .order('acted_at', { ascending: false }),
      supabase.from('request_serials').select('*').eq('request_id', requestId),
      supabase
        .from('request_documents')
        .select('*')
        .eq('request_id', requestId)
        .order('uploaded_at', { ascending: false }),
    ]);
    setReq(r as any);
    setGrnInput(((r as any)?.grn_number as string) || '');
    setSubjectDraft(((r as any)?.title as string) || '');
    setStages((s as StageRow[]) || []);
    setSerials((sn as SerialRow[]) || []);
    setDocs((d as DocRow[]) || []);

  };

  useEffect(() => {
    if (open) {
      load();

      // Set up real-time subscription for this specific request
      const channel = supabase
        .channel(`request-detail-${requestId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` },
          () => load()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_stages', filter: `request_id=eq.${requestId}` },
          () => load()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_serials', filter: `request_id=eq.${requestId}` },
          () => load()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_documents', filter: `request_id=eq.${requestId}` },
          () => load()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, requestId]);

  const flow = useMemo(() => (req ? getFlow(req.type) : []), [req]);
  const currentIdx = req ? flow.findIndex((s) => s.key === req.current_stage) : -1;

  // Technology Team / Supply Chain Management only handle their own location's stock.
  const locationBlocked =
    !!req &&
    profile?.role !== 'Super Admin' &&
    profile?.department !== 'Administrators' &&
    isLocationScopedDept(profile?.department) &&
    !!profile?.location &&
    profile.location !== 'General' &&
    !!req.warehouse &&
    req.warehouse !== profile.location;

  const canAct = !!req &&
    req.status === 'open' &&
    !locationBlocked &&
    canActOnStage({
      role: profile?.role || null,
      department: profile?.department || null,
      assignedDept: req.current_stage_dept,
    });

  const canEditSubject =
    !!req &&
    (profile?.role === 'Super Admin' ||
      profile?.department === 'Administrators' ||
      req.raised_by === profile?.id ||
      req.current_stage_dept === profile?.department);

  const isVerifyStage = !!req && req.current_stage === 'tech_verify_serials';
  const isGrnStage = !!req && req.current_stage === 'scm_take_grn';
  const isAssetCodeStage = !!req && req.current_stage === 'finance_approve';
  const verifiedCount = serials.filter((s) => s.verified).length;


  const notifyMentions = async (text: string) => {
    if (!req) return;
    const emails = extractMentions(text);
    if (!emails.length) return;
    const { data: tagged } = await supabase
      .from('users')
      .select('id, email')
      .in('email', emails);
    if (!tagged?.length) return;
    await supabase.from('notifications').insert(
      tagged.map((u: any) => ({
        user_id: u.id,
        request_id: req.id,
        kind: 'mention',
        title: `${profile?.full_name || profile?.email || 'Someone'} tagged you on: ${req.title || REQUEST_TYPE_LABELS[req.type]}`,
        body: text,
      }))
    );
  };

  const setSerialVerification = async (ids: string[], verified: boolean, result: string) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from('request_serials')
      .update({
        verified,
        verify_result: verified ? result : null,
        verified_by: verified ? profile?.email || null : null,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .in('id', ids);
    if (error) throw error;
  };

  const toggleSerialVerified = async (s: SerialRow) => {
    if (!canAct || !isVerifyStage) return;
    setBusy(true);
    try {
      await setSerialVerification([s.id], !s.verified, 'Matched');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Could not update verification');
    } finally {
      setBusy(false);
    }
  };

  const verifyAllSerials = async () => {
    if (!canAct || !isVerifyStage) return;
    setBusy(true);
    try {
      await setSerialVerification(serials.map((s) => s.id), true, 'Matched');
      await load();
      toast.success('All serials marked verified');
    } catch (e: any) {
      toast.error(e.message || 'Could not update verification');
    } finally {
      setBusy(false);
    }
  };


  const record = async (action: StageAction, opts: { closeAfter?: boolean; reject?: boolean; revoke?: boolean } = {}) => {
    if (!req || !profile?.id) return;
    if (action === 'approved' && isVerifyStage && serials.length && verifiedCount < serials.length) {
      toast.error(`Verify all serials first (${verifiedCount}/${serials.length} verified).`);
      return;
    }
    if (action === 'approved' && isGrnStage && !opts.reject && !opts.revoke && !req.grn_number) {
      toast.error('Enter and save the GRN number before approving.');
      return;
    }
    if (action === 'approved' && isAssetCodeStage && !opts.reject && !opts.revoke && serials.length && serials.some((s) => !s.asset_code)) {
      toast.error('Every serial needs a unique Asset Code before final approval.');
      return;
    }

    setBusy(true);
    try {

      await supabase.from('request_stages').insert({
        request_id: req.id,
        stage_key: req.current_stage,
        stage_label: flow[currentIdx]?.label || req.current_stage,
        order_index: currentIdx,
        assigned_dept: req.current_stage_dept,
        action,
        actor_id: profile.id,
        actor_email: profile.email,
        actor_dept: profile.department,
        comment: comment || null,
      });

      let nextStatus: RequestStatus = req.status;
      let nextStageKey = req.current_stage;
      let nextDept = req.current_stage_dept;
      let notifTitle = '';
      let notifBody = comment || '';
      let notifTarget: { user_id?: string; target_dept?: string } = { user_id: req.raised_by };

      if (opts.reject) {
        nextStatus = 'rejected';
        notifTitle = `Request rejected: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
      } else if (opts.revoke) {
        nextStatus = 'revoked';
        notifTitle = `Request revoked: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
      } else if (action === 'approved') {
        const nxt = nextStage(req.type, req.current_stage);
        if (!nxt) {
          nextStatus = 'closed';
          notifTitle = `Request approved & closed: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
          if (req.type === 'new_hardware') {
            await materializeAssets();
          } else if (req.type === 'asset_movement') {
            await applyMovement();
          }
        } else {
          nextStageKey = nxt.key;
          nextDept = nxt.dept;
          notifTitle = `Stage advanced: ${nxt.label}`;
          notifTarget = { target_dept: nxt.dept };
        }
      } else if (action === 'commented') {
        notifTitle = `Comment added on: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
      }

      if (opts.reject || opts.revoke || action === 'approved') {
        await supabase
          .from('requests')
          .update({
            status: nextStatus,
            current_stage: nextStageKey,
            current_stage_dept: nextDept,
          })
          .eq('id', req.id);
      }

      if (notifTitle) {
        await supabase.from('notifications').insert({
          ...notifTarget,
          request_id: req.id,
          kind: action,
          title: notifTitle,
          body: notifBody || null,
        });
      }

      await notifyMentions(comment);



      setComment('');
      await load();
      onChanged?.();
      toast.success('Recorded');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!req || !profile?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB');
      return;
    }
    setBusy(true);
    try {
      const path = `${req.id}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('request-documents')
        .upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('request_documents').insert({
        request_id: req.id,
        stage_key: req.current_stage,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: profile.id,
        uploaded_by_email: profile.email,
      });
      if (dbErr) throw dbErr;
      toast.success('Uploaded');
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sign = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('request-documents')
      .createSignedUrl(path, 300);
    if (error) {
      toast.error('Could not fetch file');
      return null;
    }
    return data.signedUrl;
  };

  const viewDoc = async (d: DocRow) => {
    const url = await sign(d.file_path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const downloadDoc = async (d: DocRow) => {
    const url = await sign(d.file_path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = d.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const deleteDoc = async (d: DocRow) => {
    if (!confirm(`Move ${d.file_name} to history?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('request_documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: profile?.id,
          deleted_by_email: profile?.email,
        })
        .eq('id', d.id);
      if (error) throw error;
      toast.success('Moved to history');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const restoreDoc = async (d: DocRow) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('request_documents')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deleted_by_email: null,
        })
        .eq('id', d.id);
      if (error) throw error;
      toast.success('Restored');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  const materializeAssets = async () => {
    if (!req) return;
    const { data: existingMax } = await supabase
      .from('devices')
      .select('far_code')
      .not('far_code', 'is', null)
      .order('far_code', { ascending: false })
      .limit(1);
    let nextCode = ((existingMax?.[0]?.far_code as number) || 100000) + 1;

    const sourceName = (req as any).received_from || 'Stock';

    const orderRow: any = {
      order_type: 'Hardware',
      material_type: 'Inward',
      asset_type: req.asset_type || 'Tablet',
      model: req.model || '-',
      quantity: serials.length || req.quantity || 0,
      warehouse: req.warehouse || '-',
      sales_order: req.po_number || null,
      configuration: req.configuration || null,
      agreement_type: req.agreement_type || null,
      school_name: sourceName,
      order_date: new Date().toISOString().split('T')[0],
      created_by: profile?.email,
      updated_by: profile?.email,
    };
    const { data: orderIns, error: oErr } = await supabase
      .from('orders').insert(orderRow).select('id').single();
    if (oErr) { toast.error(`Order create failed: ${oErr.message}`); return; }
    const orderId = orderIns!.id;

    if (serials.length) {
      const deviceRows = serials.map((s) => {
        const parsed = Number(s.asset_code);
        return {
          order_id: orderId,
          order_type: 'Hardware',
          warehouse: req.warehouse || '-',
          sales_order: req.po_number || null,
          school_name: sourceName,
          asset_type: req.asset_type || 'Tablet',
          model: req.model || '-',
          configuration: req.configuration || null,
          serial_number: s.serial_number,
          asset_group: s.asset_group || req.asset_group || null,
          asset_status: s.asset_status || req.asset_status || 'Fresh',
          // devices.status only allows Available / Assigned / Maintenance
          status: 'Available',
          far_code: s.asset_code && !isNaN(parsed) ? parsed : nextCode++,
          ref_po: req.po_number || null,
          ref_grn: req.grn_number || null,
          material_type: 'Inward',
          created_by: profile?.email,
          updated_by: profile?.email,
        };
      });
      const { error: dErr } = await supabase.from('devices').insert(deviceRows as any);
      if (dErr) toast.error(`Devices create failed: ${dErr.message}`);
      else toast.success('Order and devices created');
    }
  };

  /**
   * Asset Movement (EH to FA): the assets already exist — no new order is created.
   * We only update asset group + asset code on the existing device rows and
   * stamp the request reference (PO / GRN).
   */
  const applyMovement = async () => {
    if (!req || !serials.length) return;
    let failed = 0;
    for (const s of serials) {
      const parsed = Number(s.asset_code);
      const patch: any = {
        asset_group: s.asset_group || req.asset_group || undefined,
        ref_po: req.po_number || null,
        ref_grn: req.grn_number || null,
        updated_by: profile?.email,
      };
      if (s.asset_code && !isNaN(parsed)) patch.far_code = parsed;
      const { error } = await supabase
        .from('devices')
        .update(patch)
        .eq('serial_number', s.serial_number);
      if (error) failed++;
    }
    if (failed) toast.error(`${failed} serial(s) could not be updated`);
    else toast.success('Existing assets updated (asset group + asset code)');
  };


  const deleteRequest = async () => {
    if (!req) return;
    if (!confirm(`Delete this request permanently? This removes serials, stages, documents and notifications.`)) return;
    setBusy(true);
    try {
      await supabase.storage.from('request-documents').remove(docs.map((d) => d.file_path));
      await supabase.from('request_documents').delete().eq('request_id', req.id);
      await supabase.from('request_serials').delete().eq('request_id', req.id);
      await supabase.from('request_stages').delete().eq('request_id', req.id);
      await supabase.from('notifications').delete().eq('request_id', req.id);
      const { error } = await supabase.from('requests').delete().eq('id', req.id);
      if (error) throw error;
      toast.success('Request deleted');
      onChanged?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadSerialsCsv = async () => {
    if (!req) return;
    const sns = serials.map((s) => s.serial_number);
    let devs: any[] = [];
    if (sns.length) {
      const { data } = await supabase
        .from('devices')
        .select('serial_number,far_code,asset_group,warehouse,asset_status,status,model,configuration,sales_order,asset_condition')
        .in('serial_number', sns);
      devs = data || [];
    }
    const byS = new Map(devs.map((d) => [d.serial_number, d]));
    const rows = [
      [
        'Subject', 'Request Type', 'PO Number', 'GRN Number', 'Warehouse', 'Asset Type', 'Model', 'Configuration',
        'Quantity', 'Serial Number', 'Asset Status', 'Asset Group', 'Asset Code', 'Asset Condition',
        'Verified', 'Verification Result', 'Verified By', 'Verified At',
        'Duplicate', 'Existed Before', 'Current Stage', 'Pending At', 'Request Status',
        'Requested By', 'Requested At',
      ],
      ...serials.map((s) => {
        const d: any = byS.get(s.serial_number) || {};
        return [
          req.title ?? '',
          REQUEST_TYPE_LABELS[req.type],
          req.po_number ?? '',
          req.grn_number ?? '',
          s.warehouse ?? req.warehouse ?? '',
          req.asset_type ?? '',
          d.model ?? req.model ?? '',
          d.configuration ?? req.configuration ?? '',
          req.quantity ?? serials.length,
          s.serial_number,
          s.asset_status || d.asset_status || req.asset_status || '',
          s.asset_group ?? req.asset_group ?? '',
          (s.asset_code || d.far_code) ?? '',
          d.asset_condition ?? '',
          s.verified ? 'Yes' : 'No',
          s.verify_result ?? '',
          s.verified_by ?? '',
          s.verified_at ? fmtDateTime(s.verified_at) : '',
          s.is_duplicate ? 'Yes' : 'No',
          s.exists_in_devices ? 'Yes' : 'No',
          flow.find((f) => f.key === req.current_stage)?.label ?? req.current_stage,
          req.status === 'open' ? req.current_stage_dept : '',
          req.status,
          req.raised_by_email ?? '',
          fmtDateTime(req.created_at),
        ];
      }),
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request_${req.po_number || req.id}_serials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verifyRef = useRef<HTMLInputElement>(null);
  const bulkVerifySerials = async (file: File) => {
    if (!req) return;
    setBusy(true);
    try {
      const text = await file.text();
      const uploaded = text
        .split(/\r?\n|,/)
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter((s) => s && s.toLowerCase() !== 'serial' && s.toLowerCase() !== 'serial_number' && s.toLowerCase() !== 'serial number');
      const expected = new Set(serials.map((s) => s.serial_number));
      const uploadedSet = new Set(uploaded);
      const matched = uploaded.filter((s) => expected.has(s));
      const missing = [...expected].filter((s) => !uploadedSet.has(s));
      const extra = uploaded.filter((s) => !expected.has(s));
      const poQty = req.quantity || 0;
      const qtyMismatch = poQty > 0 && uploaded.length !== poQty;
      const summary = [
        `Verified ${matched.length}/${expected.size} serials`,
        missing.length ? `Missing: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '...' : ''}` : null,
        extra.length ? `Extra: ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? '...' : ''}` : null,
        qtyMismatch ? `Qty mismatch: uploaded ${uploaded.length} vs PO qty ${poQty}` : null,
      ].filter(Boolean).join(' | ');

      // Persist per-serial verification so everyone can see who verified and when
      const matchedIds = serials.filter((s) => uploadedSet.has(s.serial_number)).map((s) => s.id);
      const missingIds = serials.filter((s) => !uploadedSet.has(s.serial_number)).map((s) => s.id);
      const stamp = new Date().toISOString();
      if (matchedIds.length) {
        await supabase
          .from('request_serials')
          .update({ verified: true, verify_result: 'Matched', verified_by: profile?.email || null, verified_at: stamp })
          .in('id', matchedIds);
      }
      if (missingIds.length) {
        await supabase
          .from('request_serials')
          .update({ verified: false, verify_result: 'Not found in upload', verified_by: profile?.email || null, verified_at: stamp })
          .in('id', missingIds);
      }
      await load();
      setComment(summary);
      toast.success(summary || 'Verification complete');

    } catch (e: any) {
      toast.error(e.message || 'Verification failed');
    } finally {
      setBusy(false);
      if (verifyRef.current) verifyRef.current.value = '';
    }
  };

  /** ---- Stage helpers: GRN + Asset Code ---- */
  const codeRef = useRef<HTMLInputElement>(null);

  const saveGrn = async () => {
    if (!req) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({ grn_number: grnInput.trim() })
        .eq('id', req.id);
      if (error) throw error;
      await supabase.from('request_stages').insert({
        request_id: req.id,
        stage_key: req.current_stage,
        stage_label: `GRN Number saved: ${grnInput.trim()}`,
        order_index: currentIdx,
        assigned_dept: req.current_stage_dept,
        action: 'submitted',
        actor_id: profile?.id,
        actor_email: profile?.email,
        actor_dept: profile?.department,
        comment: null,
      });
      toast.success('GRN saved');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Could not save GRN');
    } finally {
      setBusy(false);
    }
  };

  const nextFreeAssetCode = async (): Promise<number> => {
    const { data } = await supabase
      .from('devices')
      .select('far_code')
      .not('far_code', 'is', null)
      .order('far_code', { ascending: false })
      .limit(1);
    const { data: used } = await supabase
      .from('request_serials')
      .select('asset_code')
      .not('asset_code', 'is', null);
    const maxUsed = (used || []).reduce((m: number, r: any) => {
      const n = Number(r.asset_code);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return Math.max(Number(data?.[0]?.far_code || 100000), maxUsed, 100000) + 1;
  };

  const autoGenerateAssetCodes = async () => {
    if (!req) return;
    setBusy(true);
    try {
      let code = await nextFreeAssetCode();
      const targets = serials.filter((s) => !s.asset_code);
      if (!targets.length) {
        toast.info('All serials already have an asset code');
        return;
      }
      for (const s of targets) {
        const { error } = await supabase
          .from('request_serials')
          .update({ asset_code: String(code++) })
          .eq('id', s.id);
        if (error) throw error;
      }
      toast.success(`Generated ${targets.length} asset codes`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Could not generate asset codes');
    } finally {
      setBusy(false);
    }
  };

  const setAssetCode = async (id: string, value: string) => {
    const v = value.trim();
    if (v && serials.some((s) => s.id !== id && s.asset_code === v)) {
      toast.error(`Asset code ${v} is already used in this request`);
      return;
    }
    const { error } = await supabase
      .from('request_serials')
      .update({ asset_code: v || null })
      .eq('id', id);
    if (error) toast.error(error.message);
    else await load();
  };

  const bulkAssetCodes = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const map = new Map<string, string>();
      text.split(/\r?\n/).forEach((line) => {
        const [a, b] = line.split(',').map((c) => (c || '').trim().replace(/^"|"$/g, ''));
        if (!a || !b) return;
        if (/serial/i.test(a)) return;
        map.set(a, b);
      });
      let n = 0;
      for (const s of serials) {
        const code = map.get(s.serial_number);
        if (code && code !== s.asset_code) {
          const { error } = await supabase
            .from('request_serials')
            .update({ asset_code: code })
            .eq('id', s.id);
          if (error) throw error;
          n++;
        }
      }
      toast.success(`Updated ${n} asset codes`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Bulk asset code upload failed');
    } finally {
      setBusy(false);
      if (codeRef.current) codeRef.current.value = '';
    }
  };

  /** ---- Manual serial verification entry (audit-table style) ---- */
  const checkSerialEntry = async (raw?: string) => {
    const value = (raw ?? scanInput).trim();
    if (!value) return;
    const match = serials.find((s) => s.serial_number.toLowerCase() === value.toLowerCase());
    if (!match) {
      toast.error(`${value} is not part of this request`);
      setScanInput('');
      return;
    }
    setBusy(true);
    try {
      await setSerialVerification([match.id], true, 'Matched');
      await load();
      toast.success(`${value} verified`);
      setScanInput('');
    } catch (e: any) {
      toast.error(e.message || 'Could not verify');
    } finally {
      setBusy(false);
    }
  };

  const clearAllVerification = async () => {
    if (!serials.length) return;
    setBusy(true);
    try {
      await supabase
        .from('request_serials')
        .update({ verified: false, verify_result: null, verified_by: null, verified_at: null })
        .in('id', serials.map((s) => s.id));
      await load();
      toast.success('Verification cleared');
    } catch (e: any) {
      toast.error(e.message || 'Could not clear');
    } finally {
      setBusy(false);
    }
  };

  const saveSubject = async () => {
    if (!req) return;
    const v = subjectDraft.trim();
    if (!v || v === req.title) {
      setEditingSubject(false);
      return;
    }
    const { error } = await supabase.from('requests').update({ title: v }).eq('id', req.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Subject updated');
      await load();
    }
    setEditingSubject(false);
  };


  if (!req) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-md'>
          <DialogHeader><DialogTitle>Loading...</DialogTitle></DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const dupCount = serials.filter((s) => s.is_duplicate || s.exists_in_devices).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[98vw] w-full max-h-[95vh] overflow-hidden flex flex-col p-0'>
        <DialogHeader className='px-6 pt-6 pb-4 border-b'>
          <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0 flex-1'>
              {editingSubject ? (
                <div className='flex items-center gap-2'>
                  <Input
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    className='h-9 text-base font-semibold'
                    autoFocus
                  />
                  <Button size='sm' onClick={saveSubject} disabled={busy}>Save</Button>
                  <Button size='sm' variant='ghost' onClick={() => { setEditingSubject(false); setSubjectDraft(req.title || ''); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <DialogTitle className='text-xl flex items-center gap-2 min-w-0'>
                  <span className='truncate'>{req.title || REQUEST_TYPE_LABELS[req.type]}</span>
                  {req.status !== 'closed' && canEditSubject && (
                    <button
                      type='button'
                      onClick={() => setEditingSubject(true)}
                      className='text-muted-foreground hover:text-primary shrink-0'
                      title='Edit subject'
                    >
                      <Pencil className='w-4 h-4' />
                    </button>
                  )}
                </DialogTitle>
              )}
              <div className='text-xs text-muted-foreground mt-1 break-words'>
                {REQUEST_TYPE_LABELS[req.type]}
                {req.po_number ? ` · PO ${req.po_number}` : ''} · Raised by {req.raised_by_email} ({req.raised_dept}) · {fmtDateTime(req.created_at)}
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0 pr-8'>
              {req.status === 'open' && (
                <Badge variant='outline' className='font-bold text-[10px] h-8 px-3 rounded-full flex items-center bg-muted/20'>
                  Pending at: {req.current_stage_dept}
                </Badge>
              )}
              <Badge className='capitalize h-8 px-3 rounded-full flex items-center'>{req.status}</Badge>
              <Button size='sm' variant='outline' onClick={downloadSerialsCsv} disabled={busy} className='h-8 w-8 rounded-xl p-0' title="Download CSV">
                <FileDown className='w-4 h-4' />
              </Button>
              {profile?.role === 'Super Admin' && (
                <Button size='sm' variant='destructive' onClick={deleteRequest} disabled={busy} className='h-8 w-8 rounded-xl p-0' title="Delete Request">
                  <Trash2 className='w-4 h-4' />
                </Button>
              )}
            </div>
          </div>

        </DialogHeader>

        <div className='grid grid-cols-12 gap-6 px-6 py-4 overflow-y-auto flex-1'>
          {/* Left: timeline */}
          <div className='col-span-4 space-y-3'>
            <div className='text-sm font-semibold'>Workflow</div>
            <ol className='space-y-2'>
              {flow.map((s, i) => {
                const done = i < currentIdx || req.status !== 'open';
                const active = i === currentIdx && req.status === 'open';
                return (
                  <li
                    key={s.key}
                    className={`flex gap-3 p-2 rounded border ${
                      active ? 'border-primary bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div className='min-w-0'>
                      <div className='text-sm font-medium'>{s.label}</div>
                      <div className='text-xs text-muted-foreground'>{s.dept}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className='text-sm font-semibold pt-4 border-t'>History <span className='text-[10px] font-normal text-muted-foreground'>(latest first)</span></div>
            <div className='space-y-2 max-h-80 overflow-y-auto pr-1'>
              {stages.length === 0 && (
                <div className='text-xs text-muted-foreground italic'>No activity recorded yet.</div>
              )}
              {stages.map((s) => (
                <div key={s.id} className='text-xs p-2 rounded border bg-muted/30 break-words'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='font-medium capitalize'>{s.action}</span>
                    <span className='text-muted-foreground shrink-0'>{fmtDateTime(s.acted_at)}</span>
                  </div>
                  <div className='text-muted-foreground mt-0.5 break-words'>{s.stage_label}</div>
                  <div className='text-muted-foreground break-all'>
                    {s.actor_email} · {s.actor_dept}
                  </div>
                  {s.comment && <div className='mt-1 italic break-words'>"{s.comment}"</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: details */}
          <div className='col-span-8 space-y-4 min-w-0'>
            <div className='grid grid-cols-3 gap-3 text-sm'>
              {[
                ['PO Number (Sales Order)', req.po_number],
                ['Received From', req.received_from],
                ['Warehouse', req.warehouse],
                ['Asset Type', req.asset_type],
                ['Model', req.model],
                ['Configuration', req.configuration],
                ['Quantity', req.quantity ?? serials.length],
                ['Asset Status', req.asset_status || serials.find((s) => s.asset_status)?.asset_status],
                ['Asset Group', req.asset_group || serials.find((s) => s.asset_group)?.asset_group],
                ['GRN Number', req.grn_number],
                ['Pending At', req.status === 'open' ? req.current_stage_dept : '—'],
                ['Requested By', req.raised_by_email],
                ['Requested At', fmtDateTime(req.created_at)],
              ].map(([k, v]) => (
                <div key={k as string} className='p-2 rounded border bg-muted/30 min-w-0'>
                  <div className='text-[10px] uppercase text-muted-foreground'>{k}</div>
                  <div className='truncate' title={v ? String(v) : '-'}>{v || '-'}</div>
                </div>
              ))}
            </div>

            {req.notes && (
              <div className='p-3 rounded border bg-muted/30 text-sm'>
                <div className='text-[10px] uppercase text-muted-foreground mb-1'>Notes</div>
                {req.notes}
              </div>
            )}

            {/* Serials */}
            {serials.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <div className='text-sm font-semibold'>
                    Serial Numbers ({serials.length}
                    {req.quantity ? ` / ${req.quantity} PO qty` : ''})
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-bold',
                        verifiedCount === serials.length
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {verifiedCount}/{serials.length} verified
                    </Badge>
                    {dupCount > 0 && (
                      <span className='text-xs text-amber-700 flex items-center gap-1'>
                        <AlertTriangle className='w-3 h-3' /> {dupCount} flagged
                      </span>
                    )}
                    <Button size='sm' variant='outline' onClick={downloadSerialsCsv} title="Download CSV">
                      <FileDown className='w-3.5 h-3.5' />
                    </Button>
                    {isVerifyStage && canAct && (
                      <>
                        <input
                          ref={verifyRef}
                          type='file'
                          accept='.csv,.txt'
                          className='hidden'
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) bulkVerifySerials(f);
                          }}
                        />
                        <Button size='sm' variant='outline' onClick={() => verifyRef.current?.click()} disabled={busy}>
                          <Upload className='w-3.5 h-3.5 mr-1' /> Bulk Verify
                        </Button>
                        <Button size='sm' variant='outline' onClick={verifyAllSerials} disabled={busy}>
                          <CheckCircle2 className='w-3.5 h-3.5 mr-1' /> Verify All
                        </Button>
                        <Button size='sm' variant='ghost' onClick={clearAllVerification} disabled={busy}>
                          <X className='w-3.5 h-3.5 mr-1' /> Clear All
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isVerifyStage && canAct && (
                  <div className='p-3 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2'>
                    <div className='text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2'>
                      <ScanLine className='w-4 h-4' /> Verify received serial numbers physically
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Input
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            checkSerialEntry();
                          }
                        }}
                        placeholder='Scan or type a serial number, then press Enter'
                        className='h-9 text-sm flex-1 min-w-[240px] font-mono'
                        autoComplete='off'
                      />
                      <Button size='sm' onClick={() => checkSerialEntry()} disabled={busy || !scanInput.trim()}>
                        <Check className='w-3.5 h-3.5 mr-1' /> Check
                      </Button>
                    </div>
                    <p className='text-[10px] text-muted-foreground'>
                      Scanner-friendly: each scan verifies the serial instantly. Use Bulk Verify to upload a CSV of physically received serials.
                    </p>
                  </div>
                )}


                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                  <Input
                    placeholder='Search serial numbers...'
                    value={serialSearchQuery}
                    onChange={(e) => setSerialSearchQuery(e.target.value)}
                    className='pl-9 h-9 text-xs bg-white'
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

                {req.quantity && serials.length !== req.quantity && (
                  <div className='p-2 rounded border border-amber-300 bg-amber-50 text-xs text-amber-800 flex items-center gap-1'>
                    <AlertTriangle className='w-3 h-3' />
                    Serial count ({serials.length}) does not match PO quantity ({req.quantity}).
                  </div>
                )}
                <div className='max-h-52 overflow-y-auto rounded border'>
                  <table className='w-full text-[11px]'>
                    <thead className='bg-muted/40 sticky top-0'>
                      <tr>
                        <th className='text-left px-2 py-1.5'>Serial</th>
                        <th className='text-left px-2 py-1.5'>Status</th>
                        <th className='text-left px-2 py-1.5'>Group</th>
                        <th className='text-left px-2 py-1.5'>Asset Code</th>
                        <th className='text-left px-2 py-1.5'>Verification</th>
                        <th className='text-left px-2 py-1.5'>Verified By</th>
                        <th className='text-left px-2 py-1.5'>Verified At</th>
                        <th className='text-left px-2 py-1.5'>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serials
                        .filter(s => !serialSearchQuery || s.serial_number?.toLowerCase().includes(serialSearchQuery.toLowerCase()))
                        .map((s) => (
                        <tr key={s.id} className='border-t hover:bg-muted/10'>
                          <td className='px-2 py-1.5 font-mono'>{s.serial_number}</td>
                          <td className='px-2 py-1.5'>{s.asset_status || req.asset_status || '-'}</td>
                          <td className='px-2 py-1.5'>{s.asset_group || '-'}</td>
                          <td className='px-2 py-1.5 font-mono'>
                            {isAssetCodeStage && canAct ? (
                              <Input
                                defaultValue={s.asset_code || ''}
                                onBlur={(e) => {
                                  if ((e.target.value || '') !== (s.asset_code || '')) {
                                    setAssetCode(s.id, e.target.value);
                                  }
                                }}
                                placeholder='—'
                                className='h-7 w-28 text-[11px] font-mono'
                              />
                            ) : (
                              s.asset_code || '-'
                            )}
                          </td>

                          <td className='px-2 py-1.5'>
                            <button
                              type='button'
                              onClick={() => toggleSerialVerified(s)}
                              disabled={!canAct || !isVerifyStage || busy}
                              title={isVerifyStage && canAct ? 'Toggle verification' : 'Verification status'}
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                                s.verified
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200',
                                isVerifyStage && canAct ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                              )}
                            >
                              {s.verified ? 'Verified' : s.verify_result || 'Pending'}
                            </button>
                          </td>
                          <td className='px-2 py-1.5 text-muted-foreground'>{s.verified_by || '-'}</td>
                          <td className='px-2 py-1.5 text-muted-foreground'>
                            {s.verified_at ? fmtDateTime(s.verified_at) : '-'}
                          </td>
                          <td className='px-2 py-1.5'>
                            {s.exists_in_devices && (
                              <Badge variant='destructive' className='mr-1 text-[9px] h-4'>Exists</Badge>
                            )}
                            {s.is_duplicate && <Badge variant='outline' className='text-[9px] h-4'>Duplicate</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* Documents */}
            <div className="space-y-3">
              <div className='flex items-center justify-between'>
                <div className="space-y-0.5">
                  <div className='flex items-center gap-2'>
                    <div className='text-sm font-bold text-slate-700'>Documents</div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => fileRef.current?.click()}
                      className='h-7 px-2 text-[10px] font-bold uppercase tracking-widest gap-1.5 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100'
                      disabled={busy}
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className='w-3 h-3' />}
                      Click to upload files
                    </Button>
                    {(profile?.role === 'Super Admin' || profile?.role === 'Admin' || profile?.department === 'Administrators') && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn("h-7 w-7 rounded-lg transition-colors", showHistory ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100")}
                        title="Document History"
                      >
                        <History className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">No limit on number of uploads.</p>
                </div>
              </div>

              <input
                ref={fileRef}
                type='file'
                multiple
                accept='.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv'
                className='hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                }}
                disabled={busy}
              />

              {showHistory ? (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Deleted History</div>
                  <div className='space-y-1.5'>
                    {docs.filter(d => d.is_deleted).length === 0 ? (
                      <div className='text-xs text-muted-foreground py-6 text-center bg-slate-50 rounded-xl border border-slate-100 italic'>No history found.</div>
                    ) : (
                      docs.filter(d => d.is_deleted).map((d) => (
                        <div
                          key={d.id}
                          className='flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs'
                        >
                          <div className='flex items-center gap-3 min-w-0 opacity-60'>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <FileText className='w-4 h-4 text-slate-400' />
                            </div>
                            <div className='truncate flex flex-col'>
                              <div className='font-bold text-slate-600 truncate line-through'>{d.file_name}</div>
                              <div className='text-[9px] text-slate-400 font-medium'>
                                Deleted by {d.deleted_by_email} · {d.deleted_at ? fmtDateTime(d.deleted_at) : ''}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button size='icon' variant='ghost' className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={() => viewDoc(d)} title="View Original">
                              <Eye className='w-4 h-4' />
                            </Button>
                            <Button size='icon' variant='ghost' className="h-8 w-8 rounded-lg hover:bg-green-50 hover:text-green-600" onClick={() => restoreDoc(d)} title="Restore File" disabled={busy}>
                              <RotateCcw className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="w-full text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600">
                    Back to Active Documents
                  </Button>
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {docs.filter(d => !d.is_deleted).length === 0 && !busy && (
                    <div className='text-xs text-muted-foreground py-6 text-center bg-slate-50 rounded-xl border border-slate-100'>No documents yet.</div>
                  )}
                  {docs.filter(d => !d.is_deleted).map((d) => (
                  <div
                    key={d.id}
                    className='flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 bg-white shadow-sm text-xs group hover:border-blue-200 transition-colors'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className='w-4 h-4 text-blue-600' />
                      </div>
                      <div className='truncate flex flex-col'>
                        <div className='font-bold text-slate-700 truncate'>{d.file_name}</div>
                        <div className='text-[10px] text-slate-400 font-medium'>
                          {d.uploaded_by_email} · {fmtDateTime(d.uploaded_at)}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button size='icon' variant='ghost' className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={() => viewDoc(d)} title="Preview">
                        <Eye className='w-4 h-4' />
                      </Button>
                      <Button size='icon' variant='ghost' className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={() => downloadDoc(d)} title="Download">
                        <Download className='w-4 h-4' />
                      </Button>
                      {(profile?.role === 'Super Admin' || profile?.role === 'Admin') && (
                        <Button size='icon' variant='ghost' className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => deleteDoc(d)} title="Delete">
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* Stage specific inputs */}
            {req.status === 'open' && isGrnStage && canAct && (
              <div className='p-3 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2'>
                <div className='text-xs font-black uppercase tracking-widest text-blue-700'>Take GRN</div>
                <div className='flex gap-2'>
                  <Input
                    value={grnInput}
                    onChange={(e) => setGrnInput(e.target.value)}
                    placeholder='Enter GRN number'
                    className='h-9 text-sm'
                  />
                  <Button size='sm' onClick={saveGrn} disabled={busy || !grnInput.trim()}>
                    Save GRN
                  </Button>
                </div>
                <p className='text-[10px] text-muted-foreground'>GRN number is required before approving this stage.</p>
              </div>
            )}

            {req.status === 'open' && isAssetCodeStage && canAct && (
              <div className='p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2'>
                <div className='text-xs font-black uppercase tracking-widest text-emerald-700'>Generate Asset Code</div>
                <div className='flex flex-wrap gap-2'>
                  <Button size='sm' variant='outline' onClick={autoGenerateAssetCodes} disabled={busy}>
                    Auto-generate for missing
                  </Button>
                  <input
                    ref={codeRef}
                    type='file'
                    accept='.csv,.txt'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) bulkAssetCodes(f);
                    }}
                  />
                  <Button size='sm' variant='outline' onClick={() => codeRef.current?.click()} disabled={busy}>
                    <Upload className='w-3.5 h-3.5 mr-1' /> Bulk upload asset codes
                  </Button>
                </div>
                <p className='text-[10px] text-muted-foreground'>
                  CSV format: <span className='font-mono'>serial_number,asset_code</span>. Asset codes must be unique; you can also edit them one by one in the table above.
                </p>
              </div>
            )}

            {/* Action */}
            {req.status === 'open' && (
              <div className='pt-4 border-t space-y-2'>

                <MentionTextarea
                  value={comment}
                  onChange={setComment}
                  placeholder={canAct ? 'Add a comment — type @ to tag a teammate (e.g. @test@gmail.com)' : 'Only assigned department Admins can act.'}
                  rows={2}
                  disabled={!canAct}
                />

                <div className='flex flex-wrap gap-2 justify-end'>
                  <Button
                    variant='outline'
                    disabled={!canAct || busy || !comment.trim()}
                    onClick={() => record('commented')}
                  >
                    Comment
                  </Button>
                  <Button
                    variant='outline'
                    disabled={!canAct || busy || !comment.trim()}
                    onClick={() => record('revoked', { revoke: true })}
                  >
                    <RotateCcw className='w-4 h-4 mr-1' /> Revoke
                  </Button>
                  <Button
                    variant='destructive'
                    disabled={!canAct || busy || !comment.trim()}
                    onClick={() => record('rejected', { reject: true })}
                  >
                    <X className='w-4 h-4 mr-1' /> Reject
                  </Button>
                  <Button
                    disabled={!canAct || busy}
                    onClick={() => record('approved')}
                  >
                    <Check className='w-4 h-4 mr-1' /> Approve
                  </Button>
                </div>
                {!canAct && (
                  <p className='text-xs text-muted-foreground text-right'>
                    {locationBlocked
                      ? `This request belongs to ${req.warehouse}. You can only act on ${profile?.location} requests.`
                      : `Action requires being Admin/Super Admin of ${req.current_stage_dept}.`}
                  </p>
                )}

              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
