import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  user_id: string | null;
  target_dept: string | null;
  request_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  onBack: () => void;
  onOpenRequest: (requestId: string) => void;
}

export default function NotificationsPage({ onBack, onOpenRequest }: Props) {
  const { profile } = useUserProfile();
  const [items, setItems] = useState<Notification[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;
  const visible = onlyUnread ? items.filter((n) => !n.read_at) : items;

  const load = async () => {
    if (!profile?.id) return;
    let query = supabase.from('notifications').select('*');
    if (profile.role !== 'Super Admin' && profile.department !== 'Administrators') {
      query = query.or(`user_id.eq.${profile.id},target_dept.eq.${profile.department}`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
      return;
    }
    setItems((data as Notification[]) || []);
  };

  useEffect(() => {
    load();
  }, [profile?.id, profile?.department, profile?.role]);

  const updateReadState = async (notification: Notification, readAt: string | null) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notification.id);
    if (error) {
      console.error('Failed to update notification:', error);
      toast.error('Failed to update notification');
      return;
    }
    setItems((prev) => prev.map((n) => n.id === notification.id ? { ...n, read_at: readAt } : n));
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: readAt }).in('id', ids);
    if (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all as read');
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || readAt })));
  };

  return (
    <div className='mx-auto w-full max-w-5xl px-6 py-6'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button variant='outline' size='icon' onClick={onBack} title='Back'>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h2 className='text-xl font-semibold'>All notifications</h2>
        </div>
        {unread > 0 && (
          <Button variant='outline' size='sm' onClick={markAllRead}>Mark all read</Button>
        )}
      </div>
      <div className='mb-4 flex items-center gap-2'>
        <Button size='sm' variant={onlyUnread ? 'outline' : 'default'} onClick={() => setOnlyUnread(false)}>All</Button>
        <Button size='sm' variant={onlyUnread ? 'default' : 'outline'} onClick={() => setOnlyUnread(true)}>
          Unread{unread > 0 ? ` (${unread})` : ''}
        </Button>
      </div>
      <div className='overflow-hidden rounded-lg border bg-card'>
        {visible.length === 0 && (
          <div className='px-4 py-10 text-center text-sm text-muted-foreground'>
            {onlyUnread ? 'No unread notifications' : 'No notifications yet'}
          </div>
        )}
        {visible.map((n) => (
          <div key={n.id} className={`border-b p-4 last:border-0 ${!n.read_at ? 'bg-primary/5' : ''}`}>
            <div className='flex items-start gap-3'>
              {!n.read_at && <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary' />}
              <div className='min-w-0 flex-1'>
                <button
                  type='button'
                  className='text-left text-sm font-medium whitespace-normal break-words hover:underline'
                  onClick={() => {
                    if (!n.read_at) void updateReadState(n, new Date().toISOString());
                    if (n.request_id) onOpenRequest(n.request_id);
                  }}
                >
                  {n.title}
                </button>
                {n.body && <div className='mt-1 text-sm text-muted-foreground whitespace-normal break-words'>{n.body}</div>}
                <div className='mt-2 flex items-center justify-between gap-2'>
                  {n.read_at ? (
                    <button type='button' onClick={() => void updateReadState(n, null)} className='text-xs text-primary hover:underline'>
                      Mark unread
                    </button>
                  ) : <span />}
                  <span className='text-xs text-muted-foreground'>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
