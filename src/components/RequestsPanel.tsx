import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Inbox, User, Layers, Search } from 'lucide-react';
import { REQUEST_TYPE_LABELS, getFlow, RequestType, RequestStatus } from '@/lib/requestFlows';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CreateRequestDialog from './CreateRequestDialog';
import RequestDetailDialog from './RequestDetailDialog';

interface RequestRow {
  id: string;
  type: RequestType;
  status: RequestStatus;
  title: string | null;
  current_stage: string;
  current_stage_dept: string;
  raised_by: string;
  raised_by_email: string | null;
  raised_dept: string;
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'mine' | 'all'>('inbox');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const isReporter = profile?.role === 'Reporter';
  const isSuperAdmin = profile?.role === 'Super Admin';

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching requests:', error);
        toast.error('Failed to load requests');
        setRows([]);
      } else {
        setRows((data as RequestRow[]) || []);
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
    const ch = supabase
      .channel('requests-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (focusRequestId) {
      setDetailId(focusRequestId);
      onFocusHandled?.();
    }
  }, [focusRequestId, onFocusHandled]);

  const filtered = rows.filter((r) => {
    if (tab === 'mine' && r.raised_by !== profile?.id) return false;
    if (tab === 'inbox') {
      const mine = r.raised_by === profile?.id;
      const forDept = profile?.department && r.current_stage_dept === profile.department;
      if (!mine && !forDept && !isSuperAdmin) return false;
      if (r.status !== 'open') return false;
    }
    if (q) {
      const term = q.toLowerCase();
      const hay = [r.title, r.po_number, r.warehouse, r.asset_type, r.raised_by_email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

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
    <div className='p-8 space-y-8 min-h-screen bg-white w-full'>
      <div className='flex items-center justify-between border-b border-slate-100 pb-6'>
        <div className='space-y-1'>
          <h2 className='text-2xl font-black text-slate-800 tracking-tight'>Approvals Management</h2>
          <p className='text-sm font-medium text-slate-400'>Monitor and manage hardware procurement and movement requests.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
            System Active
          </Badge>
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
          </button>
          <button
            onClick={() => setTab('mine')}
            className={cn(
              'px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all',
              tab === 'mine' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
            )}
          >
            <User className='w-4 h-4' /> My Requests
          </button>
          {isSuperAdmin && (
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
          <div className='relative'>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search requests...'
              className='w-72 pl-10 h-10 rounded-xl border-slate-200 focus-visible:ring-blue-500'
            />
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          </div>
        </div>
      </div>

      <div className='bg-white border-y border-slate-100 overflow-hidden relative'>
        <div className='sticky top-0 z-20 grid grid-cols-12 gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b bg-slate-50/80 backdrop-blur-md shadow-sm'>
          <div className='col-span-3'>Request Details</div>
          <div className='col-span-3'>Workflow Stage</div>
          <div className='col-span-2'>Raiser Information</div>
          <div className='col-span-1 text-center'>Qty</div>
          <div className='col-span-2'>Activity</div>
          <div className='col-span-1 text-right'>Status</div>
        </div>

        {loading ? (
          <div className='px-6 py-32 text-center'>
            <div className='inline-block w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4'></div>
            <p className='text-sm font-bold text-slate-400 uppercase tracking-widest'>Syncing with server...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className='px-6 py-40 text-center'>
            <div className='w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Inbox className='w-10 h-10 text-slate-200' />
            </div>
            <p className='text-sm font-bold text-slate-400 uppercase tracking-widest'>No requests found in this view</p>
          </div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {filtered.map((r) => (
              <button
                key={r.id || Math.random()}
                onClick={() => setDetailId(r.id)}
                className='w-full text-left grid grid-cols-12 gap-3 px-8 py-5 hover:bg-blue-50/30 transition-all group border-l-4 border-l-transparent hover:border-l-blue-500'
              >
                <div className='col-span-3 min-w-0'>
                  <div className='font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors'>
                    {r.title || (r.type ? REQUEST_TYPE_LABELS[r.type] : 'Untitled Request')}
                  </div>
                  <div className='text-[11px] font-medium text-slate-400 mt-1 truncate'>
                    {r.type ? REQUEST_TYPE_LABELS[r.type] : 'General'}
                    {r.po_number ? ` · PO ${r.po_number}` : ''}
                  </div>
                </div>
                <div className='col-span-3 flex items-center'>
                   <Badge variant='outline' className='bg-slate-50 text-slate-600 border-slate-200 font-bold text-[10px] px-3 py-1 rounded-lg'>
                     {stageLabel(r)}
                   </Badge>
                </div>
                <div className='col-span-2 text-[11px] font-medium text-slate-500 flex flex-col justify-center'>
                  <div className='truncate text-slate-700 font-bold'>{r.raised_by_email || 'Unknown User'}</div>
                  <div className='truncate text-[10px] uppercase tracking-widest opacity-60 mt-0.5'>{r.raised_dept || 'General'}</div>
                </div>
                <div className='col-span-1 text-sm font-black text-slate-600 text-center flex items-center justify-center'>
                  {r.quantity ?? '-'}
                </div>
                <div className='col-span-2 text-[11px] font-medium text-slate-400 flex items-center'>
                  {safeFormatDistance(r.created_at)}
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
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <CreateRequestDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => {
            setCreateOpen(false);
            setDetailId(id);
            load();
          }}
        />
      )}
      {detailId && (
        <RequestDetailDialog
          requestId={detailId}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
