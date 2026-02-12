import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

vi.mock('@devvit/web/server', () => ({ redis }));

import {
  storeSubmission,
  hasUserSubmittedToday,
  getSubmissionsForVoting,
  getSubmissionByOderId,
} from './submission';

describe('submission service', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
  });

  describe('storeSubmission', () => {
    it('stores a submission and returns it with generated oderId', async () => {
      const result = await storeSubmission(
        'user123',
        'TestUser',
        'https://example.com/meme.jpg',
        'Funny caption'
      );

      expect(result.userId).toBe('user123');
      expect(result.username).toBe('TestUser');
      expect(result.imageUrl).toBe('https://example.com/meme.jpg');
      expect(result.caption).toBe('Funny caption');
      expect(result.oderId).toMatch(/^oder_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.submittedAt).toBe(Date.now());
    });

    it('stores submission in Redis hash with date key', async () => {
      const result = await storeSubmission(
        'user123',
        'TestUser',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const stored = await redis.hGet('submissions:2026-02-05', result.oderId);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.userId).toBe('user123');
    });
  });

  describe('hasUserSubmittedToday', () => {
    it('returns false when user has not submitted', async () => {
      const result = await hasUserSubmittedToday('user123');
      expect(result).toBe(false);
    });

    it('returns true when user has already submitted today', async () => {
      await storeSubmission('user123', 'TestUser', 'https://example.com/meme.jpg', 'Caption');

      const result = await hasUserSubmittedToday('user123');
      expect(result).toBe(true);
    });

    it('returns false for different user', async () => {
      await storeSubmission('user123', 'TestUser', 'https://example.com/meme.jpg', 'Caption');

      const result = await hasUserSubmittedToday('user456');
      expect(result).toBe(false);
    });
  });

  describe('getSubmissionsForVoting', () => {
    it('returns empty array when no submissions', async () => {
      const result = await getSubmissionsForVoting();
      expect(result).toEqual([]);
    });

    it('returns all submissions for today', async () => {
      await storeSubmission('user1', 'User1', 'https://example.com/1.jpg', 'Caption 1');
      await storeSubmission('user2', 'User2', 'https://example.com/2.jpg', 'Caption 2');

      const result = await getSubmissionsForVoting();
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.userId).sort()).toEqual(['user1', 'user2']);
    });
  });

  describe('getSubmissionByOderId', () => {
    it('returns null when submission does not exist', async () => {
      const result = await getSubmissionByOderId('nonexistent');
      expect(result).toBeNull();
    });

    it('returns submission when it exists', async () => {
      const stored = await storeSubmission(
        'user123',
        'TestUser',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await getSubmissionByOderId(stored.oderId);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user123');
      expect(result!.username).toBe('TestUser');
    });

    it('returns submission for specific date', async () => {
      const stored = await storeSubmission(
        'user123',
        'TestUser',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await getSubmissionByOderId(stored.oderId, '2026-02-05');
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user123');
    });

    it('returns null for wrong date', async () => {
      const stored = await storeSubmission(
        'user123',
        'TestUser',
        'https://example.com/meme.jpg',
        'Caption'
      );

      const result = await getSubmissionByOderId(stored.oderId, '2026-02-04');
      expect(result).toBeNull();
    });
  });
});
