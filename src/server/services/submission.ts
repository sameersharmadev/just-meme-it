import { redis } from '@devvit/web/server';
import { Submission } from '../../shared/types/submission';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function generateOderId(): string {
  return `oder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function storeSubmission(
  userId: string,
  username: string,
  imageUrl: string,
  caption: string
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
  };

  await redis.hSet(`submissions:${date}`, { [oderId]: JSON.stringify(submission) });

  return submission;
}

export async function hasUserSubmittedToday(userId: string): Promise<boolean> {
  const date = getTodayDate();
  const submissions = await redis.hGetAll(`submissions:${date}`);

  for (const value of Object.values(submissions)) {
    const submission = JSON.parse(value) as Submission;
    if (submission.userId === userId) {
      return true;
    }
  }

  return false;
}

export async function getSubmissionsForVoting(): Promise<Submission[]> {
  const date = getTodayDate();
  const submissions = await redis.hGetAll(`submissions:${date}`);

  return Object.values(submissions).map((value) => JSON.parse(value) as Submission);
}

export async function getSubmissionByOderId(oderId: string): Promise<Submission | null> {
  const date = getTodayDate();
  const data = await redis.hGet(`submissions:${date}`, oderId);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as Submission;
}
