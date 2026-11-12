import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Inbox, User, Layers, Search, FileEdit, Trash2, BellRing, CheckCircle2 } from 'lucide-react';
import {
  REQUEST_TYPE_LABELS,
  getFlow,
  canActOnStage,
  RequestType,
  RequestStatus,
  ReceiptIdentity,
  formatRequestNo,
  getReceiptIdentity,
} from '@/lib/requestFlows';
import { TableSkeleton } from './TableSkeleton';
import { hasFullAccess, isLocationScopedDept } from '@/lib/appTabs';

import { formatDistanceToNow } from 'date-fns';
import { fmtDateTime } from '@/lib/dateFormat';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// Loaded on first open so the Requests tab appears faster.
const CreateRequestDialog = lazy(() => import('./CreateRequestDialog'));
const RequestDetailDialog = lazy(() => import('./RequestDetailDialog'));

interface RequestRow {
  id: string;
  request_no?: number | null;
  type: RequestType;
  status: RequestStatus;
  title: string | null;
  current_stage: string;
  current_stage_dept: string;
  raised_by: string;
  raised_by_email: string | null;
  raised_dept: string;
  raised_by_role?: string | null;
  po_number: string | null;
  warehouse: string | null;
  asset_type: string | null;
  quantity: number | null;
  created_at: string;
}

interface Props {
  focusRequestId?: string | null;
  onFocusHandled?: () => void;
}

// Request No. gets its own fixed first column; the remaining 12 columns are unchanged.
const ROW_GRID = 'grid grid-cols-[104px_repeat(12,minmax(0,1fr))]';

const statusColors: Record<RequestStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  revoked: 'bg-orange-100 text-orange-700',
  closed: 'bg-gray-200 text-gray-700',
};

