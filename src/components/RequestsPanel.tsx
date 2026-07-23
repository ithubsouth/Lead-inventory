import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Inbox, User, Layers, Search } from 'lucide-react';
import { REQUEST_TYPE_LABELS, getFlow, RequestType, RequestStatus } from '@/lib/requestFlows';
import { formatDistanceToNow } from 'date-fns';
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
  const { profile } = useUserProfile();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'mine' | 'all'>('inbox');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const isReporter = profile?.role === 'Reporter';
  const isSuperAdmin = profile?.role === 'Super Admin';

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setRows((data as RequestRow[]) || []);
    setLoading(false);
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
    const s = getFlow(r.type).find((x) => x.key === r.current_stage);
    return s ? `${s.label} · ${s.dept}` : r.current_stage;
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value='inbox' className='gap-1'>
              <Inbox className='w-4 h-4' /> Inbox
            </TabsTrigger>
            <TabsTrigger value='mine' className='gap-1'>
              <User className='w-4 h-4' /> My Requests
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value='all' className='gap-1'>
                <Layers className='w-4 h-4' /> All
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search title, PO, warehouse...'
              className='w-64 pr-9'
            />
            <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
          </div>
          {!isReporter && (
            <Button onClick={() => setCreateOpen(true)} className='gap-1'>
              <Plus className='w-4 h-4' /> New Request
            </Button>
          )}
        </div>
      </div>

      <div className='rounded-lg border bg-card overflow-hidden'>
        <div className='grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/40'>
          <div className='col-span-3'>Request</div>
          <div className='col-span-3'>Current Stage</div>
          <div className='col-span-2'>Raiser</div>
          <div className='col-span-1'>Qty</div>
          <div className='col-span-2'>Age</div>
          <div className='col-span-1 text-right'>Status</div>
        </div>
        {loading && (
          <div className='px-4 py-8 text-center text-sm text-muted-foreground'>Loading...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className='px-4 py-10 text-center text-sm text-muted-foreground'>
            No requests found.
          </div>
        )}
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setDetailId(r.id)}
            className='w-full text-left grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors'
          >
            <div className='col-span-3'>
              <div className='font-medium text-sm truncate'>
                {r.title || REQUEST_TYPE_LABELS[r.type]}
              </div>
              <div className='text-xs text-muted-foreground'>
                {REQUEST_TYPE_LABELS[r.type]}
                {r.po_number ? ` · PO ${r.po_number}` : ''}
              </div>
            </div>
            <div className='col-span-3 text-sm truncate'>{stageLabel(r)}</div>
            <div className='col-span-2 text-xs text-muted-foreground truncate'>
              <div className='truncate'>{r.raised_by_email}</div>
              <div className='truncate'>{r.raised_dept}</div>
            </div>
            <div className='col-span-1 text-sm'>{r.quantity ?? '-'}</div>
            <div className='col-span-2 text-xs text-muted-foreground'>
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
            </div>
            <div className='col-span-1 text-right'>
              <Badge className={`${statusColors[r.status]} border-0 capitalize`}>{r.status}</Badge>
            </div>
          </button>
        ))}
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
