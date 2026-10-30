import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured, isSupabaseAdminConfigured } from './env.ts';

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.');
  }

  if (!publicClient) {
    publicClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return publicClient;
};

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!isSupabaseAdminConfigured()) {
    // If service role is not provided but anon key is, fallback to anon with a warning,
    // though privileged operations requiring service role may fail RLS policies.
    if (isSupabaseConfigured()) {
      return getSupabaseClient();
    }
    throw new Error('Supabase Admin is not configured. Please set SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!adminClient) {
    adminClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
};
