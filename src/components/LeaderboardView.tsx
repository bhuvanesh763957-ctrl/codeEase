import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Trophy, Medal, Sparkles, Award, User, RefreshCw } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string;
  total_xp: number;
  completed_courses_count: number;
}

export const LeaderboardView: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        leaderboard: LeaderboardUser[];
        currentUserRank: LeaderboardUser | null;
        totalParticipants: number;
      }>('/api/leaderboard');
      setLeaderboard(data.leaderboard || []);
      setCurrentUserRank(data.currentUserRank || null);
      setTotalParticipants(data.totalParticipants || 0);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Global Developer Leaderboard</h1>
          </div>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            Rankings calculated solely through server-verified level completions and quiz accuracy.
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs text-[#ccc3d7] hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Rankings
        </button>
      </div>

      {/* Current User Rank Spotlight */}
      {currentUserRank && (
        <div className="mb-6 rounded-xl border border-[#6d28d9]/40 bg-gradient-to-r from-[#6d28d9]/10 via-[#18181b] to-[#18181b] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6d28d9] font-mono text-sm font-bold text-white shadow-md">
              #{currentUserRank.rank}
            </div>
            <div>
              <p className="text-xs font-semibold text-white flex items-center gap-2">
                Your Standings ({currentUserRank.full_name})
                <span className="rounded bg-[#6d28d9]/20 px-2 py-0.5 text-[10px] font-mono text-[#d3bbff]">
                  Top {Math.max(1, Math.round((currentUserRank.rank / (totalParticipants || 1)) * 100))}%
                </span>
              </p>
              <p className="text-[11px] text-[#a1a1aa]">Keep solving levels to climb higher.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#d3bbff]">
                <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
                {currentUserRank.total_xp} XP
              </div>
              <p className="text-[10px] text-[#71717a]">
                {currentUserRank.completed_courses_count} Certs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
        <div className="grid grid-cols-12 border-b border-[#27272a] bg-[#111114] px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
          <div className="col-span-2 sm:col-span-1">Rank</div>
          <div className="col-span-7 sm:col-span-7">Learner</div>
          <div className="col-span-3 sm:col-span-2 text-right">Certs</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Total XP</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#71717a]">
            <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-[#a78bfa]" />
            Loading global rankings...
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="divide-y divide-[#27272a]">
            {leaderboard.map((item) => {
              const isCurrentUser = user && item.user_id === user.id;

              return (
                <div
                  key={item.user_id}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-xs transition-colors ${
                    isCurrentUser ? 'bg-[#6d28d9]/10' : 'hover:bg-[#1f1f22]'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 font-mono font-bold">
                    {item.rank === 1 ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Medal className="h-4 w-4 fill-amber-400 text-amber-400" />
                        1
                      </span>
                    ) : item.rank === 2 ? (
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Medal className="h-4 w-4 fill-zinc-300 text-zinc-300" />
                        2
                      </span>
                    ) : item.rank === 3 ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Medal className="h-4 w-4 fill-amber-600 text-amber-600" />
                        3
                      </span>
                    ) : (
                      <span className="text-[#71717a]">#{item.rank}</span>
                    )}
                  </div>

                  {/* Learner Name & Avatar */}
                  <div className="col-span-7 sm:col-span-7 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#27272a] text-[11px] font-semibold text-white">
                      {item.full_name ? item.full_name[0].toUpperCase() : 'L'}
                    </div>
                    <div>
                      <p className="font-medium text-white truncate max-w-[140px] sm:max-w-xs">
                        {item.full_name}
                        {isCurrentUser && (
                          <span className="ml-2 rounded bg-[#6d28d9] px-1.5 py-0.2 text-[9px] font-mono text-white">
                            YOU
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Certs */}
                  <div className="col-span-3 sm:col-span-2 text-right font-mono text-[#a1a1aa] flex items-center justify-end gap-1">
                    <Award className="h-3 w-3 text-emerald-400" />
                    <span>{item.completed_courses_count}</span>
                  </div>

                  {/* Total XP */}
                  <div className="hidden sm:block sm:col-span-2 text-right font-mono font-semibold text-[#d3bbff]">
                    {item.total_xp} XP
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#a1a1aa]">
            <Trophy className="mx-auto h-8 w-8 text-[#71717a] mb-2" />
            <p>No verified XP entries yet.</p>
            <p className="text-[11px] text-[#71717a] mt-1">Complete course quizzes to climb the leaderboard!</p>
          </div>
        )}
      </div>
    </div>
  );
};
