import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { initSupabaseClient, getSupabase } from '../services/supabaseClient.ts';
import { setAuthToken, apiRequest } from '../services/apiClient.ts';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  streak_count?: number;
}

export interface UserStats {
  total_xp: number;
  streak_days: number;
  completed_courses_count: number;
  enrolled_courses_count: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  stats: UserStats | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  openAuthModal: (mode?: 'signin' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'forgot';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup' | 'forgot' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await apiRequest<{ profile: UserProfile; stats: UserStats }>('/api/profile');
      if (data?.profile) {
        setProfile(data.profile);
      }
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      try {
        const { client, configured } = await initSupabaseClient();
        if (!mounted) return;

        setIsConfigured(configured);

        if (client && configured) {
          const { data: { session: currentSession } } = await client.auth.getSession();
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setAuthToken(currentSession?.access_token ?? null);
          }

          const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setAuthToken(newSession?.access_token ?? null);
            if (newSession?.access_token) {
              refreshProfile();
            } else {
              setProfile(null);
              setStats(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setupAuth();

    return () => {
      mounted = false;
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (session?.access_token) {
      refreshProfile();
    }
  }, [session, refreshProfile]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase is not configured. Please connect your database in the configuration panel.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    setSession(data.session);
    setUser(data.user);
    setAuthToken(data.session.access_token);
    closeAuthModal();
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase is not configured. Please connect your database in the configuration panel.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setAuthToken(data.session.access_token);
      closeAuthModal();
      return { needEmailConfirm: false };
    }

    // Email verification required
    return { needEmailConfirm: true };
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setStats(null);
    setAuthToken(null);
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        stats,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
