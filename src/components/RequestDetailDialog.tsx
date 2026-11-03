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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  nextRequiredStage,
  skippedStages,
  isFaGroup,
  ASSET_CODE_STAGE,
  RELEASE_PO_STAGE,
  SERIAL_ENTRY_STAGE,
  sendBackStage,
} from '@/lib/requestFlows';
import { assetGroups, assetStatuses } from './constants';
import { format, formatDistanceToNow } from 'date-fns';
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
  Clock,
  Plus,
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
  raised_by_role: string | null;
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
  created_at: string;
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
  asset_condition: string | null;
  verified: boolean | null;
  verify_result: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
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
  const [poInput, setPoInput] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [receiptIssue, setReceiptIssue] = useState<'missing' | 'incorrect' | 'damaged' | null>(null);
  const [receivedSerial, setReceivedSerial] = useState('');
  const [replacementSerials, setReplacementSerials] = useState<Record<string, string>>({});
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
        .order('created_at', { ascending: false }),
      supabase.from('request_serials').select('*').eq('request_id', requestId),
      supabase
        .from('request_documents')
        .select('*')
        .eq('request_id', requestId)
        .order('uploaded_at', { ascending: false }),
    ]);
    setReq(r as any);
    setGrnInput(((r as any)?.grn_number as string) || '');
    setPoInput(((r as any)?.po_number as string) || '');
    setSubjectDraft(((r as any)?.title as string) || '');
    setStages((s as StageRow[]) || []);
    setSerials((sn as SerialRow[]) || []);
    setDocs((d as DocRow[]) || []);

  };

  useEffect(() => {
    if (open) {
      load();

      // Set up real-time subscription for this specific request. Bulk actions (e.g. giving
      // 500 serials an asset code) fire one event per row, so reload once they settle.
      let reloadTimer: ReturnType<typeof setTimeout> | undefined;
      const scheduleLoad = () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => load(), 500);
      };
      const channel = supabase
        .channel(`request-detail-${requestId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` },
          scheduleLoad
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_stages', filter: `request_id=eq.${requestId}` },
          scheduleLoad
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_serials', filter: `request_id=eq.${requestId}` },
          scheduleLoad
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'request_documents', filter: `request_id=eq.${requestId}` },
          scheduleLoad
        )
        .subscribe();

      return () => {
        clearTimeout(reloadTimer);
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

  // A revoked request is sent back to the first stage so the person who raised it
  // can correct it and resubmit. We only treat it as "sent back" when the latest
  // workflow action (ignoring comments) was a revoke — an Operator's fresh request
  // also sits at the first stage while it waits for their department Admin.
  // New hardware requests sent back after Procurement land on Procurement's step instead.
  const lastWorkflowAction = stages.find((st) => st.action !== 'commented')?.action;
  const isSentBack =
    !!req && req.status === 'open' && lastWorkflowAction === 'revoked' &&
    (currentIdx === 0 || req.current_stage === SERIAL_ENTRY_STAGE);
  const isRaiser = !!req && !!profile?.id && req.raised_by === profile.id;
  // Sent back to the first step: only the person who raised it acts. Requests raised by
  // Procurement under the old flow can still be resubmitted by their raiser.
  const isBackWithRaiser =
    isSentBack && (currentIdx === 0 || (isRaiser && req?.raised_dept === 'Procurement Team'));

  // History since the last send-back (stages are newest first). Approvals made before a
  // request was sent back no longer count for the workflow ticks.
  const lastRevokeIdx = stages.findIndex((st) => st.action === 'revoked');
  const activeHistory = lastRevokeIdx >= 0 ? stages.slice(0, lastRevokeIdx) : stages;
  const stageSignOff = (key: string) =>
    activeHistory.find((st) => st.stage_key === key && (st.action === 'approved' || st.action === 'submitted'));
  const signedOff = new Set(
    activeHistory
      .filter((st) => st.action === 'approved' || st.action === 'submitted')
      .map((st) => st.stage_key)
  );

  // FA serials need an asset code before Procurement can release the PO. Serials that
  // were not received don't count. A request with only NFA serials skips the asset code step.
  const serialGroup = (s: SerialRow) => s.asset_group || req?.asset_group || null;
  const countedSerials = serials.filter((s) => s.verify_result !== 'Not received');
  const hasFA = countedSerials.length
    ? countedSerials.some((s) => isFaGroup(serialGroup(s)))
    : isFaGroup(req?.asset_group);
  const skipped = req ? skippedStages(req.type, { hasFA }) : [];
  const everSignedOff = new Set(
    stages.filter((st) => st.action === 'approved' || st.action === 'submitted').map((st) => st.stage_key)
  );
  const stageAfterCurrent = () =>
    req ? nextRequiredStage(req.type, req.current_stage, { hasFA, signedOff, everSignedOff }) : null;

  // Finance creates the asset codes before any serial exists: one row per unit requested,
  // with the code filled in and the serial left blank. Procurement fills the serials in later.
  const codeRows = countedSerials.filter((s) => isFaGroup(serialGroup(s)));
  const codeRowsMissing = codeRows.filter((s) => !s.asset_code);
  const hasRealSerials = serials.some((s) => s.serial_number.trim());
  const blankSerialRows = serials.filter((s) => !s.serial_number.trim());
  const codesShort = hasFA && !hasRealSerials
    ? Math.max(0, (req?.quantity || 1) - codeRows.filter((s) => s.asset_code).length)
    : 0;
  const faCodesReady = !hasFA || (codeRowsMissing.length === 0 && codesShort === 0);

  // An approval was recorded for the current stage but the request never moved on
  // (happened while the database hand-off rule was broken). Offer a one-click repair.
  const latestWorkflow = stages.find((st) => st.action !== 'commented');
  const stuckNext =
    !!req && req.status === 'open' && latestWorkflow?.action === 'approved' &&
    latestWorkflow.stage_key === req.current_stage
      ? stageAfterCurrent()
      : null;

  const canAct = !!req &&
    req.status === 'open' &&
    ((isBackWithRaiser && isRaiser) ||
      (!locationBlocked &&
        canActOnStage({
          role: profile?.role || null,
          department: profile?.department || null,
          assignedDept: req.current_stage_dept,
          raisedByRole: req.raised_by_role,
          stageKey: req.current_stage,
        })));

  const canEditSubject =
    !!req &&
    (profile?.role === 'Super Admin' ||
      profile?.department === 'Administrators' ||
      req.raised_by === profile?.id ||
      req.current_stage_dept === profile?.department);

  const isSerialEntryStage = !!req && req.type === 'new_hardware' && req.current_stage === SERIAL_ENTRY_STAGE;
  const isVerifyStage = !!req && req.current_stage === 'tech_verify_serials';
  const isGrnStage = !!req && req.current_stage === 'scm_take_grn';
  const isAssetCodeStage = !!req && req.current_stage === ASSET_CODE_STAGE;
  const isReleasePoStage = !!req && req.current_stage === RELEASE_PO_STAGE;
  const verifiedCount = serials.filter((s) => s.verified).length;
  const damagedCount = serials.filter((s) => s.verify_result === 'Damaged').length;
  const missingCount = serials.filter((s) => s.verify_result === 'Not received').length;
  const receivedCount = verifiedCount + damagedCount;
  const pendingReceiptCount = Math.max(0, serials.length - receivedCount - missingCount);
  const physicalSerials = serials.filter((s) => s.verified || s.verify_result === 'Damaged');
  const faSerialsMissingCode = physicalSerials.filter((s) => isFaGroup(serialGroup(s)) && !s.asset_code);
  const backTarget = req ? sendBackStage(req.type, req.current_stage) : null;
  const backToRaiser = !!backTarget && backTarget.key === flow[0]?.key;
  const returnDepartment = backToRaiser
    ? req?.raised_dept || flow[0]?.dept || 'requester'
    : backTarget?.dept || 'requester';


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

  const markSerialDamaged = async (serial: SerialRow) => {
    if (!canAct || !isVerifyStage) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('request_serials')
        .update({
          verified: false,
          verify_result: 'Damaged',
          asset_condition: 'Damaged',
          verified_by: profile?.email || null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', serial.id);
      if (error) throw error;
      await load();
      toast.success(`${serial.serial_number} marked as damaged`);
    } catch (e: any) {
      toast.error(e.message || 'Could not mark serial as damaged');
    } finally {
      setBusy(false);
    }
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

  const addReceivedSerial = async () => {
    if (!req || !canAct || !isVerifyStage) return false;
    const replacement = receivedSerial.trim();
    if (!replacement) {
      toast.error('Enter the serial number physically received.');
      return false;
    }
    if (serials.some((s) => s.serial_number.toLowerCase() === replacement.toLowerCase())) {
      toast.error('This serial number is already listed in the request.');
      return false;
    }
    const unmatched = serials.filter((s) => !s.verified && s.verify_result !== 'Damaged' && s.verify_result !== 'Not received');
    if (!unmatched.length) {
      toast.error('No requested serial is available to mark as not received.');
      return false;
    }

    const { error: updateError } = await supabase
      .from('request_serials')
      .update({
        verified: false,
        verify_result: 'Not received',
        verified_by: profile?.email || null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', unmatched[0].id);
    if (updateError) throw updateError;

    const { error: insertError } = await supabase
      .from('request_serials')
      .insert({
        request_id: req.id,
        serial_number: replacement,
        asset_group: unmatched[0].asset_group,
        warehouse: unmatched[0].warehouse,
        asset_status: unmatched[0].asset_status,
        asset_code: null,
        asset_condition: null,
        exists_in_devices: false,
        is_duplicate: false,
        verified: true,
        verify_result: 'Received',
        verified_by: profile?.email || null,
        verified_at: new Date().toISOString(),
        notes: 'Added received serial',
      } as any);
    if (insertError) throw insertError;

    setReceivedSerial('');
    await load();
    toast.success('Received serial added.');
    return true;
  };

  const sendReceiptIssueBack = async () => {
    if (!req || !canAct || !isVerifyStage) return;
    if (!receiptIssue) {
      toast.error('Select a receipt issue type first.');
      return;
    }
    const reason = comment.trim();
    if (!reason) {
      toast.error('Add a comment describing the receipt issue before sending back.');
      return;
    }

    if (receiptIssue === 'damaged') {
      const damaged = serials.filter((s) => s.verify_result === 'Damaged');
      if (!damaged.length) {
        toast.error('Mark at least one received serial as damaged first.');
        return;
      }

      setBusy(true);
      try {
        await record('revoked', {
          revoke: true,
          comment: `Damaged serial(s): ${damaged.map((s) => s.serial_number).join(', ')}. Asset Codes preserved. ${reason}`,
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (receiptIssue === 'missing') {
      const missing = serials.filter((s) => !s.verified);
      if (!missing.length) {
        toast.error('No unverified serials are available to mark as not received.');
        return;
      }

      const missingText = missing.map((s) => s.serial_number).join(', ');
      setBusy(true);
      try {
        const { error } = await supabase
          .from('request_serials')
          .update({
            verified: false,
            verify_result: 'Not received',
            verified_by: profile?.email || null,
            verified_at: new Date().toISOString(),
          })
          .in('id', missing.map((s) => s.id));
        if (error) throw error;

        await record('revoked', {
          revoke: true,
          comment: `Not received serial(s): ${missingText}. ${reason}`,
        });
      } catch (e: any) {
        toast.error(e.message || 'Could not send the receipt issue back');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (receivedSerial.trim()) {
        const added = await addReceivedSerial();
        if (!added) return;
      } else if (!serials.some((s) => s.notes === 'Added received serial')) {
        toast.error('Add the received serial before sending this issue back.');
        return;
      }

      const manuallyAdded = serials.filter((s) => s.notes === 'Added received serial');
      const pendingOriginals = serials.filter(
        (s) => !s.verified && !s.verify_result && s.notes !== 'Added received serial'
      );
      if (manuallyAdded.length && pendingOriginals.length) {
        const { error } = await supabase
          .from('request_serials')
          .update({
            verified: false,
            verify_result: 'Not received',
            verified_by: profile?.email || null,
            verified_at: new Date().toISOString(),
          })
          .in('id', pendingOriginals.map((s) => s.id));
        if (error) throw error;
      }

      await record('revoked', {
        revoke: true,
        comment: `Different serial received. The original requested serial remains Not received, and the received serial is listed separately. Existing Asset Code retained on the original row. ${reason}`,
      });
    } catch (e: any) {
      toast.error(e.message || 'Could not send the corrected serial back');
    } finally {
      setBusy(false);
    }
  };


  // Display name for a person: full name, else a readable version of the email ("dhinagaran.v" -> "Dhinagaran V").
  const personName = (p: { email: string; full_name: string | null }) =>
    p.full_name?.trim() ||
    p.email.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

  // People accountable for the current stage: everyone who is allowed to act on it.
  const [stageApprovers, setStageApprovers] = useState<{ email: string; full_name: string | null }[]>([]);
  useEffect(() => {
    if (!req || req.status !== 'open') { setStageApprovers([]); return; }
    let cancelled = false;
    (async () => {
      // Sent back: the person who raised it is the one who has to act.
      if (isBackWithRaiser) {
        if (!cancelled) setStageApprovers(req.raised_by_email ? [{ email: req.raised_by_email, full_name: null }] : []);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('email, full_name, role, department, location')
        .eq('department', req.current_stage_dept);
      if (cancelled) return;
      const allowed = (data || []).filter((u: any) =>
        canActOnStage({
          role: u.role,
          department: u.department,
          assignedDept: req.current_stage_dept,
          raisedByRole: req.raised_by_role,
          stageKey: req.current_stage,
        })
      );
      // Technology Team / SCM only handle their own warehouse (or 'General' / no location).
      const localOnly = allowed.filter((u: any) =>
        !isLocationScopedDept(u.department) || !u.location || u.location === 'General' || !req.warehouse ||
        String(u.location).trim().toLowerCase() === String(req.warehouse).trim().toLowerCase()
      );
      const people = localOnly.length ? localOnly : allowed;
      setStageApprovers(people.map((u: any) => ({ email: u.email, full_name: u.full_name })));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.id, req?.current_stage, req?.current_stage_dept, req?.status, isBackWithRaiser]);

  // When the request reached its current stage (latest workflow action, else creation).
  const pendingSince = req ? (latestWorkflow?.acted_at || latestWorkflow?.created_at || req.created_at) : null;

  // Requests that were approved but never moved on are advanced automatically the next
  // time someone who is allowed to act on them opens them — no button needed.
  const [autoAdvanceFailed, setAutoAdvanceFailed] = useState(false);
  const autoAdvanceTried = useRef<string | null>(null);
  const canRepair = canAct || profile?.role === 'Super Admin' || profile?.department === 'Administrators';
  useEffect(() => {
    if (!req || !stuckNext || !canRepair || busy) return;
    if (autoAdvanceTried.current === req.id) return;
    autoAdvanceTried.current = req.id;
    advanceStuck({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.id, stuckNext?.key, canRepair]);

  const advanceStuck = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!req || !stuckNext) return;
    setBusy(true);
    try {
      const { data: updRows, error } = await supabase
        .from('requests')
        .update({ current_stage: stuckNext.key, current_stage_dept: stuckNext.dept })
        .eq('id', req.id)
        .select('id');
      if (error) throw error;
      if (!updRows?.length) throw new Error('You do not have permission to update this request.');
      await supabase.from('notifications').insert({
        target_dept: stuckNext.dept,
        request_id: req.id,
        kind: 'approved',
        title: `Stage advanced: ${stuckNext.label}`,
        body: null,
      });
      await load();
      onChanged?.();
      toast.success(`Moved to ${stuckNext.dept}`);
    } catch (e: any) {
      console.error(e);
      setAutoAdvanceFailed(true);
      if (silent) return;
      toast.error(
        /row-level security|permission/i.test(e.message || '')
          ? 'Blocked by the database rule. Run the "update requests" policy fix in Supabase first.'
          : e.message || 'Could not move the request'
      );
    } finally {
      setBusy(false);
    }
  };

  const record = async (action: StageAction, opts: { closeAfter?: boolean; reject?: boolean; revoke?: boolean; comment?: string } = {}) => {
    if (!req || !profile?.id) return;
    const actionComment = opts.comment ?? comment;
    const manuallyAddedSerials = serials.filter((s) => s.notes === 'Added received serial');
    const pendingSerials = serials.filter(
      (s) => !s.verified && !s.verify_result && s.notes !== 'Added received serial'
    );
    if (action === 'approved' && isVerifyStage && receiptIssue) {
      toast.error('Use the receipt issue button above to send this request back to the creator.');
      return;
    }
    const hasReceiptException =
      action === 'approved' &&
      isVerifyStage &&
      !isBackWithRaiser &&
      (serials.some((s) => s.verify_result === 'Not received' || s.verify_result === 'Damaged') ||
        manuallyAddedSerials.length > 0);

    // Check Operator-raised restriction for approvals
    if (action === 'approved' && !opts.reject && !opts.revoke && !(isBackWithRaiser && isRaiser)) {
      const canApprove = canActOnStage({
        role: profile.role || null,
        department: profile.department || null,
        assignedDept: req.current_stage_dept,
        raisedByRole: req.raised_by_role,
        action: 'approved',
        stageKey: req.current_stage,
      });
      if (!canApprove) {
        toast.error('You do not have permission to approve this stage.');
        return;
      }
    }

    if (action === 'approved' && isVerifyStage) {
      const unclassified = serials.filter(
        (s) => !s.verified && s.verify_result !== 'Not received' && s.verify_result !== 'Damaged'
      );
      const canReconcileReplacement =
        receiptIssue === 'incorrect' &&
        manuallyAddedSerials.length > 0 &&
        pendingSerials.length > 0;
      if (unclassified.length && !canReconcileReplacement) {
        toast.error(`Complete verification for all serials first (${unclassified.length} still pending).`);
        return;
      }
      if (hasReceiptException && !actionComment.trim()) {
        toast.error('Add a comment explaining the receipt difference before sending back to the creator.');
        return;
      }
    }
    if (action === 'approved' && isSerialEntryStage && !opts.reject && !opts.revoke) {
      if (!hasRealSerials) {
        toast.error('Add the serial numbers before sending this to the Technology Team.');
        return;
      }
      if (blankSerialRows.length) {
        toast.error(`${blankSerialRows.length} asset code row(s) still have no serial number. Fill them in or delete the unused rows.`);
        return;
      }
      if (codeRowsMissing.length) {
        toast.error(`${codeRowsMissing.length} FA serial(s) have no asset code. Only serials with an asset code from Finance can be added.`);
        return;
      }
    }
    if (action === 'approved' && isGrnStage && !opts.reject && !opts.revoke && !req.grn_number) {
      toast.error('Enter and save the GRN number before approving.');
      return;
    }
    if (action === 'approved' && isAssetCodeStage && !opts.reject && !opts.revoke && !faCodesReady) {
      toast.error(
        codesShort
          ? `Generate an asset code for every unit requested first (${codesShort} still needed).`
          : `Every FA serial needs a unique Asset Code before approving (${codeRowsMissing.length} missing).`
      );
      return;
    }
    if (action === 'approved' && isReleasePoStage && !opts.reject && !opts.revoke) {
      if (!faCodesReady || faSerialsMissingCode.length) {
        toast.error("The PO can't be released for FA assets until Finance has generated the asset codes.");
        return;
      }
      if (!req.po_number) {
        toast.error('Enter and save the PO number before releasing the PO.');
        return;
      }
    }

    setBusy(true);
    try {
      if (action === 'approved' && isVerifyStage && manuallyAddedSerials.length && pendingSerials.length) {
        const { error: reconcileError } = await supabase
          .from('request_serials')
          .update({
            verified: false,
            verify_result: 'Not received',
            verified_by: profile?.email || null,
            verified_at: new Date().toISOString(),
          })
          .in('id', pendingSerials.map((s) => s.id));
        if (reconcileError) throw reconcileError;
      }

      let nextStatus: RequestStatus = req.status;
      let nextStageKey = req.current_stage;
      let nextDept = req.current_stage_dept;
      let notifTitle = '';
      let notifBody = actionComment || '';
      let notifTarget: { user_id?: string; target_dept?: string } = { user_id: req.raised_by };
      let closesRequest = false;

      if (opts.reject) {
        nextStatus = 'rejected';
        notifTitle = `Request rejected: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
      } else if (opts.revoke || hasReceiptException) {
        // Send back instead of cancelling: to Procurement for new hardware past their
        // step, otherwise to the person who raised it (first stage).
        const target = sendBackStage(req.type, req.current_stage);
        nextStatus = 'open';
        nextStageKey = target.key;
        if (target.key === flow[0].key) {
          nextDept = req.raised_dept || target.dept;
          notifTitle = `Request sent back to you: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
          notifTarget = { user_id: req.raised_by };
        } else {
          nextDept = target.dept;
          notifTitle = `Request sent back to ${target.dept}: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
          notifTarget = { target_dept: target.dept };
        }
      } else if (action === 'approved') {
        const nxt = stageAfterCurrent();
        if (!nxt) {
          nextStatus = 'closed';
          notifTitle = `Request approved & closed: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
          closesRequest = true;
        } else {
          nextStageKey = nxt.key;
          nextDept = nxt.dept;
          notifTitle = isSentBack
            ? `Request resubmitted: ${req.title || REQUEST_TYPE_LABELS[req.type]}`
            : `Stage advanced: ${nxt.label}`;
          notifTarget = { target_dept: nxt.dept };
        }
      } else if (action === 'commented') {
        notifTitle = `Comment added on: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
      }

      if (opts.reject || opts.revoke || hasReceiptException || action === 'approved') {
        const { data: updRows, error: updErr } = await supabase
          .from('requests')
          .update({
            status: nextStatus,
            current_stage: nextStageKey,
            current_stage_dept: nextDept,
          })
          .eq('id', req.id)
          .select('id');
        if (updErr) throw updErr;
        if (!updRows?.length) throw new Error('You do not have permission to update this request.');
      }

      // Create / update the actual assets only once the request is confirmed closed.
      if (closesRequest) {
        if (req.type === 'new_hardware') {
          await materializeAssets();
        } else if (req.type === 'asset_movement') {
          await applyMovement();
        }
      }

      // Record history only after the request itself has moved, so a blocked update
      // never leaves an "Approved" entry on a request that didn't advance.
      const { error: stageErr } = await supabase.from('request_stages').insert({
        request_id: req.id,
        stage_key: req.current_stage,
        stage_label: flow[currentIdx]?.label || req.current_stage,
        order_index: currentIdx,
        assigned_dept: req.current_stage_dept,
        action: isSentBack && action === 'approved'
          ? 'submitted'
          : (hasReceiptException ? 'revoked' : action),
        actor_id: profile.id,
        actor_email: profile.email,
        actor_dept: profile.department,
        comment: actionComment || (isSentBack && action === 'approved' ? 'Resubmitted' : null),
        acted_at: new Date().toISOString(),
      });
      if (stageErr) throw stageErr;

      if (notifTitle) {
        await supabase.from('notifications').insert({
          ...notifTarget,
          request_id: req.id,
          kind: action,
          title: notifTitle,
          body: notifBody || null,
        });
      }

      await notifyMentions(actionComment);



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
      quantity: physicalSerials.length || req.quantity || 0,
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

    if (physicalSerials.length) {
      const deviceRows = physicalSerials.map((s) => {
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
    if (!req || !physicalSerials.length) return;
    let failed = 0;
    for (const s of physicalSerials) {
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

  const savePo = async () => {
    if (!req) return;
    const po = poInput.trim();
    if (!po) return;
    setBusy(true);
    try {
      const { data: updRows, error } = await supabase
        .from('requests')
        .update({ po_number: po })
        .eq('id', req.id)
        .select('id');
      if (error) throw error;
      if (!updRows?.length) throw new Error('You do not have permission to update this request.');
      await supabase.from('request_stages').insert({
        request_id: req.id,
        stage_key: req.current_stage,
        stage_label: `PO Number saved: ${po}`,
        order_index: currentIdx,
        assigned_dept: req.current_stage_dept,
        action: 'commented',
        actor_id: profile?.id,
        actor_email: profile?.email,
        actor_dept: profile?.department,
        comment: null,
      });
      toast.success('PO number saved');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Could not save PO number');
    } finally {
      setBusy(false);
    }
  };

  /** ---- Procurement step: add serial numbers to a request raised by Planning ---- */
  const [serialPaste, setSerialPaste] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const serialFileRef = useRef<HTMLInputElement>(null);

  const addSerials = async (raw: string) => {
    if (!req || !canAct || !isSerialEntryStage) return;
    const list = raw
      .split(/[\n\r\t,; ]+/)
      .map((s) => s.trim().replace(/^"|"$/g, ''))
      .filter((s) => s && !/^serial(_| )?(number|no)?$/i.test(s));
    const existing = new Set(serials.map((s) => s.serial_number.toLowerCase()));
    const seen = new Set<string>();
    const fresh = list.filter((s) => {
      const k = s.toLowerCase();
      if (existing.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const skippedCount = list.length - fresh.length;
    if (!fresh.length) {
      toast.error(list.length ? 'All of these serials are already in this request.' : 'Enter at least one serial number.');
      return;
    }
    setBusy(true);
    try {
      const { data: inDevices } = await supabase
        .from('devices')
        .select('serial_number')
        .in('serial_number', fresh)
        .eq('is_deleted', false);
      const known = new Set((inDevices || []).map((d: any) => d.serial_number));
      const group = req.asset_group || 'NFA';
      const status = newStatus || req.asset_status || 'Fresh';

      // Fill the rows Finance already gave an asset code (lowest code first).
      const blanks = [...blankSerialRows].sort((a, b) =>
        String(a.asset_code || '').localeCompare(String(b.asset_code || ''), undefined, { numeric: true })
      );
      const fillCount = Math.min(blanks.length, fresh.length);
      const fills = fresh.slice(0, fillCount);
      const extra = fresh.slice(fillCount);
      // FA serials can only go against an asset code; NFA requests can add as many as arrived.
      const extraAllowed = isFaGroup(group) ? [] : extra;
      const refused = extra.length - extraAllowed.length;

      if (fills.length) {
        await updateSerials(
          fills.map((sn, i) => ({
            id: blanks[i].id,
            patch: { serial_number: sn, asset_status: status, exists_in_devices: known.has(sn) },
          }))
        );
      }
      if (extraAllowed.length) {
        const { error } = await (supabase as any).from('request_serials').insert(
          extraAllowed.map((sn) => ({
            request_id: req.id,
            serial_number: sn,
            asset_group: group,
            asset_status: status,
            warehouse: req.warehouse || null,
            exists_in_devices: known.has(sn),
            is_duplicate: false,
          }))
        );
        if (error) throw error;
      }
      setSerialPaste('');
      await load();
      const added = fills.length + extraAllowed.length;
      if (added) {
        toast.success(
          `Added ${added} serial(s)` +
            (skippedCount ? ` · ${skippedCount} skipped (already listed)` : '') +
            (known.size ? ` · ${known.size} already exist in Devices` : '')
        );
      }
      if (refused) {
        toast.error(`${refused} serial(s) not added: there are no more asset codes. Ask Finance if more units arrived.`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not add serials');
    } finally {
      setBusy(false);
    }
  };

  const setSerialNumber = async (id: string, value: string) => {
    const v = value.trim();
    if (v && serials.some((s) => s.id !== id && s.serial_number.toLowerCase() === v.toLowerCase())) {
      toast.error(`${v} is already listed in this request`);
      await load();
      return;
    }
    const { error } = await supabase.from('request_serials').update({ serial_number: v }).eq('id', id);
    if (error) toast.error(error.message);
    else await load();
  };

  /** Reject if a database call hangs, so the button never spins forever. */
  const withTimeout = <T,>(p: PromiseLike<T>, ms: number, what: string): Promise<T> =>
    Promise.race([
      Promise.resolve(p),
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out. Please try again.`)), ms)),
    ]);

  /** Update many serial rows at once (in parallel batches) instead of one after another. */
  const updateSerials = async (updates: { id: string; patch: Record<string, unknown> }[]) => {
    const BATCH = 25;
    for (let i = 0; i < updates.length; i += BATCH) {
      const results = await Promise.all(
        updates.slice(i, i + BATCH).map((u) =>
          supabase.from('request_serials').update(u.patch).eq('id', u.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    }
  };

  const nextFreeAssetCode = async (): Promise<number> => {
    // Highest code already given to a device, plus codes reserved on other still-open
    // requests (closed requests' codes are already on devices). Both queries run together.
    const [{ data, error: devErr }, { data: used, error: usedErr }] = await withTimeout(
      Promise.all([
        supabase
          .from('devices')
          .select('far_code')
          .not('far_code', 'is', null)
          .order('far_code', { ascending: false })
          .limit(1),
        supabase
          .from('request_serials')
          .select('asset_code, requests!inner(status)')
          .not('asset_code', 'is', null)
          .eq('requests.status', 'open'),
      ]),
      30000,
      'Looking up the next asset code'
    );
    if (devErr) throw devErr;
    if (usedErr) throw usedErr;
    const maxUsed = (used || []).reduce((m: number, r: any) => {
      const n = Number(r.asset_code);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return Math.max(Number(data?.[0]?.far_code || 100000), maxUsed, 100000) + 1;
  };

  /** Asset code rows created before the material arrives: the serial is filled in later. */
  const insertCodeRows = async (codes: string[]) => {
    if (!req || !codes.length) return;
    const { error } = await withTimeout(
      (supabase as any).from('request_serials').insert(
        codes.map((c) => ({
          request_id: req.id,
          serial_number: '',
          asset_code: c,
          asset_group: req.asset_group || 'FA',
          asset_status: req.asset_status || 'Fresh',
          warehouse: req.warehouse || null,
          exists_in_devices: false,
          is_duplicate: false,
        }))
      ) as PromiseLike<{ error: any }>,
      60000,
      'Saving asset codes'
    );
    if (error) throw error;
  };

  const autoGenerateAssetCodes = async () => {
    if (!req) return;
    setBusy(true);
    try {
      // Existing FA rows without a code, then one new (serial-less) row per unit still needed.
      const targets = codeRowsMissing;
      if (!targets.length && !codesShort) {
        toast.info('Every unit already has an asset code');
        return;
      }
      let code = await nextFreeAssetCode();
      await withTimeout(
        updateSerials(targets.map((s) => ({ id: s.id, patch: { asset_code: String(code++) } }))),
        60000,
        'Saving asset codes'
      );
      await insertCodeRows(Array.from({ length: codesShort }, () => String(code++)));
      toast.success(`Generated ${targets.length + codesShort} asset codes`);
      await load();
    } catch (e: any) {
      console.error(e);
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

  const replaceSerial = async (serial: SerialRow) => {
    const replacement = (replacementSerials[serial.id] || '').trim();
    if (!replacement) {
      toast.error('Enter a replacement serial number.');
      return;
    }
    if (serials.some((s) => s.id !== serial.id && s.serial_number.toLowerCase() === replacement.toLowerCase())) {
      toast.error('That serial number is already listed in this request.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('request_serials')
        .update({
          serial_number: replacement,
          verified: false,
          verify_result: null,
          asset_condition: null,
          verified_by: null,
          verified_at: null,
        })
        .eq('id', serial.id);
      if (error) throw error;
      setReplacementSerials((prev) => ({ ...prev, [serial.id]: '' }));
      await load();
      toast.success('Replacement serial saved. Verify it before resubmitting.');
    } catch (e: any) {
      toast.error(e.message || 'Could not save replacement serial');
    } finally {
      setBusy(false);
    }
  };

  const deleteSerial = async (serial: SerialRow) => {
    if (!req || !(isVerifyStage || isSerialEntryStage) || !canAct) return;
    if (!confirm(`Delete serial ${serial.serial_number} from this request? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('request_serials')
        .delete()
        .eq('id', serial.id)
        .eq('request_id', req.id);
      if (error) throw error;
      await load();
      toast.success('Serial deleted from the request');
    } catch (e: any) {
      toast.error(e.message || 'Could not delete serial');
    } finally {
      setBusy(false);
    }
  };

  const bulkAssetCodes = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const map = new Map<string, string>();
      // A file with one column is a plain list of asset codes (before serials exist).
      const codeList: string[] = [];
      text.split(/\r?\n/).forEach((line) => {
        const [a, b] = line.split(',').map((c) => (c || '').trim().replace(/^"|"$/g, ''));
        if (!a) return;
        if (/serial|asset.?code/i.test(a)) return;
        if (!b) codeList.push(a);
        else map.set(a, b);
      });
      if (codeList.length) {
        const taken = new Set(serials.map((s) => s.asset_code).filter(Boolean));
        const fresh = codeList.filter((c, i) => !taken.has(c) && codeList.indexOf(c) === i);
        const fillRows = codeRowsMissing.slice(0, fresh.length);
        await withTimeout(
          updateSerials(fillRows.map((s, i) => ({ id: s.id, patch: { asset_code: fresh[i] } }))),
          60000,
          'Saving asset codes'
        );
        const rest = fresh.slice(fillRows.length, fillRows.length + codesShort);
        await insertCodeRows(rest);
        const ignored = codeList.length - fillRows.length - rest.length;
        toast.success(
          `Added ${fillRows.length + rest.length} asset codes` +
            (ignored ? ` · ${ignored} ignored (duplicate or more than the quantity)` : '')
        );
        await load();
        return;
      }
      const updates = serials
        .filter((s) => {
          const code = map.get(s.serial_number);
          return code && code !== s.asset_code;
        })
        .map((s) => ({ id: s.id, patch: { asset_code: map.get(s.serial_number)! } }));
      await withTimeout(updateSerials(updates), 60000, 'Saving asset codes');
      toast.success(`Updated ${updates.length} asset codes`);
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
                const signOff = stageSignOff(s.key);
                const notNeeded = skipped.includes(s.key);
                // Asset code / PO release only count as done when someone signed them off
                // (requests started under the old order may have passed them by).
                const mustSignOff = s.key === ASSET_CODE_STAGE || s.key === RELEASE_PO_STAGE;
                const done = !notNeeded && (
                  ((req.status === 'closed' || req.status === 'approved' || i < currentIdx) &&
                    (!mustSignOff || !!signOff)) ||
                  (i === currentIdx && req.status === 'open' && signOff?.action === 'approved'));
                const active = i === currentIdx && req.status === 'open' && !done;
                return (
                  <li
                    key={s.key}
                    className={`flex items-center gap-3 p-2 rounded border ${
                      active ? 'border-primary bg-primary/5' : done ? 'border-transparent' : 'border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div className={cn('min-w-0 flex-1', notNeeded && 'opacity-50')}>
                      <div className={cn('text-sm font-medium', notNeeded && 'line-through')}>{s.label}</div>
                      <div className='text-xs text-muted-foreground'>
                        {s.dept}{notNeeded ? ' · Not needed (NFA only)' : ''}
                      </div>
                    </div>
                    {done && (
                      <div
                        className='ml-auto flex items-center gap-1.5 text-right shrink-0 max-w-[45%]'
                        title={signOff ? `${signOff.action === 'submitted' ? 'Submitted' : 'Approved'} by ${signOff.actor_email || ''}` : 'Completed'}
                      >
                        <CheckCircle2 className='w-4 h-4 text-green-600 shrink-0' />
                        <div className='min-w-0 leading-tight'>
                          <div className='text-[11px] font-medium text-green-700 truncate'>
                            {signOff ? personName({ email: signOff.actor_email || '', full_name: null }) : 'Completed'}
                          </div>
                          {signOff && (
                            <div className='text-[10px] text-muted-foreground'>
                              {fmtDateTime(signOff.acted_at || signOff.created_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {active && (
                      <div
                        className='ml-auto flex items-center gap-1.5 text-right shrink-0 max-w-[50%]'
                        title={
                          stageApprovers.length
                            ? `Waiting for: ${stageApprovers.map((a) => a.email).join(', ')}`
                            : `Waiting for an Admin of ${s.dept}`
                        }
                      >
                        <Clock className='w-4 h-4 text-amber-500 shrink-0' />
                        <div className='min-w-0 leading-tight'>
                          <div className='text-[10px] uppercase tracking-wide text-amber-600'>Pending with</div>
                          <div className='flex min-w-0 items-center gap-1 text-[11px] font-semibold text-amber-800'>
                            {stageApprovers.length ? (
                              <>
                                <span className='min-w-0 truncate'>
                                  {stageApprovers.slice(0, 2).map(personName).join(', ')}
                                </span>
                                {stageApprovers.length > 2 && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type='button'
                                        className='shrink-0 whitespace-nowrap text-[11px] font-semibold text-amber-800 underline decoration-dotted underline-offset-2 hover:text-amber-950'
                                        aria-label={`Show ${stageApprovers.length - 2} additional approver${stageApprovers.length - 2 === 1 ? '' : 's'}`}
                                      >
                                        +{stageApprovers.length - 2}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent align='end' className='w-64 p-3'>
                                      <div className='mb-2 text-xs font-semibold'>Additional approvers</div>
                                      <div className='space-y-2'>
                                        {stageApprovers.slice(2).map((approver) => (
                                          <div key={approver.email} className='text-xs'>
                                            <div className='font-medium'>{personName(approver)}</div>
                                            <div className='text-muted-foreground break-all'>{approver.email}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </>
                            ) : (
                              <span className='truncate'>{s.dept} Admin (not assigned)</span>
                            )}
                          </div>
                          {pendingSince && (
                            <div className='text-[10px] text-muted-foreground'>
                              Waiting {formatDistanceToNow(new Date(pendingSince))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {stuckNext && (autoAdvanceFailed || !canRepair) && (
              <div className='mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 space-y-2'>
                <div>
                  This stage was approved but the request didn't move on to <b>{stuckNext.dept}</b>.
                </div>
                {canRepair && (
                  <Button size='sm' className='h-7' disabled={busy} onClick={() => advanceStuck()}>
                    {busy ? <Loader2 className='w-3 h-3 animate-spin' /> : `Move to ${stuckNext.dept}`}
                  </Button>
                )}
              </div>
            )}

            <div className='text-sm font-semibold pt-4 border-t'>History <span className='text-[10px] font-normal text-muted-foreground'>(latest first)</span></div>
            <div className='space-y-2 pr-1'>
              {stages.length === 0 && (
                <div className='text-xs text-muted-foreground italic'>No activity recorded yet.</div>
              )}
              {stages.map((s) => (
                <div key={s.id} className='text-xs p-2 rounded border bg-muted/30 break-words'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='font-medium capitalize'>{s.action}</span>
                    <span className='text-muted-foreground shrink-0'>{fmtDateTime(s.acted_at || s.created_at)}</span>
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
                ['PO Quantity', req.quantity ?? serials.length],
                ['Received Quantity', receivedCount],
                ['Missing Quantity', missingCount],
                ['Asset Status', req.asset_status || serials.find((s) => s.asset_status)?.asset_status],
                ['Requested At', fmtDateTime(req.created_at)],
                ['GRN Number', req.grn_number],
                ['Pending At', req.status === 'open'
                  ? `${req.current_stage_dept}${stageApprovers.length ? ` · ${stageApprovers.map(personName).join(', ')}` : ''}`
                  : '—'],
                ['Requested By', req.raised_by_email],
              ].map(([k, v]) => (
                <div key={k as string} className='p-2 rounded border bg-muted/30 min-w-0'>
                  <div className='text-[10px] uppercase text-muted-foreground'>{k}</div>
                  <div className='truncate text-xs font-semibold' title={v ? String(v) : '-'}>{v || '-'}</div>
                </div>
              ))}
            </div>

            <div className='p-3 rounded-xl border border-blue-100 bg-blue-50/30 space-y-1.5'>
              <div className='text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2'>
                <History className='w-3 h-3' /> Admin Note
              </div>
              <p className='text-[11px] leading-relaxed text-slate-600 font-medium'>
                Administrators receive all notifications and can act on requests at any stage.
                Requests not acted upon within <strong>15 working days</strong> will be automatically approved by the system Admin.
              </p>
            </div>

            {req.notes && (
              <div className='p-3 rounded border bg-muted/30 text-sm'>
                <div className='text-[10px] uppercase text-muted-foreground mb-1'>Notes</div>
                {req.notes}
              </div>
            )}

            {/* Procurement: add PO + serial numbers to Planning's request */}
            {req.status === 'open' && isSerialEntryStage && canAct && (
              <div className='p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3'>
                <div className='text-xs font-black uppercase tracking-widest text-indigo-700'>
                  Add serial numbers (material received at warehouse)
                </div>
                <p className='text-[11px] text-slate-600'>
                  Planning requested <b>{req.quantity ?? '-'}</b> {req.asset_type || 'asset'}(s)
                  {req.model ? ` · ${req.model}` : ''}{req.warehouse ? ` for ${req.warehouse}` : ''}
                  {req.po_number ? <> · PO <b>{req.po_number}</b></> : ''}.
                  {isFaGroup(req.asset_group)
                    ? ' Each serial is matched to an asset code from Finance, lowest code first. You can also type serials straight into the table below.'
                    : ' NFA request, so no asset codes are needed.'}
                  {' '}Then click Approve to send it to the Technology Team for verification.
                </p>
                <textarea
                  value={serialPaste}
                  onChange={(e) => setSerialPaste(e.target.value)}
                  placeholder='Type, scan or paste serial numbers (one per line, or separated by commas)'
                  rows={4}
                  className='w-full rounded-md border bg-background px-3 py-2 text-sm font-mono'
                  disabled={busy}
                />
                <div className='flex flex-wrap items-center gap-2'>
                  <select
                    value={newStatus || req.asset_status || 'Fresh'}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className='h-8 rounded border bg-background px-2 text-xs'
                    aria-label='Asset status for new serials'
                  >
                    {assetStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button size='sm' onClick={() => addSerials(serialPaste)} disabled={busy || !serialPaste.trim()}>
                    <Plus className='w-3.5 h-3.5 mr-1' /> Add serials
                  </Button>
                  <input
                    ref={serialFileRef}
                    type='file'
                    accept='.csv,.txt'
                    className='hidden'
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        // First column of each line is the serial number.
                        const text = await f.text();
                        await addSerials(text.split(/\r?\n/).map((l) => l.split(',')[0]).join('\n'));
                      }
                      if (serialFileRef.current) serialFileRef.current.value = '';
                    }}
                  />
                  <Button size='sm' variant='outline' onClick={() => serialFileRef.current?.click()} disabled={busy}>
                    <Upload className='w-3.5 h-3.5 mr-1' /> Upload CSV
                  </Button>
                  <span className='text-[11px] text-muted-foreground ml-auto'>
                    {serials.length - blankSerialRows.length} serial(s) added
                    {blankSerialRows.length ? ` · ${blankSerialRows.length} asset code(s) waiting for a serial` : ''}
                    {req.quantity ? ` · ${req.quantity} requested` : ''}
                  </span>
                </div>
                <p className='text-[10px] text-muted-foreground'>
                  If fewer units arrived, delete the unused rows in the table below before approving.
                </p>
              </div>
            )}

            {/* Serials */}
            {serials.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <div className='text-sm font-semibold'>
                    Serial Numbers ({receivedCount}
                    {req.quantity ? ` / ${req.quantity} received` : ' received'})
                    <span className='ml-2 text-[10px] font-normal text-muted-foreground'>
                      {serials.length} listed
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200'>
                      Received {receivedCount}{req.quantity ? ` / ${req.quantity}` : ''}
                    </Badge>
                    {missingCount > 0 && (
                      <Badge variant='outline' className='text-[10px] font-bold bg-red-50 text-red-700 border-red-200'>
                        Missing {missingCount}
                      </Badge>
                    )}
                    {pendingReceiptCount > 0 && (
                      <Badge variant='outline' className='text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200'>
                        Pending {pendingReceiptCount}
                      </Badge>
                    )}
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

                {isVerifyStage && (
                  <div className='p-3 rounded-xl border border-red-100 bg-red-50/40 space-y-2'>
                    <div className='text-xs font-black uppercase tracking-widest text-red-700'>
                      Receipt issue
                    </div>
                    <p className='text-[11px] text-slate-600'>
                      If the shipment is incomplete or a serial is different, record the issue and send this same request back to its creator.
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant={receiptIssue === null ? 'default' : 'outline'}
                        onClick={() => setReceiptIssue(null)}
                        disabled={!canAct || busy}
                      >
                        Standard / No issue
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={receiptIssue === 'missing' ? 'default' : 'outline'}
                        onClick={() => setReceiptIssue('missing')}
                        disabled={!canAct || busy}
                      >
                        Missing serials
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={receiptIssue === 'incorrect' ? 'default' : 'outline'}
                        onClick={() => setReceiptIssue('incorrect')}
                        disabled={!canAct || busy}
                      >
                        Different serial received
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={receiptIssue === 'damaged' ? 'default' : 'outline'}
                        onClick={() => setReceiptIssue('damaged')}
                        disabled={!canAct || busy}
                      >
                        Damaged asset
                      </Button>
                    </div>
                    {receiptIssue === 'incorrect' && (
                      <div className='space-y-1'>
                        <Input
                          value={receivedSerial}
                          onChange={(e) => setReceivedSerial(e.target.value)}
                          placeholder='Enter serial number physically received'
                          className='h-9 text-sm font-mono'
                          disabled={!canAct || busy}
                        />
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await addReceivedSerial();
                            } catch (e: any) {
                              toast.error(e.message || 'Could not add received serial');
                            } finally {
                              setBusy(false);
                            }
                          }}
                          disabled={!canAct || busy || !receivedSerial.trim()}
                        >
                          <Plus className='w-3.5 h-3.5 mr-1' /> Add received serial
                        </Button>
                        <p className='text-[10px] text-muted-foreground'>
                        The unmatched requested serial stays listed as Not received. The new row is marked
                        <span className='font-semibold'> Manually added</span> and counted immediately. You can delete it from the table if it was entered incorrectly.
                        </p>
                      </div>
                    )}
                    {receiptIssue === 'damaged' && (
                      <p className='text-[11px] text-red-700'>
                        Mark damaged serials in the table below. Existing Asset Codes will be preserved.
                      </p>
                    )}
                    {receiptIssue && (
                      <Button
                        type='button'
                        size='sm'
                        variant='destructive'
                        onClick={sendReceiptIssueBack}
                        disabled={!canAct || busy}
                      >
                        {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <><RotateCcw className='w-4 h-4 mr-1' /> Send back to {returnDepartment}</>}
                      </Button>
                    )}
                    <p className='text-[10px] text-muted-foreground'>
                      The comment below is required and remains visible in request history.
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

                {req.quantity && serials.length !== req.quantity && !serials.some((s) => s.notes === 'Added received serial') && (
                  <div className='p-2 rounded border border-amber-300 bg-amber-50 text-xs text-amber-800 flex items-center gap-1'>
                    <AlertTriangle className='w-3 h-3' />
                    Serial count ({serials.length}) does not match PO quantity ({req.quantity}).
                  </div>
                )}
                {req.quantity && (
                  <div className='p-2 rounded border border-blue-200 bg-blue-50 text-xs text-blue-800 flex items-center justify-between gap-2'>
                    <span>
                      Physical receipt total updates automatically. PO quantity remains {req.quantity} for audit history.
                    </span>
                    <span className='font-bold whitespace-nowrap'>
                      {receivedCount} received · {missingCount} missing
                    </span>
                  </div>
                )}
                <div className='max-h-72 overflow-auto rounded border'>
                  <table className='w-full table-auto text-xs'>
                    <thead className='bg-muted/40 sticky top-0'>
                      <tr>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Serial</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Status</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Group</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Asset Code</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Verification</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Verified By</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Verified At</th>
                        <th className='whitespace-nowrap text-left align-middle px-2 py-1.5'>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serials
                        .filter(s => !serialSearchQuery || s.serial_number?.toLowerCase().includes(serialSearchQuery.toLowerCase()))
                        .map((s) => (
                        <tr key={s.id} className='border-t hover:bg-muted/10'>
                          <td className='px-2 py-1.5 align-middle whitespace-nowrap'>
                            <div className='flex items-center gap-1.5'>
                              {isSerialEntryStage && canAct ? (
                                <Input
                                  key={`${s.id}:${s.serial_number}`}
                                  defaultValue={s.serial_number}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() !== s.serial_number) setSerialNumber(s.id, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  }}
                                  placeholder='Enter serial'
                                  className='h-7 w-40 text-[11px] font-mono'
                                  disabled={busy}
                                />
                              ) : s.serial_number ? (
                                <span className='whitespace-nowrap font-mono'>{s.serial_number}</span>
                              ) : (
                                <span className='whitespace-nowrap italic text-muted-foreground'>Awaiting serial</span>
                              )}
                              {s.notes === 'Added received serial' && (
                                <Badge
                                  variant='outline'
                                  className='shrink-0 border-blue-200 bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700'
                                  title='This serial was manually added as the received serial'
                                >
                                  MANUAL
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className='px-2 py-1.5 align-middle'>{s.asset_status || req.asset_status || '-'}</td>
                          <td className='px-2 py-1.5 align-middle'>{s.asset_group || '-'}</td>
                          <td className='px-2 py-1.5 align-middle font-mono'>
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

                          <td className='px-2 py-1.5 align-middle'>
                            <button
                              type='button'
                              onClick={() => toggleSerialVerified(s)}
                              disabled={!canAct || !isVerifyStage || busy}
                              title={isVerifyStage && canAct ? 'Toggle verification' : 'Verification status'}
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border',
                                s.verified
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200',
                                isVerifyStage && canAct ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                              )}
                            >
                              {s.verified ? 'Verified' : s.verify_result || 'Pending'}
                            </button>
                          </td>
                          <td className='px-2 py-1.5 align-middle text-muted-foreground whitespace-nowrap'>
                            {s.verified_by || '-'}
                          </td>
                          <td className='px-2 py-1.5 align-middle text-muted-foreground whitespace-nowrap'>
                            {s.verified_at ? fmtDateTime(s.verified_at) : '-'}
                          </td>
                          <td className='px-2 py-1.5 align-middle whitespace-nowrap'>
                            <div className='flex min-h-5 items-center gap-1'>
                              <div className='flex min-w-[64px] items-center gap-1'>
                                {s.exists_in_devices && (
                                  <Badge variant='destructive' className='shrink-0 text-[10px] h-5'>Exists</Badge>
                                )}
                                {s.is_duplicate && <Badge variant='outline' className='shrink-0 text-[10px] h-5'>Duplicate</Badge>}
                              </div>
                              {(isVerifyStage || isSerialEntryStage) && canAct ? (
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  className='h-5 w-5 shrink-0 p-0 text-red-600 hover:text-red-700'
                                  onClick={() => deleteSerial(s)}
                                  disabled={busy}
                                  title='Delete this serial from the request'
                                  aria-label={`Delete serial ${s.serial_number}`}
                                >
                                  <Trash2 className='w-3.5 h-3.5' />
                                </Button>
                              ) : <span className='h-5 w-5 shrink-0' />}
                              {isVerifyStage && canAct ? (
                                <Button
                                  type='button'
                                  size='sm'
                                  variant={s.verify_result === 'Damaged' ? 'destructive' : 'outline'}
                                  className='h-6 w-[88px] shrink-0 justify-center px-1.5 text-[10px]'
                                  onClick={() => markSerialDamaged(s)}
                                  disabled={busy}
                                >
                                  {s.verify_result === 'Damaged' ? 'Damaged' : 'Mark damaged'}
                                </Button>
                              ) : <span className='h-6 w-[88px] shrink-0' />}
                            </div>
                            {isSentBack && canAct && s.verify_result === 'Damaged' && (
                              <div className='mt-1 flex items-center gap-1'>
                                <Input
                                  value={replacementSerials[s.id] || ''}
                                  onChange={(e) => setReplacementSerials((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                  placeholder='Replacement serial'
                                  className='h-6 w-32 text-[10px] font-mono'
                                  disabled={busy}
                                />
                                <Button
                                  type='button'
                                  size='sm'
                                  className='h-6 px-1.5 text-[9px]'
                                  onClick={() => replaceSerial(s)}
                                  disabled={busy}
                                >
                                  Save
                                </Button>
                              </div>
                            )}
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

            {req.status === 'open' && isReleasePoStage && (
              <div className='p-3 rounded-xl border border-violet-100 bg-violet-50/40 space-y-2'>
                <div className='text-xs font-black uppercase tracking-widest text-violet-700'>Release PO</div>
                {!faCodesReady || faSerialsMissingCode.length > 0 ? (
                  <div className='p-2 rounded border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-1'>
                    <AlertTriangle className='w-3 h-3 shrink-0' />
                    Asset codes are missing ({codesShort || codeRowsMissing.length || faSerialsMissingCode.length}).
                    The PO can't be released for FA assets until Finance generates them.
                  </div>
                ) : (
                  <div className='p-2 rounded border border-green-200 bg-green-50 text-xs text-green-800 flex items-center gap-1'>
                    <CheckCircle2 className='w-3 h-3 shrink-0' />
                    {hasFA
                      ? `${codeRows.filter((s) => s.asset_code).length} asset code(s) ready from Finance.`
                      : 'NFA request, so no asset codes are needed.'}
                  </div>
                )}
                {canAct && (
                  <div className='flex gap-2'>
                    <Input
                      value={poInput}
                      onChange={(e) => setPoInput(e.target.value)}
                      placeholder='Enter PO number'
                      className='h-9 text-sm'
                    />
                    <Button
                      size='sm'
                      onClick={savePo}
                      disabled={busy || !poInput.trim() || poInput.trim() === (req.po_number || '')}
                    >
                      Save PO
                    </Button>
                  </div>
                )}
                <p className='text-[10px] text-muted-foreground'>
                  Save the PO number, then click Approve to release the PO. When the material reaches the warehouse,
                  Procurement adds the serial numbers in the next step.
                </p>
              </div>
            )}

            {req.status === 'open' && isAssetCodeStage && canAct && (
              <div className='p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2'>
                <div className='text-xs font-black uppercase tracking-widest text-emerald-700'>Generate Asset Codes (FA)</div>
                <p className='text-[11px] text-slate-600'>
                  Planning requested <b>{req.quantity ?? '-'}</b> {req.asset_type || 'asset'}(s). Generate one asset code per unit.
                  Procurement can only release the PO once they're all done. The serial numbers are matched to these codes
                  later, when the material reaches the warehouse.
                  {(codesShort > 0 || codeRowsMissing.length > 0) && <b> {codesShort + codeRowsMissing.length} still needed.</b>}
                </p>
                <div className='flex flex-wrap gap-2'>
                  <Button size='sm' variant='outline' onClick={autoGenerateAssetCodes} disabled={busy}>
                    {codesShort || codeRowsMissing.length
                      ? `Auto-generate ${codesShort + codeRowsMissing.length} asset code(s)`
                      : 'Auto-generate for missing'}
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
                  Upload a list of asset codes (one per line), or <span className='font-mono'>serial_number,asset_code</span> if serials
                  already exist. Asset codes must be unique. You can also edit them one by one in the table above.
                </p>
              </div>
            )}

            {/* Action */}
            {req.status === 'open' && (
              <div className='pt-4 border-t space-y-2'>

                <MentionTextarea
                  value={comment}
                  onChange={setComment}
                  placeholder='Add a comment — type @ to tag a teammate (e.g. @test@gmail.com)'
                  rows={2}
                  disabled={busy}
                />

                <div className='flex flex-wrap gap-2 justify-end'>
                  <Button
                    variant='outline'
                    disabled={busy || !comment.trim()}
                    onClick={() => record('commented')}
                  >
                    {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Comment'}
                  </Button>
                  {!isBackWithRaiser && currentIdx > 0 && (
                    <Button
                      variant='outline'
                      disabled={!canAct || busy || !comment.trim()}
                      onClick={() => record('revoked', { revoke: true })}
                      title='Send this request back to the person who raised it'
                    >
                      {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <><RotateCcw className='w-4 h-4 mr-1' /> Send back to {returnDepartment}</>}
                    </Button>
                  )}
                  <Button
                    variant='destructive'
                    disabled={!canAct || busy || (profile?.department !== 'Administrators' && !comment.trim())}
                    onClick={() => record('rejected', { reject: true })}
                  >
                    {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <><X className='w-4 h-4 mr-1' /> Reject</>}
                  </Button>
                  {!(isVerifyStage && (receiptIssue === 'missing' || receiptIssue === 'incorrect')) && (
                    <Button
                      disabled={!canAct || busy}
                      onClick={() => record('approved')}
                    >
                      {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <><Check className='w-4 h-4 mr-1' /> {isSentBack ? 'Resubmit' : 'Approve'}</>}
                    </Button>
                  )}
                </div>
                {!canAct && (
                  <p className='text-xs text-muted-foreground text-right'>
                    {locationBlocked
                      ? `This request belongs to ${req.warehouse}. You can only act on ${profile?.location} requests.`
                      : isBackWithRaiser
                        ? `This request was sent back to ${req.raised_by_email || 'the requester'} for changes.`
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
