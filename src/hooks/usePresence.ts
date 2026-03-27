import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  email: string;
  name: string;
  avatar_url?: string;
  online_at: string;
}

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setOnlineUsers([]);
      return;
    }

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        const seen = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            const email = p.email;
            if (email && !seen.has(email)) {
              seen.add(email);
              users.push({
                email: p.email,
                name: p.name,
                avatar_url: p.avatar_url,
                online_at: p.online_at,
              });
            }
          });
        });
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const trackData = {
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || '',
            online_at: new Date().toISOString(),
          };
          await channel.track(trackData);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return onlineUsers;
};
