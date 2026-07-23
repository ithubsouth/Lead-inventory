import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  email: string | null;
  role: string | null;
  department: string | null;
  full_name: string | null;
}

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('id, email, role, department, full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile(data as UserProfile | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return { profile, loading };
}
