import { redis } from '@devvit/web/server';
import { getSubmissionsForVoting, getSubmissionByOderId } from './submission';
import { getDailyLeaderboard } from './userStats';
import { addLifetimeScore, recordWin } from './userStats';

const PLACEMENT_POINTS = [50, 30, 15, 5, 3] as const;

function getPlacementBonus(rank: number): number {
  if (rank <= 5) return PLACEMENT_POINTS[rank - 1]!;
  if (rank <= 10) return 1;
  return 0;
}

/**
 * Finalize a day's competition: award lifetime points and record wins.
 * Uses standard competition ranking for ties (e.g. two 1st → next is 3rd).
 * Guarded by a Redis NX key to prevent double-finalization.
 */
export async function finalizeDayCompetition(date: string): Promise<void> {
  // Fast check — already finalized?
  const already = await redis.get(`finalized:${date}`);
  if (already) return;

  // Atomic guard — only one process wins the race
  const acquired = await redis.set(`finalized:${date}`, '1', { nx: true });
  if (!acquired) return;

  const submissions = await getSubmissionsForVoting(date);
  if (submissions.length === 0) {
    console.log(`[Finalization] No submissions for ${date}, nothing to finalize`);
    return;
  }

  // Fetch full daily leaderboard (all entries)
  const leaderboard = await getDailyLeaderboard(date, 999);

  // Resolve userId for each leaderboard entry
  type Resolved = { oderId: string; userId: string; username: string; votes: number };
  const resolved: Resolved[] = [];

  for (const entry of leaderboard) {
    const submission = await getSubmissionByOderId(entry.oderId, date);
    if (submission) {
      resolved.push({
        oderId: entry.oderId,
        userId: submission.userId,
        username: entry.username,
        votes: entry.votes,
      });
    }
  }

  if (resolved.length === 0) return;

  // Standard competition ranking with tie handling
  // e.g. scores [10, 10, 5, 3] → ranks [1, 1, 3, 4]
  let rank = 1;
  for (let i = 0; i < resolved.length; i++) {
    if (i > 0 && resolved[i]!.votes < resolved[i - 1]!.votes) {
      rank = i + 1; // standard competition: skip tied positions
    }

    const entry = resolved[i]!;
    const bonus = getPlacementBonus(rank);
    const total = bonus + 1; // +1 participation point

    await addLifetimeScore(entry.userId, total);

    if (rank === 1) {
      await recordWin(entry.userId);
    }

    console.log(
      `[Finalization] ${date} — ${entry.username} (rank ${rank}): ${bonus} placement + 1 participation = ${total} pts${rank === 1 ? ' + WIN' : ''}`
    );
  }

  console.log(`[Finalization] Completed finalization for ${date}: ${resolved.length} participants`);
}
