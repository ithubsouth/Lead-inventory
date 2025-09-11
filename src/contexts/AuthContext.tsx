// In AuthProvider component
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAccessDenied: boolean; // New state to track access denial
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (attributes: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false); // New state

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session get error:', error);
        setIsAccessDenied(true); // Set access denied if session retrieval fails
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkAuthorization(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) checkAuthorization(session.user);
        else setIsAccessDenied(true); // Access denied if no user after event
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthorization = async (user: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('email, role, account_type')
      .eq('email', user.email)
      .single();
    if (error || !data) {
      setIsAccessDenied(true); // Set access denied if no valid user data
    } else {
      setIsAccessDenied(false); // Authorized if data exists
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        console.error('Google sign-in error:', error);
        setIsAccessDenied(true); // Set access denied on sign-in error
        throw error;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setIsAccessDenied(false); // Reset on sign-out
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