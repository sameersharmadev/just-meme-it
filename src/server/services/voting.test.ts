import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

vi.mock('@devvit/web/server', () => ({ redis }));

import { castVote, hasUserVoted, isOwnSubmission, getVoteCount } from './voting';
import { storeSubmission } from './submission';

describe('voting service', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
  });

  describe('castVote', () => {
    it('successfully casts a vote for another users submission', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await castVote('user2', submission.oderId, '2026-02-05');

      expect(result).toBe(true);
    });

    it('prevents voting on own submission', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await castVote('user1', submission.oderId, '2026-02-05');

      expect(result).toBe(false);
    });

    it('prevents duplicate votes', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      await castVote('user2', submission.oderId, '2026-02-05');
      const result = await castVote('user2', submission.oderId, '2026-02-05');

      expect(result).toBe(false);
    });

    it('allows different users to vote on same submission', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result1 = await castVote('user2', submission.oderId, '2026-02-05');
      const result2 = await castVote('user3', submission.oderId, '2026-02-05');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('updates daily leaderboard when vote is cast', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      await castVote('user2', submission.oderId, '2026-02-05');
      await castVote('user3', submission.oderId, '2026-02-05');

      const score = await redis.zScore('leaderboard:2026-02-05', submission.oderId);
      expect(score).toBe(2);
    });
  });

  describe('hasUserVoted', () => {
    it('returns false when user has not voted', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await hasUserVoted('user2', submission.oderId, '2026-02-05');

      expect(result).toBe(false);
    });

    it('returns true when user has voted', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );
      await castVote('user2', submission.oderId, '2026-02-05');

      const result = await hasUserVoted('user2', submission.oderId, '2026-02-05');

      expect(result).toBe(true);
    });
  });

  describe('isOwnSubmission', () => {
    it('returns true when user owns the submission', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await isOwnSubmission('user1', submission.oderId, '2026-02-05');

      expect(result).toBe(true);
    });

    it('returns false when user does not own the submission', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await isOwnSubmission('user2', submission.oderId, '2026-02-05');

      expect(result).toBe(false);
    });

    it('returns false when submission does not exist', async () => {
      const result = await isOwnSubmission('user1', 'nonexistent', '2026-02-05');

      expect(result).toBe(false);
    });
  });

  describe('getVoteCount', () => {
    it('returns 0 when no votes', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await getVoteCount(submission.oderId, '2026-02-05');

      expect(result).toBe(0);
    });

    it('returns correct vote count', async () => {
      const submission = await storeSubmission(
        'user1',
        'User1',
        'https://example.com/meme.jpg',
        'Caption'
      );
      await castVote('user2', submission.oderId, '2026-02-05');
      await castVote('user3', submission.oderId, '2026-02-05');
      await castVote('user4', submission.oderId, '2026-02-05');

      const result = await getVoteCount(submission.oderId, '2026-02-05');

      expect(result).toBe(3);
    });
  });
});
