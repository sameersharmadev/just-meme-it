import { redis } from '@devvit/web/server';
import { getSubmissionByOderId } from './submission';

function getVoteKey(date: string, oderId: string): string {
  return `votes:${date}:${oderId}`;
}

function getDailyLeaderboardKey(date: string): string {
  return `leaderboard:${date}`;
}

function getRateLimitKey(userId: string): string {
  return `ratelimit:vote:${userId}`;
}

export async function castVote(userId: string, oderId: string, date: string): Promise<boolean> {
  // Rate limit: prevent vote spam (2-second cooldown per user)
  const rateLimitKey = getRateLimitKey(userId);
  const rateLimitSet = await redis.set(rateLimitKey, '1', {
    nx: true,
    expiration: new Date(Date.now() + 2000),
  });
  if (!rateLimitSet) {
    return false;
  }

  const isOwn = await isOwnSubmission(userId, oderId, date);
  if (isOwn) {
    return false;
  }

  // Atomic vote: zAdd returns 1 if the member was newly added, 0 if it already existed.
  // This eliminates the TOCTOU race between hasUserVoted() and the write.
  const added = await redis.zAdd(getVoteKey(date, oderId), { member: userId, score: Date.now() });
  if (added === 0) {
    return false;
  }

  await redis.zIncrBy(getDailyLeaderboardKey(date), oderId, 1);
  return true;
}

export async function hasUserVoted(userId: string, oderId: string, date: string): Promise<boolean> {
  const score = await redis.zScore(getVoteKey(date, oderId), userId);
  return score !== undefined;
}

export async function isOwnSubmission(
  userId: string,
  oderId: string,
  date: string
): Promise<boolean> {
  const submission = await getSubmissionByOderId(oderId, date);
  if (!submission) {
    return false;
  }
  return submission.userId === userId;
}

export async function getVoteCount(oderId: string, date: string): Promise<number> {
  return redis.zCard(getVoteKey(date, oderId));
}
