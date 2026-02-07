import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

vi.mock('@devvit/web/server', () => ({ redis }));

import {
  getUserStats,
  setUsername,
  updateStreak,
  recordWin,
  addLifetimeScore,
  getDailyLeaderboard,
  getLifetimeLeaderboard,
} from './userStats';
import { storeSubmission } from './submission';
import { castVote } from './voting';

describe('userStats service', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
  });

  describe('getUserStats', () => {
    it('returns default stats for new user', async () => {
      const result = await getUserStats('user123');

      expect(result).toEqual({
        username: '',
        streak: 0,
        lastParticipation: '',
        wins: 0,
      });
    });

    it('returns stored stats for existing user', async () => {
      await setUsername('user123', 'TestUser');
      await updateStreak('user123', '2026-02-05');
      await recordWin('user123');

      const result = await getUserStats('user123');

      expect(result.username).toBe('TestUser');
      expect(result.streak).toBe(1);
      expect(result.lastParticipation).toBe('2026-02-05');
      expect(result.wins).toBe(1);
    });
  });

  describe('setUsername', () => {
    it('sets username for user', async () => {
      await setUsername('user123', 'TestUser');

      const stats = await getUserStats('user123');
      expect(stats.username).toBe('TestUser');
    });

    it('updates existing username', async () => {
      await setUsername('user123', 'OldName');
      await setUsername('user123', 'NewName');

      const stats = await getUserStats('user123');
      expect(stats.username).toBe('NewName');
    });
  });

  describe('updateStreak', () => {
    it('starts streak at 1 for first participation', async () => {
      const result = await updateStreak('user123', '2026-02-05');

      expect(result).toBe(1);
      const stats = await getUserStats('user123');
      expect(stats.streak).toBe(1);
      expect(stats.lastParticipation).toBe('2026-02-05');
    });

    it('increments streak for consecutive days', async () => {
      await updateStreak('user123', '2026-02-04');
      const result = await updateStreak('user123', '2026-02-05');

      expect(result).toBe(2);
    });

    it('keeps streak same for same day participation', async () => {
      await updateStreak('user123', '2026-02-05');
      const result = await updateStreak('user123', '2026-02-05');

      expect(result).toBe(1);
    });

    it('resets streak for non-consecutive days', async () => {
      await updateStreak('user123', '2026-02-01');
      const result = await updateStreak('user123', '2026-02-05');

      expect(result).toBe(1);
    });
  });

  describe('recordWin', () => {
    it('increments win count', async () => {
      const result1 = await recordWin('user123');
      const result2 = await recordWin('user123');

      expect(result1).toBe(1);
      expect(result2).toBe(2);
    });
  });

  describe('addLifetimeScore', () => {
    it('adds points to lifetime leaderboard', async () => {
      const result = await addLifetimeScore('user123', 10);

      expect(result).toBe(10);
    });

    it('accumulates points', async () => {
      await addLifetimeScore('user123', 10);
      const result = await addLifetimeScore('user123', 5);

      expect(result).toBe(15);
    });
  });

  describe('getDailyLeaderboard', () => {
    it('returns empty array when no votes', async () => {
      const result = await getDailyLeaderboard('2026-02-05', 10);

      expect(result).toEqual([]);
    });

    it('returns leaderboard sorted by votes descending', async () => {
      const sub1 = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/1.jpg',
        'Caption 1'
      );
      const sub2 = await storeSubmission(
        'user2',
        'User2',
        'https://example.com/2.jpg',
        'Caption 2'
      );

      await castVote('user3', sub1.oderId, '2026-02-05');
      await castVote('user4', sub1.oderId, '2026-02-05');
      await castVote('user3', sub2.oderId, '2026-02-05');

      const result = await getDailyLeaderboard('2026-02-05', 10);

      expect(result).toHaveLength(2);
      expect(result[0]!.oderId).toBe(sub1.oderId);
      expect(result[0]!.votes).toBe(2);
      expect(result[0]!.username).toBe('User1');
      expect(result[1]!.oderId).toBe(sub2.oderId);
      expect(result[1]!.votes).toBe(1);
    });

    it('respects limit parameter', async () => {
      const sub1 = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/1.jpg',
        'Caption 1'
      );
      const sub2 = await storeSubmission(
        'user2',
        'User2',
        'https://example.com/2.jpg',
        'Caption 2'
      );

      await castVote('user3', sub1.oderId, '2026-02-05');
      await castVote('user3', sub2.oderId, '2026-02-05');

      const result = await getDailyLeaderboard('2026-02-05', 1);

      expect(result).toHaveLength(1);
    });
  });

  describe('getLifetimeLeaderboard', () => {
    it('returns empty array when no scores', async () => {
      const result = await getLifetimeLeaderboard(10);

      expect(result).toEqual([]);
    });

    it('returns leaderboard sorted by score descending', async () => {
      await setUsername('user1', 'User1');
      await setUsername('user2', 'User2');
      await addLifetimeScore('user1', 100);
      await addLifetimeScore('user2', 50);

      const result = await getLifetimeLeaderboard(10);

      expect(result).toHaveLength(2);
      expect(result[0]!.userId).toBe('user1');
      expect(result[0]!.score).toBe(100);
      expect(result[0]!.username).toBe('User1');
      expect(result[1]!.userId).toBe('user2');
      expect(result[1]!.score).toBe(50);
    });

    it('uses userId as fallback when username not set', async () => {
      await addLifetimeScore('user123', 100);

      const result = await getLifetimeLeaderboard(10);

      expect(result[0]!.username).toBe('user123');
    });
  });
});
