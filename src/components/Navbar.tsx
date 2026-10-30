import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Code2,
  Flame,
  Award,
  Trophy,
  Terminal,
  BookOpen,
  User as UserIcon,
  LogOut,
  Database,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSetupModal: () => void;
  onOpenProfileModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSetupModal,
  onOpenProfileModal,
}) => {
  const { user, profile, stats, signOut, openAuthModal, isConfigured } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab('courses')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9] text-white shadow-sm shadow-[#6d28d9]/30">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white flex items-center gap-1.5 text-base">
                CodeEase
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
              </span>
            </div>
          </button>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('courses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'courses' || currentTab === 'level'
                  ? 'bg-[#1f1f22] text-[#d3bbff] border border-[#3f3f46]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Courses
            </button>
            <button
              onClick={() => onSelectTab('playground')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'playground'
                  ? 'bg-[#1f1f22] text-[#d3bbff] border border-[#3f3f46]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Sandbox
            </button>
            <button
              onClick={() => onSelectTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'leaderboard'
                  ? 'bg-[#1f1f22] text-[#d3bbff] border border-[#3f3f46]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </button>
            <button
              onClick={() => onSelectTab('certificates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'certificates'
                  ? 'bg-[#1f1f22] text-[#d3bbff] border border-[#3f3f46]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Certificates
            </button>
          </nav>
        </div>

        {/* Right side telemetry & auth */}
        <div className="flex items-center gap-3">
          {/* Database Setup indicator */}
          <button
            onClick={onOpenSetupModal}
            title={isConfigured ? 'Database connected' : 'Database configuration required'}
            className="flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#111114] px-2.5 py-1 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-[#a78bfa]" />
            <span className="hidden sm:inline">DB Setup</span>
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'
              }`}
            />
          </button>

          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Daily Streak */}
              <div
                title="Daily Activity Streak"
                className="flex items-center gap-1 rounded-md border border-[#27272a] bg-[#111114] px-2.5 py-1 text-xs font-mono font-medium text-amber-400"
              >
                <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>{stats?.streak_days ?? 0}d</span>
              </div>

              {/* Total XP */}
              <div
                title="Verified Server XP"
                className="flex items-center gap-1 rounded-md border border-[#27272a] bg-[#111114] px-2.5 py-1 text-xs font-mono font-medium text-[#d3bbff]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
                <span>{stats?.total_xp ?? 0} XP</span>
              </div>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-md border border-[#27272a] bg-[#18181b] p-1 pr-2 text-xs text-white hover:border-[#3f3f46] transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6d28d9] font-medium text-white text-[11px]">
                    {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate text-xs font-medium">
                    {profile?.full_name || 'My Profile'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-[#71717a]" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-lg border border-[#27272a] bg-[#18181b] p-1.5 shadow-xl z-50 text-xs"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-2.5 py-2 border-b border-[#27272a] mb-1">
                      <p className="font-semibold text-white truncate">{profile?.full_name || 'Learner'}</p>
                      <p className="text-[11px] text-[#71717a] truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={onOpenProfileModal}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[#ccc3d7] hover:bg-[#27272a] hover:text-white"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-[#a78bfa]" />
                      Profile & Progress
                    </button>

                    <button
                      onClick={() => onSelectTab('certificates')}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[#ccc3d7] hover:bg-[#27272a] hover:text-white"
                    >
                      <Award className="h-3.5 w-3.5 text-emerald-400" />
                      My Certificates ({stats?.completed_courses_count ?? 0})
                    </button>

                    <div className="my-1 border-t border-[#27272a]" />

                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('signin')}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[#ccc3d7] hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="rounded-md bg-[#6d28d9] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm shadow-[#6d28d9]/30 hover:bg-[#8b5cf6] transition-all active:scale-[0.98]"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden border-t border-[#27272a] bg-[#111114] px-4 py-2 justify-around text-xs">
        <button
          onClick={() => onSelectTab('courses')}
          className={`flex items-center gap-1 py-1 px-2 rounded ${
            currentTab === 'courses' ? 'text-[#d3bbff] font-medium' : 'text-[#a1a1aa]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Courses
        </button>
        <button
          onClick={() => onSelectTab('playground')}
          className={`flex items-center gap-1 py-1 px-2 rounded ${
            currentTab === 'playground' ? 'text-[#d3bbff] font-medium' : 'text-[#a1a1aa]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Sandbox
        </button>
        <button
          onClick={() => onSelectTab('leaderboard')}
          className={`flex items-center gap-1 py-1 px-2 rounded ${
            currentTab === 'leaderboard' ? 'text-[#d3bbff] font-medium' : 'text-[#a1a1aa]'
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          Ranks
        </button>
        <button
          onClick={() => onSelectTab('certificates')}
          className={`flex items-center gap-1 py-1 px-2 rounded ${
            currentTab === 'certificates' ? 'text-[#d3bbff] font-medium' : 'text-[#a1a1aa]'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          Certificates
        </button>
      </div>
    </header>
  );
};
