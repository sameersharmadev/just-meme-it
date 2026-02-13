import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

vi.mock('@devvit/web/server', () => ({ redis }));

import { storeSubmission } from './submission';
import { castVote } from './voting';
import { getUserStats } from './userStats';
import { finalizeDayCompetition } from './finalization';

const DATE = '2026-02-05';

describe('finalizeDayCompetition', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${DATE}T12:00:00Z`));
  });

  it('does nothing when there are no submissions', async () => {
    await finalizeDayCompetition(DATE);

    const score = await redis.zScore('leaderboard:lifetime', 'user1');
    expect(score).toBeUndefined();
  });

  it('awards 51 pts (50 placement + 1 participation) and a win for single submission', async () => {
    const sub = await storeSubmission('user1', 'Alice', 'https://img/1.jpg', 'cap');
    // Give them 0 votes — still 1st place
    await finalizeDayCompetition(DATE);

    const score = await redis.zScore('leaderboard:lifetime', 'user1');
    expect(score).toBe(51);

    const stats = await getUserStats('user1');
    expect(stats.wins).toBe(1);
  });

  it('awards correct placement bonuses for ranked submissions', async () => {
    // Create 5 submissions and vote to establish ranking
    const subs = [];
    for (let i = 1; i <= 5; i++) {
      subs.push(
        await storeSubmission(`user${i}`, `User${i}`, `https://img/${i}.jpg`, 'cap')
      );
    }

    // user1 gets 4 votes (1st: 50 pts), user2 gets 3 (2nd: 30), user3 gets 2 (3rd: 15),
    // user4 gets 1 (4th: 5), user5 gets 0 (5th: 3)
    // Use voters v1-v20 to cast votes
    for (let v = 1; v <= 4; v++) await castVote(`voter${v}`, subs[0]!.oderId, DATE);
    for (let v = 5; v <= 7; v++) await castVote(`voter${v}`, subs[1]!.oderId, DATE);
    for (let v = 8; v <= 9; v++) await castVote(`voter${v}`, subs[2]!.oderId, DATE);
    await castVote('voter10', subs[3]!.oderId, DATE);

    await finalizeDayCompetition(DATE);

    // Expected: placement bonus + 1 participation
    expect(await redis.zScore('leaderboard:lifetime', 'user1')).toBe(51); // 50+1
    expect(await redis.zScore('leaderboard:lifetime', 'user2')).toBe(31); // 30+1
    expect(await redis.zScore('leaderboard:lifetime', 'user3')).toBe(16); // 15+1
    expect(await redis.zScore('leaderboard:lifetime', 'user4')).toBe(6);  // 5+1
    expect(await redis.zScore('leaderboard:lifetime', 'user5')).toBe(4);  // 3+1

    // Only 1st place gets a win
    expect((await getUserStats('user1')).wins).toBe(1);
    expect((await getUserStats('user2')).wins).toBe(0);
  });

  it('handles ties with standard competition ranking', async () => {
    // Two users tied for 1st (both get 50 pts + win), next gets 3rd (15 pts)
    const sub1 = await storeSubmission('user1', 'Alice', 'https://img/1.jpg', 'cap');
    const sub2 = await storeSubmission('user2', 'Bob', 'https://img/2.jpg', 'cap');
    const sub3 = await storeSubmission('user3', 'Carol', 'https://img/3.jpg', 'cap');

    // user1 and user2 each get 2 votes, user3 gets 1
    await castVote('voter1', sub1.oderId, DATE);
    await castVote('voter2', sub1.oderId, DATE);
    await castVote('voter3', sub2.oderId, DATE);
    await castVote('voter4', sub2.oderId, DATE);
    await castVote('voter5', sub3.oderId, DATE);

    await finalizeDayCompetition(DATE);

    // Both tied for 1st → 50 + 1 = 51
    expect(await redis.zScore('leaderboard:lifetime', 'user1')).toBe(51);
    expect(await redis.zScore('leaderboard:lifetime', 'user2')).toBe(51);
    // Next is 3rd place (standard competition) → 15 + 1 = 16
    expect(await redis.zScore('leaderboard:lifetime', 'user3')).toBe(16);

    // Both 1st-place users get wins
    expect((await getUserStats('user1')).wins).toBe(1);
    expect((await getUserStats('user2')).wins).toBe(1);
    expect((await getUserStats('user3')).wins).toBe(0);
  });

  it('all users with 0 votes tie for 1st and get wins', async () => {
    await storeSubmission('user1', 'Alice', 'https://img/1.jpg', 'cap');
    await storeSubmission('user2', 'Bob', 'https://img/2.jpg', 'cap');
    await storeSubmission('user3', 'Carol', 'https://img/3.jpg', 'cap');

    await finalizeDayCompetition(DATE);

    // All tied for 1st → 50 + 1 = 51 each
    expect(await redis.zScore('leaderboard:lifetime', 'user1')).toBe(51);
    expect(await redis.zScore('leaderboard:lifetime', 'user2')).toBe(51);
    expect(await redis.zScore('leaderboard:lifetime', 'user3')).toBe(51);

    // All get wins
    expect((await getUserStats('user1')).wins).toBe(1);
    expect((await getUserStats('user2')).wins).toBe(1);
    expect((await getUserStats('user3')).wins).toBe(1);
  });

  it('prevents double finalization', async () => {
    await storeSubmission('user1', 'Alice', 'https://img/1.jpg', 'cap');

    await finalizeDayCompetition(DATE);
    await finalizeDayCompetition(DATE); // second call should be no-op

    // Should still be 51, not 102
    expect(await redis.zScore('leaderboard:lifetime', 'user1')).toBe(51);
    expect((await getUserStats('user1')).wins).toBe(1);
  });

  it('awards 1 pt each for ranks 6-10 and 0 for 11+', async () => {
    // Create 12 submissions
    const subs = [];
    for (let i = 1; i <= 12; i++) {
      subs.push(
        await storeSubmission(`user${i}`, `User${i}`, `https://img/${i}.jpg`, 'cap')
      );
    }

    // Give descending vote counts: 12, 11, 10, ... 1 for first 11, 0 for 12th
    for (let i = 0; i < 11; i++) {
      const voteCount = 12 - i;
      for (let v = 0; v < voteCount; v++) {
        await castVote(`voter_${i}_${v}`, subs[i]!.oderId, DATE);
      }
    }

    await finalizeDayCompetition(DATE);

    // Ranks 6-10 get 1 bonus + 1 participation = 2
    for (let i = 6; i <= 10; i++) {
      expect(await redis.zScore('leaderboard:lifetime', `user${i}`)).toBe(2);
    }
    // Rank 11 gets 0 bonus + 1 participation = 1
    expect(await redis.zScore('leaderboard:lifetime', 'user11')).toBe(1);
    // Rank 12 (0 votes) gets 0 bonus + 1 participation = 1
    expect(await redis.zScore('leaderboard:lifetime', 'user12')).toBe(1);
  });
});
