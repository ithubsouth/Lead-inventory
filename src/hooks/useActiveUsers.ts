// hooks/useActiveUsers.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveUser {
  user_id: string;
  session_id: string;
  email: string;
  full_name: string;
  last_seen: string;
}

export const useActiveUsers = () => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActiveUsers([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    const fetchActiveUsers = async () => {
      const { data, error } = await supabase
        .from('active_users')
        .select('*')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // last 5 minutes

      if (error) {
        console.error('Error fetching active users:', error);
      } else {
        setActiveUsers(data || []);
      }
      setLoading(false);
    };

    fetchActiveUsers();

    // Realtime subscription on the table
    const channel = supabase
      .channel('active-users-db')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_users',
        },
        (payload) => {
          console.log('Active users changed:', payload);
          fetchActiveUsers(); // Refresh list on any change
        }
      )
      .subscribe();

    // Heartbeat: update your own last_seen every 20 seconds
    const heartbeat = setInterval(async () => {
      if (user) {
        await supabase.from('active_users').upsert({
          user_id: user.id,
          session_id: window.name || 'default',
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email || '',
          last_seen: new Date().toISOString(),
        });
      }
    }, 20000);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const otherUsers = activeUsers.filter(u => u.user_id !== user?.id);

  return { activeUsers, otherUsers, loading };
};