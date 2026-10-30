import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Judge0
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || '',
  JUDGE0_API_HOST: process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
};

export const isSupabaseAdminConfigured = (): boolean => {
  return Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_ROLE_KEY);
};

export const isJudge0Configured = (): boolean => {
  return Boolean(ENV.JUDGE0_API_URL && (ENV.JUDGE0_API_KEY || !ENV.JUDGE0_API_URL.includes('rapidapi')));
};
