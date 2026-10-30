import { getSupabaseAdmin } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string;
  total_xp: number;
  completed_courses_count: number;
}

export const getLeaderboard = async (currentUserId?: string, limit: number = 50) => {
  if (!isSupabaseConfigured()) {
    return {
      leaderboard: [],
      currentUserRank: null,
      totalParticipants: 0,
    };
  }

  const admin = getSupabaseAdmin();

  // Aggregate verified XP per user from xp_events
  const { data: xpTotals, error: xpErr } = await admin
    .from('xp_events')
    .select('user_id, xp');

  if (xpErr) {
    throw new Error(`Failed to calculate leaderboard: ${xpErr.message}`);
  }

  const xpMap: Record<string, number> = {};
  (xpTotals || []).forEach(row => {
    xpMap[row.user_id] = (xpMap[row.user_id] || 0) + row.xp;
  });

  const userIds = Object.keys(xpMap);
  if (userIds.length === 0) {
    return {
      leaderboard: [],
      currentUserRank: null,
      totalParticipants: 0,
    };
  }

  // Fetch safe public profile fields
  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profErr) {
    throw new Error(`Failed to load profile data: ${profErr.message}`);
  }

  // Fetch completed certificate counts
  const { data: certs } = await admin
    .from('certificates')
    .select('user_id')
    .eq('verification_status', 'valid');

  const certCounts: Record<string, number> = {};
  (certs || []).forEach(c => {
    certCounts[c.user_id] = (certCounts[c.user_id] || 0) + 1;
  });

  const profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = {
      full_name: p.full_name || 'CodeEase Learner',
      avatar_url: p.avatar_url || '',
    };
  });

  // Sort descending by XP
  const sortedUserIds = userIds.sort((a, b) => (xpMap[b] || 0) - (xpMap[a] || 0));

  let currentUserRank: LeaderboardEntry | null = null;
  const leaderboard: LeaderboardEntry[] = [];

  sortedUserIds.forEach((uid, index) => {
    const entry: LeaderboardEntry = {
      rank: index + 1,
      user_id: uid,
      full_name: profileMap[uid]?.full_name || 'CodeEase Learner',
      avatar_url: profileMap[uid]?.avatar_url || '',
      total_xp: xpMap[uid] || 0,
      completed_courses_count: certCounts[uid] || 0,
    };

    if (currentUserId && uid === currentUserId) {
      currentUserRank = entry;
    }

    if (index < limit) {
      leaderboard.push(entry);
    }
  });

  return {
    leaderboard,
    currentUserRank,
    totalParticipants: sortedUserIds.length,
  };
};

export const calculateStreak = async (userId: string): Promise<number> => {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const admin = getSupabaseAdmin();
  const { data: activities, error } = await admin
    .from('daily_activity')
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(30);

  if (error || !activities || activities.length === 0) {
    return 0;
  }

  // Timezone policy: UTC day boundary
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const dates = activities.map(a => a.activity_date);
  
  // Must have activity today or yesterday to maintain an active streak
  if (!dates.includes(today) && !dates.includes(yesterday)) {
    return 0;
  }

  let streak = 0;
  let checkDate = dates.includes(today) ? new Date() : yesterdayDate;

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      streak++;
      // Step 1 day backward
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
};
