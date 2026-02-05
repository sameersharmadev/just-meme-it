import { redis } from '@devvit/web/server';
import { getSubmissionByOderId } from './submission';

function getVoteKey(date: string, oderId: string): string {
  return `votes:${date}:${oderId}`;
}

export async function castVote(userId: string, oderId: string, date: string): Promise<boolean> {
  const isOwn = await isOwnSubmission(userId, oderId, date);
  if (isOwn) {
    return false;
  }

  const alreadyVoted = await hasUserVoted(userId, oderId, date);
  if (alreadyVoted) {
    return false;
  }

  await redis.zAdd(getVoteKey(date, oderId), { member: userId, score: Date.now() });
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
