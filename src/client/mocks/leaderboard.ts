export interface DailyLeaderboardEntry {
  oderId: string;
  username: string;
  votes: number;
}

export interface LifetimeLeaderboardEntry {
  userId: string;
  username: string;
  points: number;
}

export interface DailyLeaderboardResponse {
  status: 'success';
  type: 'daily';
  date: string;
  leaderboard: DailyLeaderboardEntry[];
}

export interface LifetimeLeaderboardResponse {
  status: 'success';
  type: 'lifetime';
  leaderboard: LifetimeLeaderboardEntry[];
}

export const mockDailyLeaderboard: DailyLeaderboardResponse = {
  status: 'success',
  type: 'daily',
  date: '2026-02-07',
  leaderboard: [
    { oderId: 'oder_1770466325743_hht3val', username: 'Crimson-Beam', votes: 42 },
    { oderId: 'oder_1770466325744_xyz123', username: 'meme_master', votes: 38 },
    { oderId: 'oder_1770466325745_abc456', username: 'gif_wizard', votes: 35 },
    { oderId: 'oder_1770466325746_def789', username: 'caption_king', votes: 28 },
    { oderId: 'oder_1770466325747_ghi012', username: 'viral_vibes', votes: 24 },
    { oderId: 'oder_1770466325748_jkl345', username: 'dank_dealer', votes: 20 },
    { oderId: 'oder_1770466325749_mno678', username: 'spicy_memes', votes: 18 },
    { oderId: 'oder_1770466325750_pqr901', username: 'top_tier', votes: 15 },
    { oderId: 'oder_1770466325751_stu234', username: 'legendary_poster', votes: 12 },
    { oderId: 'oder_1770466325752_vwx567', username: 'rookie_star', votes: 10 },
  ],
};

export const mockLifetimeLeaderboard: LifetimeLeaderboardResponse = {
  status: 'success',
  type: 'lifetime',
  leaderboard: [
    { userId: 't2_crimson123', username: 'Crimson-Beam', points: 1850 },
    { userId: 't2_meme456', username: 'meme_master', points: 1420 },
    { userId: 't2_gif789', username: 'gif_wizard', points: 1250 },
    { userId: 't2_king012', username: 'caption_king', points: 980 },
    { userId: 't2_viral345', username: 'viral_vibes', points: 875 },
    { userId: 't2_dank678', username: 'dank_dealer', points: 750 },
    { userId: 't2_spicy901', username: 'spicy_memes', points: 620 },
    { userId: 't2_top234', username: 'top_tier', points: 540 },
    { userId: 't2_legend567', username: 'legendary_poster', points: 480 },
    { userId: 't2_rookie890', username: 'rookie_star', points: 320 },
  ],
};
