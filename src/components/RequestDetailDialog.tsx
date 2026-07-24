import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
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
import {
  Check,
  X,
  RotateCcw,
  Upload,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  FileDown,
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
  warehouse: string | null;
  asset_type: string | null;
  model: string | null;
  configuration: string | null;
  quantity: number | null;
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
}

export default function RequestDetailDialog({ requestId, open, onOpenChange, onChanged }: Props) {
  const { profile } = useUserProfile();
  const [req, setReq] = useState<RequestFull | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data: r }, { data: s }, { data: sn }, { data: d }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', requestId).single(),
      supabase
        .from('request_stages')
        .select('*')
        .eq('request_id', requestId)
        .order('acted_at', { ascending: true }),
      supabase.from('request_serials').select('*').eq('request_id', requestId),
      supabase
        .from('request_documents')
        .select('*')
        .eq('request_id', requestId)
        .order('uploaded_at', { ascending: false }),
    ]);
    setReq(r as any);
    setStages((s as StageRow[]) || []);
    setSerials((sn as SerialRow[]) || []);
    setDocs((d as DocRow[]) || []);
  };

  useEffect(() => {
    if (open) load();
  }, [open, requestId]);

  const flow = useMemo(() => (req ? getFlow(req.type) : []), [req]);
  const currentIdx = req ? flow.findIndex((s) => s.key === req.current_stage) : -1;

  const canAct = !!req &&
    req.status === 'open' &&
    canActOnStage({
      role: profile?.role || null,
      department: profile?.department || null,
      assignedDept: req.current_stage_dept,
    });

  const record = async (action: StageAction, opts: { closeAfter?: boolean; reject?: boolean; revoke?: boolean } = {}) => {
    if (!req || !profile?.id) return;
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
        if (!nxt || nxt.key === 'closed') {
          nextStatus = 'closed';
          nextStageKey = 'closed';
          nextDept = 'Administrators';
          notifTitle = `Request approved & closed: ${req.title || REQUEST_TYPE_LABELS[req.type]}`;
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
      const path = `${req.id}/${Date.now()}_${file.name}`;
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

  const downloadDoc = async (d: DocRow) => {
    const { data, error } = await supabase.storage
      .from('request-documents')
      .createSignedUrl(d.file_path, 300);
    if (error) {
      toast.error('Could not fetch file');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const deleteDoc = async (d: DocRow) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from('request-documents').remove([d.file_path]);
    await supabase.from('request_documents').delete().eq('id', d.id);
    await load();
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
      <DialogContent className='max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0'>
        <DialogHeader className='px-6 pt-6 pb-4 border-b'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <DialogTitle className='text-xl'>
                {req.title || REQUEST_TYPE_LABELS[req.type]}
              </DialogTitle>
              <div className='text-xs text-muted-foreground mt-1'>
                {REQUEST_TYPE_LABELS[req.type]}
                {req.po_number ? ` · PO ${req.po_number}` : ''} · Raised by {req.raised_by_email} ({req.raised_dept})
              </div>
            </div>
            <Badge className='capitalize'>{req.status}</Badge>
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

            <div className='text-sm font-semibold pt-4 border-t'>History</div>
            <div className='space-y-2 max-h-64 overflow-y-auto pr-1'>
              {stages.map((s) => (
                <div key={s.id} className='text-xs p-2 rounded border bg-muted/30'>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium capitalize'>{s.action}</span>
                    <span className='text-muted-foreground'>
                      {format(new Date(s.acted_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div className='text-muted-foreground mt-0.5'>{s.stage_label}</div>
                  <div className='text-muted-foreground'>
                    {s.actor_email} · {s.actor_dept}
                  </div>
                  {s.comment && <div className='mt-1 italic'>"{s.comment}"</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: details */}
          <div className='col-span-8 space-y-4'>
            <div className='grid grid-cols-3 gap-3 text-sm'>
              {[
                ['PO Number', req.po_number],
                ['Warehouse', req.warehouse],
                ['Asset Type', req.asset_type],
                ['Model', req.model],
                ['Configuration', req.configuration],
                ['Quantity', req.quantity],
                ['Asset Group', req.asset_group],
                ['Agreement Type', req.agreement_type],
                ['Created', format(new Date(req.created_at), 'MMM d, yyyy HH:mm')],
              ].map(([k, v]) => (
                <div key={k as string} className='p-2 rounded border bg-muted/30'>
                  <div className='text-[10px] uppercase text-muted-foreground'>{k}</div>
                  <div className='truncate'>{v || '-'}</div>
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
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-sm font-semibold'>
                    Serial Numbers ({serials.length})
                  </div>
                  {dupCount > 0 && (
                    <div className='text-xs text-amber-700 flex items-center gap-1'>
                      <AlertTriangle className='w-3 h-3' /> {dupCount} flagged
                    </div>
                  )}
                </div>
                <div className='max-h-52 overflow-y-auto rounded border'>
                  <table className='w-full text-xs'>
                    <thead className='bg-muted/40 sticky top-0'>
                      <tr>
                        <th className='text-left px-2 py-1'>Serial</th>
                        <th className='text-left px-2 py-1'>Warehouse</th>
                        <th className='text-left px-2 py-1'>Group</th>
                        <th className='text-left px-2 py-1'>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serials.map((s) => (
                        <tr key={s.id} className='border-t'>
                          <td className='px-2 py-1 font-mono'>{s.serial_number}</td>
                          <td className='px-2 py-1'>{s.warehouse || '-'}</td>
                          <td className='px-2 py-1'>{s.asset_group || '-'}</td>
                          <td className='px-2 py-1'>
                            {s.exists_in_devices && (
                              <Badge variant='destructive' className='mr-1'>Exists</Badge>
                            )}
                            {s.is_duplicate && <Badge variant='outline'>Duplicate</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <div className='text-sm font-semibold'>Documents</div>
                <div>
                  <input
                    ref={fileRef}
                    type='file'
                    accept='.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f);
                    }}
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                  >
                    <Upload className='w-3 h-3 mr-1' /> Upload
                  </Button>
                </div>
              </div>
              <div className='space-y-1'>
                {docs.length === 0 && (
                  <div className='text-xs text-muted-foreground py-2'>No documents yet.</div>
                )}
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className='flex items-center justify-between px-2 py-1.5 rounded border bg-muted/20 text-xs'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <FileText className='w-4 h-4 flex-shrink-0' />
                      <div className='truncate'>
                        <div className='font-medium truncate'>{d.file_name}</div>
                        <div className='text-muted-foreground'>
                          {d.uploaded_by_email} · {format(new Date(d.uploaded_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button size='icon' variant='ghost' onClick={() => downloadDoc(d)}>
                        <Download className='w-3.5 h-3.5' />
                      </Button>
                      {(profile?.role === 'Super Admin' || profile?.role === 'Admin') && (
                        <Button size='icon' variant='ghost' onClick={() => deleteDoc(d)}>
                          <Trash2 className='w-3.5 h-3.5 text-red-600' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action */}
            {req.status === 'open' && (
              <div className='pt-4 border-t space-y-2'>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={canAct ? 'Add a comment (required for reject/revoke)...' : 'Only assigned department Admins can act.'}
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
                    Action requires being Admin/Super Admin of {req.current_stage_dept}.
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
