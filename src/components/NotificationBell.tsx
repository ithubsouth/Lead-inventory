import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  onOpenRequest: (requestId: string) => void;
}

export function NotificationBell({ onOpenRequest }: Props) {
  const { profile } = useUserProfile();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data as Notification[]) || []);
  };

  useEffect(() => {
    if (!profile?.id) return;
    load();
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification;
          const forMe =
            n.user_id === profile.id ||
            (n.target_dept && n.target_dept === profile.department);
          if (forMe) {
            setItems((prev) => [n, ...prev].slice(0, 30));
            toast(n.title, { description: n.body || undefined });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.department]);

  const markRead = async (n: Notification) => {
    if (!n.read_at) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
    }
    if (n.request_id) {
      onOpenRequest(n.request_id);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary'
          title='Notifications'
        >
          <Bell className='w-5 h-5' />
          {unread > 0 && (
            <span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center'>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-80 p-0'>
        <div className='flex items-center justify-between px-3 py-2 border-b'>
          <div className='font-semibold text-sm'>Notifications</div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className='text-xs text-primary hover:underline'
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className='max-h-80'>
          {items.length === 0 && (
            <div className='px-3 py-6 text-center text-sm text-muted-foreground'>
              No notifications yet
            </div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted/50 ${
                !n.read_at ? 'bg-primary/5' : ''
              }`}
            >
              <div className='flex items-start gap-2'>
                {!n.read_at && (
                  <span className='mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0' />
                )}
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium truncate'>{n.title}</div>
                  {n.body && (
                    <div className='text-xs text-muted-foreground line-clamp-2'>{n.body}</div>
                  )}
                  <div className='text-[10px] text-muted-foreground mt-1'>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
