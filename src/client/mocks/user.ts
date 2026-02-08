export interface UserData {
  userId: string;
  username: string;
  streak: number;
  lastParticipation: string;
  wins: number;
}

export interface StreakLeaderboardEntry {
  userId: string;
  username: string;
  streak: number;
}

export interface StreakLeaderboardResponse {
  status: 'success';
  type: 'streak';
  leaderboard: StreakLeaderboardEntry[];
}

// Mock current user data
export const mockCurrentUser: UserData = {
  userId: 't2_crimson123',
  username: 'Crimson-Beam',
  streak: 7,
  lastParticipation: '2026-02-07',
  wins: 3,
};

// Mock streak leaderboard
export const mockStreakLeaderboard: StreakLeaderboardResponse = {
  status: 'success',
  type: 'streak',
  leaderboard: [
    { userId: 't2_legend567', username: 'legendary_poster', streak: 45 },
    { userId: 't2_top234', username: 'top_tier', streak: 38 },
    { userId: 't2_meme456', username: 'meme_master', streak: 32 },
    { userId: 't2_gif789', username: 'gif_wizard', streak: 28 },
    { userId: 't2_viral345', username: 'viral_vibes', streak: 24 },
    { userId: 't2_king012', username: 'caption_king', streak: 21 },
    { userId: 't2_dank678', username: 'dank_dealer', streak: 18 },
    { userId: 't2_spicy901', username: 'spicy_memes', streak: 15 },
    { userId: 't2_rookie890', username: 'rookie_star', streak: 12 },
    { userId: 't2_crimson123', username: 'Crimson-Beam', streak: 7 },
  ],
};
