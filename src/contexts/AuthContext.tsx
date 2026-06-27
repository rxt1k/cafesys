import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Admin } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  admin: Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdmin(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdmin(session.user.id);
      } else {
        setAdmin(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchAdmin(userId: string, retries = 3) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await fetchAdmin(userId, retries - 1);
          return;
        }
        setAdmin(null);
        setLoading(false);
      } else {
        setAdmin(data);
        setLoading(false);
        // Update last login (non-blocking)
        supabase
          .from('admins')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId)
          .then();
      }
    } catch {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchAdmin(userId, retries - 1);
        return;
      }
      setAdmin(null);
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { error };
    }

    // Wait for fetchAdmin to succeed and verify they are indeed an admin
    let adminRecord = null;
    for (let i = 0; i < 3; i++) {
      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();

      if (!adminErr && adminData) {
        adminRecord = adminData;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!adminRecord) {
      await supabase.auth.signOut();
      return { error: new Error('User is not authorized as an active admin.') };
    }

    setAdmin(adminRecord);
    // Update last login (non-blocking)
    supabase
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)
      .then();

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        admin,
        loading,
        signIn,
        signOut,
        isAdmin: !!admin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
