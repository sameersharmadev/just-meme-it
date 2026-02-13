import { redis } from '@devvit/web/server';
import type { UserStats } from '../../shared/types/submission';
import { getSubmissionByOderId, getSubmissionsForVoting } from './submission';

function getUserKey(userId: string): string {
  return `user:${userId}`;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const key = getUserKey(userId);
  const data = await redis.hGetAll(key);

  return {
    username: data.username ?? '',
    streak: data.streak ? parseInt(data.streak, 10) : 0,
    lastParticipation: data.lastParticipation ?? '',
    wins: data.wins ? parseInt(data.wins, 10) : 0,
  };
}

export async function setUsername(userId: string, username: string): Promise<void> {
  const key = getUserKey(userId);
  await redis.hSet(key, { username });
}

export async function updateStreak(userId: string, date: string): Promise<number> {
  const key = getUserKey(userId);
  const stats = await getUserStats(userId);

  if (!stats.lastParticipation) {
    await redis.hSet(key, { streak: '1', lastParticipation: date });
    return 1;
  }

  const lastDate = new Date(stats.lastParticipation);
  const currentDate = new Date(date);
  const diffTime = currentDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let newStreak: number;
  if (diffDays === 1) {
    newStreak = stats.streak + 1;
  } else if (diffDays === 0) {
    newStreak = stats.streak;
  } else {
    newStreak = 1;
  }

  await redis.hSet(key, { streak: String(newStreak), lastParticipation: date });

  // Update the streak leaderboard sorted set
  const username = stats.username || userId;
  await redis.zAdd('leaderboard:streaks', { member: userId, score: newStreak });
  await redis.hSet('leaderboard:streaks:usernames', { [userId]: username });

  return newStreak;
}

export async function recordWin(userId: string): Promise<number> {
  const key = getUserKey(userId);
  return redis.hIncrBy(key, 'wins', 1);
}

export async function addLifetimeScore(userId: string, points: number): Promise<number> {
  return redis.zIncrBy('leaderboard:lifetime', userId, points);
}

export type DailyLeaderboardEntry = {
  oderId: string;
  username: string;
  votes: number;
};

export async function getDailyLeaderboard(
  date: string,
  limit: number
): Promise<DailyLeaderboardEntry[]> {
  // Get submissions that have votes
  const votedEntries = await redis.zRange(`leaderboard:${date}`, 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const votedOderIds = new Set(votedEntries.map((e) => e.member));

  const leaderboard: DailyLeaderboardEntry[] = await Promise.all(
    votedEntries.map(async (entry) => {
      const submission = await getSubmissionByOderId(entry.member, date);
      return {
        oderId: entry.member,
        username: submission?.username ?? '',
        votes: entry.score,
      };
    })
  );

  // Include submissions with 0 votes
  if (leaderboard.length < limit) {
    const allSubmissions = await getSubmissionsForVoting(date);
    for (const sub of allSubmissions) {
      if (leaderboard.length >= limit) break;
      if (!votedOderIds.has(sub.oderId)) {
        leaderboard.push({
          oderId: sub.oderId,
          username: sub.username,
          votes: 0,
        });
      }
    }
  }

  return leaderboard;
}

export type LifetimeLeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
};

export async function getLifetimeLeaderboard(limit: number): Promise<LifetimeLeaderboardEntry[]> {
  const entries = await redis.zRange('leaderboard:lifetime', 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const leaderboard: LifetimeLeaderboardEntry[] = await Promise.all(
    entries.map(async (entry) => {
      const stats = await getUserStats(entry.member);
      return {
        userId: entry.member,
        username: stats.username || entry.member,
        score: entry.score,
      };
    })
  );

  return leaderboard;
}

export type StreakLeaderboardEntry = {
  userId: string;
  username: string;
  streak: number;
};

export async function getStreakLeaderboard(limit: number): Promise<StreakLeaderboardEntry[]> {
  const entries = await redis.zRange('leaderboard:streaks', 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const usernames = await redis.hGetAll('leaderboard:streaks:usernames');

  return entries
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      userId: entry.member,
      username: usernames[entry.member] || entry.member,
      streak: entry.score,
    }));
}
