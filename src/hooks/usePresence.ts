// hooks/usePresence.ts
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  user_id: string;
  session_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  online_at: string;
}

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Stable session ID
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined' ? (window.name || `sess_${crypto.randomUUID()}`) : ''
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.name) {
      window.name = sessionIdRef.current;
    }

    if (!user?.id) {
      setOnlineUsers([]);
      return;
    }

    const sessionId = sessionIdRef.current;

    const currentPresence: PresenceUser = {
      user_id: user.id,
      session_id: sessionId,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || '',
      online_at: new Date().toISOString(),
    };

    // Cleanup previous channel safely
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn('Failed to remove old channel', e);
      }
      channelRef.current = null;
    }

    const channel = supabase.channel('active-users', {
      config: {
        presence: {
          key: `${user.id}-${sessionId}`,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!mountedRef.current) return;

        const state = channel.presenceState<any>();
        const allUsers: PresenceUser[] = [];

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => {
            allUsers.push({
              user_id: p.user_id,
              session_id: p.session_id,
              email: p.email,
              name: p.name,
              avatar_url: p.avatar_url,
              online_at: p.online_at || new Date().toISOString(),
            });
          });
        });

        console.log('Presence updated →', allUsers.length, 'users online');
        setOnlineUsers(allUsers);
      })
      .subscribe((status) => {
        console.log('Presence channel status:', status);

        if (status === 'SUBSCRIBED' && channelRef.current) {
          channelRef.current.track(currentPresence).catch(console.error);
        }
      });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (channelRef.current && mountedRef.current) {
        channelRef.current.track({
          ...currentPresence,
          online_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(heartbeat);

      if (channelRef.current) {
        try {
          channelRef.current.untrack().catch(() => {});
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          console.warn('Cleanup error', e);
        }
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return onlineUsers;
};