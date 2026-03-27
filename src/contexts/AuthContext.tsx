// AuthContext.tsx (updated)
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAccessDenied: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (attributes: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const sessionIdRef = useRef<string>(window.name || crypto.randomUUID());
  if (!window.name) {
    window.name = sessionIdRef.current;
  }

  const upsertPresence = async (currentUser: User | null) => {
    if (!currentUser) return;
    await supabase.from('active_users').upsert({
      user_id: currentUser.id,
      session_id: sessionIdRef.current,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name || currentUser.email || '',
      status: 'online',
      last_seen: new Date().toISOString(),
    });
  };

  const clearPresence = async (currentUser: User | null) => {
    if (!currentUser) return;
    await supabase.from('active_users').delete().match({
      user_id: currentUser.id,
      session_id: sessionIdRef.current,
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAuthorization(session.user);
      } else {
        setIsAccessDenied(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session get error:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkAuthorization(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let heartbeat: number | null = null;

    if (user) {
      upsertPresence(user).catch(console.error);
      heartbeat = window.setInterval(() => {
        upsertPresence(user).catch(console.error);
      }, 15000);
    }

    const onUnload = () => {
      clearPresence(user).catch(console.error);
    };

    window.addEventListener('beforeunload', onUnload);

    return () => {
      if (heartbeat) window.clearInterval(heartbeat);
      clearPresence(user).catch(console.error);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [user]);

  const checkAuthorization = async (userToCheck: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, role, account_type')
        .eq('email', userToCheck.email)
        .single();

      if (error) {
        if ((error as any).code === 'PGRST116') {
          console.warn('User not found in users table, allowing authenticated access:', userToCheck.email);
          setIsAccessDenied(false);
          return;
        }
        console.warn('Authorization check error:', (error as any).message);
        setIsAccessDenied(false);
        return;
      }

      setIsAccessDenied(false);
    } catch (err) {
      console.error('Authorization check error:', err);
      setIsAccessDenied(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          ...(isLocalHost ? { redirectTo: window.location.origin } : {}),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const signOut = async () => {
    try {
      await clearPresence(user);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setIsAccessDenied(false);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const updateUser = async (attributes: any) => {
    try {
      const { data, error } = await supabase.auth.updateUser(attributes);
      if (error) throw error;
      setUser(data.user);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAccessDenied, signInWithGoogle, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};