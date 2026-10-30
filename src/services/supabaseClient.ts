import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let isConfiguredState: boolean = false;
let configChecked: boolean = false;

export interface SystemConfig {
  supabaseConfigured: boolean;
  supabaseAdminConfigured: boolean;
  judge0Configured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
}

export const initSupabaseClient = async (): Promise<{ client: SupabaseClient | null; configured: boolean }> => {
  if (client) {
    return { client, configured: isConfiguredState };
  }

  // Check frontend env vars first
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    client = createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    isConfiguredState = true;
    configChecked = true;
    return { client, configured: true };
  }

  // Otherwise query backend /api/config/status
  try {
    const res = await fetch('/api/config/status');
    if (res.ok) {
      const config: SystemConfig = await res.json();
      if (config.supabaseConfigured && config.supabaseUrl && config.supabaseAnonKey) {
        client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        isConfiguredState = true;
      }
    }
  } catch (err) {
    console.error('Failed to query server config status:', err);
  }

  configChecked = true;
  return { client, configured: isConfiguredState };
};

export const getSupabase = (): SupabaseClient | null => client;
export const isSupabaseReady = (): boolean => isConfiguredState;
