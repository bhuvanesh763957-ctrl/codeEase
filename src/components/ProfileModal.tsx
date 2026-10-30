import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../services/apiClient.ts';
import { X, User, Mail, Sparkles, Flame, Award, Calendar, Check, Save } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, stats, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName.trim(),
        }),
      });
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-[#27272a] bg-[#111114] p-6 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#71717a] hover:bg-[#18181b] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9] text-base font-bold text-white shadow-md">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{profile?.full_name || 'CodeEase Learner'}</h2>
            <p className="text-xs text-[#a1a1aa] font-mono">{user.email}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-center">
            <Sparkles className="mx-auto h-4 w-4 text-[#a78bfa] mb-1" />
            <span className="block font-mono text-sm font-bold text-white">{stats?.total_xp ?? 0}</span>
            <span className="text-[10px] text-[#71717a]">Verified XP</span>
          </div>
          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-center">
            <Flame className="mx-auto h-4 w-4 text-amber-500 mb-1" />
            <span className="block font-mono text-sm font-bold text-white">{stats?.streak_days ?? 0}d</span>
            <span className="text-[10px] text-[#71717a]">Streak</span>
          </div>
          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-center">
            <Award className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
            <span className="block font-mono text-sm font-bold text-white">{stats?.completed_courses_count ?? 0}</span>
            <span className="text-[10px] text-[#71717a]">Certificates</span>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#ccc3d7] mb-1">
              Display Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-[#71717a]" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full rounded-lg border border-[#27272a] bg-[#18181b] py-2 pl-9 pr-3 text-xs text-white placeholder-[#71717a] focus:border-[#a78bfa] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#ccc3d7] mb-1">
              Email Address (Protected by Supabase Auth)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-[#71717a]" />
              </div>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full rounded-lg border border-[#27272a] bg-[#18181b]/50 py-2 pl-9 pr-3 text-xs text-[#71717a] cursor-not-allowed"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Profile saved successfully!
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#27272a] px-3.5 py-1.5 text-xs text-[#a1a1aa] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[#6d28d9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
