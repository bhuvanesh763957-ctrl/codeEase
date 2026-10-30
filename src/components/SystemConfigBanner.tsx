import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SystemConfigBannerProps {
  onOpenSetupModal: () => void;
}

export const SystemConfigBanner: React.FC<SystemConfigBannerProps> = ({ onOpenSetupModal }) => {
  const { isConfigured, loading } = useAuth();

  if (loading || isConfigured) {
    return null;
  }

  return (
    <div className="w-full bg-[#1b1b1e] border-b border-amber-500/30 px-4 py-2.5 text-xs text-[#e4e1e6]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-medium text-white flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-amber-400" />
            Supabase Backend Connection Pending:
          </span>
          <span className="text-[#a1a1aa] hidden sm:inline">
            Connect your Supabase project with <code>SUPABASE_URL</code> & <code>SUPABASE_ANON_KEY</code> to enable live database persistence, authentication, and certificates.
          </span>
        </div>

        <button
          onClick={onOpenSetupModal}
          className="inline-flex items-center gap-1.5 rounded bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
        >
          View Setup & SQL Migration
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
