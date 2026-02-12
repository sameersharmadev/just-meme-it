import { randomUUID } from 'crypto';
import { redis } from '@devvit/web/server';
import type { Submission, TextOverlay } from '../../shared/types/submission';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function generateOderId(): string {
  return `oder_${randomUUID()}`;
}

export async function storeSubmission(
  userId: string,
  username: string,
  imageUrl: string,
  caption: string,
  overlays?: TextOverlay[]
): Promise<Submission> {
  const date = getTodayDate();
  const oderId = generateOderId();
  const submission: Submission = {
    oderId,
    userId,
    username,
    imageUrl,
    caption,
    submittedAt: Date.now(),
    ...(overlays && overlays.length > 0 ? { overlays } : {}),
  };

  await Promise.all([
    redis.hSet(`submissions:${date}`, { [oderId]: JSON.stringify(submission) }),
    redis.set(`user-submitted:${date}:${userId}`, '1'),
  ]);

  return submission;
}

export async function hasUserSubmittedToday(userId: string): Promise<boolean> {
  const date = getTodayDate();

  // O(1) lookup via dedicated key
  const submitted = await redis.get(`user-submitted:${date}:${userId}`);
  if (submitted) {
    return true;
  }

  // Fallback: scan all submissions for backwards compatibility
  // (covers submissions created before the key-based tracking was added)
  const submissions = await redis.hGetAll(`submissions:${date}`);
  for (const value of Object.values(submissions)) {
    const submission = JSON.parse(value) as Submission;
    if (submission.userId === userId) {
      // Backfill the key so future lookups are O(1)
      await redis.set(`user-submitted:${date}:${userId}`, '1');
      return true;
    }
  }

  return false;
}

export async function getUserSubmissionOderId(userId: string): Promise<string | null> {
  const date = getTodayDate();
  const submissions = await redis.hGetAll(`submissions:${date}`);

  for (const value of Object.values(submissions)) {
    const submission = JSON.parse(value) as Submission;
    if (submission.userId === userId) {
      return submission.oderId;
    }
  }

  return null;
}

export async function getSubmissionsForVoting(date?: string): Promise<Submission[]> {
  const targetDate = date ?? getTodayDate();
  const submissions = await redis.hGetAll(`submissions:${targetDate}`);

  return Object.values(submissions).map((value) => JSON.parse(value) as Submission);
}

export async function deleteSubmission(oderId: string, date?: string): Promise<boolean> {
  const targetDate = date ?? getTodayDate();

  // Get the submission before deleting so we know the userId
  const data = await redis.hGet(`submissions:${targetDate}`, oderId);
  if (!data) return false;

  const submission = JSON.parse(data) as Submission;

  // Get vote count from daily leaderboard before removal
  const voteCount = (await redis.zScore(`leaderboard:${targetDate}`, oderId)) ?? 0;

  // Delete the submission itself and the user-submitted tracking key
  await Promise.all([
    redis.hDel(`submissions:${targetDate}`, [oderId]),
    redis.del(`user-submitted:${targetDate}:${submission.userId}`),
  ]);

  // Remove from daily leaderboard
  await redis.zRem(`leaderboard:${targetDate}`, [oderId]);

  // Clean up vote records for this submission
  const voters = await redis.zRange(`votes:${targetDate}:${oderId}`, 0, -1);
  if (voters.length > 0) {
    await redis.zRem(
      `votes:${targetDate}:${oderId}`,
      voters.map((v) => v.member)
    );
  }

  // Subtract this submission's votes from the user's lifetime score
  if (voteCount > 0) {
    await redis.zIncrBy('leaderboard:lifetime', submission.userId, -voteCount);
  }

  return true;
}

export async function getSubmissionByOderId(
  oderId: string,
  date?: string
): Promise<Submission | null> {
  const targetDate = date ?? getTodayDate();
  const data = await redis.hGet(`submissions:${targetDate}`, oderId);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as Submission;
}