export default function RequestsPanel({ focusRequestId, onFocusHandled }: Props) {
  const { profile, loading: profileLoading } = useUserProfile();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [receiptIdentities, setReceiptIdentities] = useState<Record<string, ReceiptIdentity>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'mine' | 'drafts' | 'all'>('inbox');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [receiptFilter, setReceiptFilter] = useState<ReceiptIdentity | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isReporter = profile?.role === 'Reporter';
  const isSuperAdmin = profile?.role === 'Super Admin';
  const seesEverything = hasFullAccess({ role: profile?.role, department: profile?.department });
  const locationScoped =
    !seesEverything &&
    isLocationScopedDept(profile?.department) &&
    !!profile?.location &&
    profile.location !== 'General';

  /** Non-administrator departments only see requests they are involved in. */
  const isRelevant = (r: RequestRow) => {
    if (seesEverything) return true;
    if (r.raised_by === profile?.id) return true;
    const dept = profile?.department;
    if (!dept) return false;
    const involved =
      r.raised_dept === dept ||
      r.current_stage_dept === dept ||
      getFlow(r.type).some((s) => s.dept === dept);
    if (!involved) return false;
    if (locationScoped && r.warehouse && r.warehouse !== profile?.location) return false;
    return true;
  };


  const STORAGE_KEY = 'nucleus_request_draft';

  const checkDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
      } catch (e) {
        setDraft(null);
      }
    } else {
      setDraft(null);
    }
  };

  const clearDraft = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    localStorage.removeItem(STORAGE_KEY);
    checkDraft();
    setDeleteConfirmOpen(false);
    toast.success('Draft deleted');
  };

  const load = async ({ background = false }: { background?: boolean } = {}) => {
    try {
      if (!background) setLoading(true);
      checkDraft();
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching requests:', error);
        toast.error("Couldn't load requests", { action: { label: 'Retry', onClick: () => load() } });
        // Keep showing the last list on a failed background refresh.
        if (!background) setRows([]);
      } else {
        setRows((data as RequestRow[]) || []);
        const requestIds = (data || []).map((request) => request.id);
        if (!requestIds.length) {
          setReceiptIdentities({});
          return;
        }
        const { data: receiptStages, error: stagesError } = await supabase
          .from('request_stages')
          .select('request_id, action, comment')
          .in('request_id', requestIds)
          .eq('stage_key', 'tech_verify_serials')
          .in('action', ['approved', 'revoked'])
          .order('created_at', { ascending: false })
          .limit(2000);
        if (stagesError) {
          console.error('Error fetching receipt outcomes:', stagesError);
          toast.error("Couldn't load receipt outcomes", { action: { label: 'Retry', onClick: () => load() } });
          return;
        }
        const identities: Record<string, ReceiptIdentity> = {};
        for (const stage of receiptStages || []) {
          if (identities[stage.request_id]) continue;
          const identity = getReceiptIdentity(stage.comment) ||
            (stage.action === 'approved' ? 'Standard' : null);
          if (identity) identities[stage.request_id] = identity;
        }
        setReceiptIdentities(identities);
      }
    } catch (e) {
      console.error('Crash in load requests:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // One action writes to several tables at once; wait briefly and reload once.
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => load({ background: true }), 800);
    };
    const ch = supabase
      .channel('requests-list-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_stages' }, () => scheduleReload())
      .subscribe();
    return () => {
      clearTimeout(reloadTimer);
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (focusRequestId) {
      setDetailId(focusRequestId);
      onFocusHandled?.();
    }
  }, [focusRequestId, onFocusHandled]);

  /** True when the signed-in user can act on this request right now. */
  const needsMyAction = (r: RequestRow) =>
    r.status === 'open' &&
    !isReporter &&
    (r.current_stage_dept === profile?.department || profile?.role === 'Super Admin') &&
    canActOnStage({
      role: profile?.role ?? null,
      department: profile?.department ?? null,
      assignedDept: r.current_stage_dept,
      raisedByRole: r.raised_by_role,
      stageKey: r.current_stage,
    });

  const stageProgress = (r: RequestRow) => {
    const flow = getFlow(r.type);
    const i = flow.findIndex((x) => x.key === r.current_stage);
    return { step: i < 0 ? 0 : i + 1, total: flow.length };
  };

  const filteredUnsorted = rows.filter((r) => {
    // "All" is a read-only overview of every request for every department.
    // Inbox / My Requests / Drafts stay limited to requests the user is involved in.
    if (tab !== 'all' && !isRelevant(r)) return false;
    if (tab === 'mine' && r.raised_by !== profile?.id) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (receiptFilter !== 'all' && receiptIdentities[r.id] !== receiptFilter) return false;

    if (tab === 'inbox') {
      const mine = r.raised_by === profile?.id;
      const forDept = profile?.department && r.current_stage_dept === profile.department;
      if (!mine && !forDept && !isSuperAdmin) return false;
      if (r.status !== 'open') return false;
    }
    if (q) {
      const term = q.toLowerCase();
      const hay = [formatRequestNo(r.request_no), r.request_no, r.title, r.po_number, r.warehouse, r.asset_type, r.raised_by_email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  // In the inbox, requests waiting on me come first.
  const filtered = tab === 'inbox'
    ? [...filteredUnsorted].sort((a, b) => Number(needsMyAction(b)) - Number(needsMyAction(a)))
    : filteredUnsorted;
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginatedRequests = filtered.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);
  const pageRange: (number | '...')[] = [];
  for (let page = Math.max(1, safeCurrentPage - 2); page <= Math.min(totalPages, safeCurrentPage + 2); page++) {
    pageRange.push(page);
  }
  if (pageRange[0] > 1) pageRange.unshift('...');
  if (pageRange[0] !== 1 && totalPages > 0) pageRange.unshift(1);
  if (pageRange[pageRange.length - 1] < totalPages) pageRange.push('...');
  if (pageRange[pageRange.length - 1] !== totalPages && totalPages > 0) pageRange.push(totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, q, statusFilter, receiptFilter, rowsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages, 1)));
  }, [totalPages]);

  const actionCount = rows.filter((r) => isRelevant(r) && needsMyAction(r)).length;
  const mineOpenCount = rows.filter((r) => r.raised_by === profile?.id && r.status === 'open').length;

  const stageLabel = (r: RequestRow) => {
    try {
      const flow = getFlow(r.type);
      const s = flow.find((x) => x.key === r.current_stage);
      return s ? `${s.label} · ${s.dept}` : r.current_stage || 'Unknown Stage';
    } catch (e) {
      return r.current_stage || 'Unknown';
    }
  };

  const safeFormatDistance = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!dateStr || isNaN(d.getTime())) return '-';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className='p-6 pt-3 space-y-6 min-h-screen bg-white w-full'>
      <div className='flex items-center justify-between border-b border-slate-100 pb-6'>
        <div className='space-y-1'>
          <h2 className='text-2xl font-black text-slate-800 tracking-tight'>Asset Master Management</h2>
          <p className='text-sm font-medium text-slate-400'>Monitor and manage hardware procurement and movement requests.</p>
        </div>
        <div className='flex items-center gap-3'>
          {!isReporter && (
            <Button onClick={() => setCreateOpen(true)} className='gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold'>
              <Plus className='w-4 h-4' /> New Request
            </Button>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200'>
          <button
            onClick={() => setTab('inbox')}
            className={cn(
              'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all',
              tab === 'inbox' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
            )}
          >
            <Inbox className='w-4 h-4' /> Inbox
            {actionCount > 0 && (
              <span className='ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] leading-[18px] text-center tracking-normal' title={`${actionCount} waiting for you`}>
                {actionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('mine')}
            className={cn(
              'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all',
              tab === 'mine' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
            )}
          >
            <User className='w-4 h-4' /> My Requests
            {mineOpenCount > 0 && (
              <span className='ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-300 text-slate-700 text-[10px] leading-[18px] text-center tracking-normal' title={`${mineOpenCount} still open`}>
                {mineOpenCount}
              </span>
            )}
          </button>
          {!isReporter && (
            <button
              onClick={() => { setTab('drafts'); checkDraft(); }}
              className={cn(
                'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all',
                tab === 'drafts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
              )}
            >
              <FileEdit className='w-4 h-4' /> Drafts
              {draft && <div className='w-2 h-2 rounded-full bg-blue-500 animate-pulse' />}
            </button>
          )}
          {(
            <button
              onClick={() => setTab('all')}
              className={cn(
                'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all',
                tab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
              )}
            >
              <Layers className='w-4 h-4' /> All
            </button>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {tab === 'drafts' && draft && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeleteConfirmOpen(true)}
              className='text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-10 px-4 rounded-xl mr-2'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Delete All Drafts
            </Button>
          )}
          {tab !== 'inbox' && tab !== 'drafts' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
              aria-label='Filter requests by status'
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All statuses</option>
              <option value='open'>Open</option>
              <option value='closed'>Closed</option>
              <option value='approved'>Approved</option>
              <option value='rejected'>Rejected</option>
              <option value='revoked'>Revoked</option>
            </select>
          )}
          {tab !== 'drafts' && (
            <select
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value as ReceiptIdentity | 'all')}
              aria-label='Filter requests by receipt outcome'
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All receipt types</option>
              <option value='Standard'>Standard</option>
              <option value='Missing Serial'>Missing Serial</option>
              <option value='Different Serial Received'>Different Serial Received</option>
              <option value='Damaged asset'>Damaged asset</option>
            </select>
          )}
          <div className='relative'>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search by REQ no., subject, PO...'
              className='w-72 pl-10 h-10 rounded-xl border-slate-200 focus-visible:ring-blue-500'
            />
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          </div>
        </div>
      </div>

      <div className='bg-white border-y border-slate-100 overflow-x-auto relative'>
        <div className='min-w-[1290px]'>
          <div className={cn('sticky top-0 z-20 gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b bg-slate-50/80 backdrop-blur-md shadow-sm', ROW_GRID)}>
            <div>Request No.</div>
            <div className='col-span-3'>Subject</div>
            <div className='col-span-1'>PO Number</div>
            <div className='col-span-1'>Warehouse</div>
            <div className='col-span-1'>Asset Type</div>
            <div className='col-span-1 text-center'>Qty</div>
            <div className='col-span-2'>Requested By</div>
            <div className='col-span-1'>Requested At</div>
            <div className='col-span-1'>Pending At</div>
            <div className='col-span-1 text-right'>Status</div>
          </div>

          <div className='overflow-y-auto custom-scrollbar-thin' style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
            {loading ? (
          <TableSkeleton rows={6} columns={7} label='Loading requests…' />
        ) : tab === 'drafts' ? (
          draft ? (
            <div className='divide-y divide-slate-100'>
              <div
                className={cn('w-full text-left gap-3 px-6 py-5 hover:bg-blue-50/30 transition-all group border-l-4 border-l-blue-500/30 hover:border-l-blue-500 cursor-pointer', ROW_GRID)}
                onClick={() => setCreateOpen(true)}
              >
                <div className='min-w-0 flex items-center text-xs font-bold text-slate-400 italic'>Draft</div>
                <div className='col-span-3 min-w-0'>
                  <div className='font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors'>
                    {draft.title || 'Untitled Draft Request'}
                  </div>
                  <div className='text-[11px] font-medium text-slate-400 mt-1 truncate'>
                    Draft · {draft.poNumber || '-'}
                    {draft.warehouse ? ` · ${draft.warehouse}` : ''}
                  </div>
                  <div className='text-[9px] font-bold text-blue-500 mt-2 uppercase tracking-tight'>
                    Saved in browser
                  </div>
                </div>
                <div className='col-span-1 min-w-0 text-xs font-semibold text-slate-600 flex items-center'>
                  <span className='truncate'>{draft.poNumber || '-'}</span>
                </div>
                <div className='col-span-1 min-w-0 text-xs text-slate-600 flex items-center'>
                  <span className='truncate'>{draft.warehouse || '-'}</span>
                </div>
                <div className='col-span-1 min-w-0 text-xs text-slate-600 flex items-center'>
                  <span className='truncate'>{draft.assetType || '-'}</span>
                </div>
                <div className='col-span-1 text-sm font-black text-slate-700 text-center flex items-center justify-center'>
                  {draft.quantity || draft.serialEntries?.length || 1}
                </div>
                <div className='col-span-2 min-w-0 text-[11px] font-medium text-slate-500 flex flex-col justify-center'>
                  <div className='truncate text-slate-900 font-black'>{profile?.email || 'Drafting User'}</div>
                  <div className='truncate text-[10px] uppercase tracking-wider text-slate-400 mt-0.5'>{profile?.department || 'Browser Storage'}</div>
                </div>
                <div className='col-span-1 min-w-0 text-[10px] font-bold text-slate-400 flex flex-col justify-center'>
                  <span className='truncate uppercase'>Local Draft</span>
                  <span className='truncate text-blue-600 mt-0.5'>Active Session</span>
                </div>
                <div className='col-span-1 min-w-0 flex items-center'>
                  <Badge variant='outline' className='max-w-full bg-blue-50 text-blue-600 border-blue-100 font-bold text-[9px] px-2 py-1 rounded-lg uppercase'>
                    <span className='truncate'>Drafting</span>
                  </Badge>
                </div>
                <div className='col-span-1 text-right flex items-center justify-end gap-2'>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen(true); }}
                        className='text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-lg'
                        title="Delete Draft"
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                   </div>
                   <Badge className="bg-slate-100 text-slate-500 border-0 capitalize font-black text-[9px] tracking-widest px-3 py-1 rounded-full">
                    Draft
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className='px-6 py-40 text-center'>
              <div className='w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4'>
                <FileEdit className='w-10 h-10 text-slate-200' />
              </div>
              <p className='text-sm font-bold text-slate-400 uppercase tracking-widest'>No drafts found in this browser</p>
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className='px-6 py-32 text-center space-y-3'>
            <div className='w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto'>
              {tab === 'inbox' && !q ? <CheckCircle2 className='w-10 h-10 text-green-300' /> : <Inbox className='w-10 h-10 text-slate-200' />}
            </div>
            <p className='text-sm font-bold text-slate-500'>
              {q
                ? `No requests match "${q}".`
                : tab === 'inbox'
                  ? "You're all caught up. Nothing is waiting for you."
                  : tab === 'mine'
                    ? "You haven't raised any requests yet."
                    : 'No requests yet.'}
            </p>
            {q && (
              <Button variant='outline' size='sm' onClick={() => setQ('')}>Clear search</Button>
            )}
            {!q && tab === 'mine' && !isReporter && (
              <Button size='sm' onClick={() => setCreateOpen(true)} className='gap-2'><Plus className='w-4 h-4' /> New Request</Button>
            )}
          </div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {paginatedRequests.map((r) => {
              const mine = needsMyAction(r);
              const prog = stageProgress(r);
              return (
              <button
                key={r.id || Math.random()}
                onClick={() => setDetailId(r.id)}
                aria-label={`${r.title || 'Request'}${receiptIdentities[r.id] ? `, receipt outcome ${receiptIdentities[r.id]}` : ''}${mine ? ', waiting for your action' : ''}`}
                className={cn(
                  'w-full text-left gap-3 px-6 py-4 transition-all group border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
                  ROW_GRID,
                  mine ? 'bg-amber-50/60 border-l-amber-500 hover:bg-amber-50' : 'border-l-transparent hover:bg-blue-50/30 hover:border-l-blue-500'
                )}
              >
                <div className='min-w-0 flex items-center'>
                  <span className='font-mono text-xs font-bold text-blue-600 truncate'>
                    {formatRequestNo(r.request_no) || '-'}
                  </span>
                </div>
                <div className='col-span-3 min-w-0'>
                  <div className='font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors flex items-center gap-2'>
                    {mine && <BellRing className='w-3.5 h-3.5 text-amber-500 flex-shrink-0' aria-hidden />}
                    <span className='truncate'>{r.title || (r.type ? REQUEST_TYPE_LABELS[r.type] : 'Untitled Request')}</span>
                  </div>
                  <div className='text-[11px] font-medium text-slate-400 mt-0.5 truncate flex items-center gap-1.5'>
                    {r.type ? REQUEST_TYPE_LABELS[r.type] : 'General'}
                    {receiptIdentities[r.id] && (
                      <Badge
                        variant='outline'
                        className={cn(
                          'shrink-0 text-[9px] px-1.5 py-0 rounded-md',
                          receiptIdentities[r.id] === 'Standard' && 'border-green-200 bg-green-50 text-green-700',
                          receiptIdentities[r.id] === 'Missing Serial' && 'border-amber-200 bg-amber-50 text-amber-700',
                          receiptIdentities[r.id] === 'Different Serial Received' && 'border-orange-200 bg-orange-50 text-orange-700',
                          receiptIdentities[r.id] === 'Damaged asset' && 'border-red-200 bg-red-50 text-red-700'
                        )}
                      >
                        {receiptIdentities[r.id]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='col-span-1 min-w-0 text-xs font-semibold text-slate-600 flex items-center truncate'>
                  <span className='truncate'>{r.po_number || '-'}</span>
                </div>
                <div className='col-span-1 min-w-0 text-xs text-slate-600 flex items-center'>
                  <span className='truncate'>{r.warehouse || '-'}</span>
                </div>
                <div className='col-span-1 min-w-0 text-xs text-slate-600 flex items-center'>
                  <span className='truncate'>{r.asset_type || '-'}</span>
                </div>
                <div className='col-span-1 text-sm font-black text-slate-600 text-center flex items-center justify-center'>
                  {r.quantity ?? '-'}
                </div>
                <div className='col-span-2 min-w-0 text-[11px] font-medium text-slate-500 flex flex-col justify-center'>
                  <div className='truncate text-slate-700 font-bold'>{r.raised_by_email || 'Unknown User'}</div>
                  <div className='truncate text-[10px] uppercase tracking-widest opacity-60 mt-0.5'>{r.raised_dept || 'General'}</div>
                </div>
                <div className='col-span-1 min-w-0 text-[11px] font-medium text-slate-500 flex flex-col justify-center'>
                  <div className='truncate'>{fmtDateTime(r.created_at)}</div>
                  <div className='truncate text-[10px] text-slate-400'>{safeFormatDistance(r.created_at)}</div>
                </div>
                <div className='col-span-1 min-w-0 flex items-center'>
                  {r.status === 'open' ? (
                    <div className='min-w-0 w-full space-y-1' title={`Step ${prog.step} of ${prog.total}: ${stageLabel(r)}`}>
                      <Badge
                        variant='outline'
                        className={cn('font-bold text-[10px] px-2 py-1 rounded-lg max-w-full', mine ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200')}
                      >
                        <span className='truncate block max-w-[110px]'>{mine ? 'You' : r.current_stage_dept || '-'}</span>
                      </Badge>
                      <div className='flex gap-0.5' aria-hidden>
                        {Array.from({ length: prog.total }).map((_, i) => (
                          <span key={i} className={cn('h-1 flex-1 rounded-full', i < prog.step - 1 ? 'bg-green-500' : i === prog.step - 1 ? 'bg-amber-500' : 'bg-slate-200')} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className='text-[11px] text-slate-400'>—</span>
                  )}
                </div>
                <div className='col-span-1 text-right flex items-center justify-end'>
                  <Badge className={cn(
                    "border-0 capitalize font-black text-[9px] tracking-widest px-3 py-1 rounded-full shadow-sm",
                    r.status === 'open' ? 'bg-blue-500 text-white' :
                    r.status === 'approved' ? 'bg-green-500 text-white' :
                    r.status === 'rejected' ? 'bg-red-500 text-white' :
                    'bg-slate-200 text-slate-700'
                  )}>
                    {r.status || 'Pending'}
                  </Badge>
                </div>
              </button>
              );
            })}
          </div>
        )}
        {tab !== 'drafts' && !loading && filtered.length > 0 && (
          <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600 border-t border-slate-100'>
            <div className='flex items-center gap-2'>
              <span>
                Showing {((safeCurrentPage - 1) * rowsPerPage) + 1} to {Math.min(safeCurrentPage * rowsPerPage, filtered.length)} of {filtered.length} requests
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label='Requests per page'
                className='h-7 rounded border border-slate-300 bg-white px-2 text-xs'
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 px-2'
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Previous
              </Button>
              {pageRange.map((page, index) => (
                <Button
                  key={`${page}-${index}`}
                  variant={safeCurrentPage === page ? 'default' : 'outline'}
                  size='sm'
                  className='h-7 min-w-7 px-2'
                  disabled={typeof page !== 'number'}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant='outline'
                size='sm'
                className='h-7 px-2'
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>


      <Suspense fallback={null}>
      {createOpen && (
        <CreateRequestDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => {
            setCreateOpen(false);
            setDetailId(id);
            load({ background: true });
          }}
        />
      )}
      {detailId && (
        <RequestDetailDialog
          requestId={detailId}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
          onChanged={() => load({ background: true })}
        />
      )}
      </Suspense>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your unsaved request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearDraft()} className='bg-red-600 hover:bg-red-700 text-white'>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
