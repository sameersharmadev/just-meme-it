import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

const { mockReddit } = vi.hoisted(() => ({
  mockReddit: {
    submitCustomPost: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({ redis, reddit: mockReddit }));

import { ensureTodayPost, getTodayCaption, getTodayPostId } from './scheduler';

describe('scheduler service', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
    mockReddit.submitCustomPost.mockReset();
    mockReddit.submitCustomPost.mockResolvedValue({ id: 'test-post-123' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ensureTodayPost', () => {
    it('creates post when none exists for today', async () => {
      const result = await ensureTodayPost();

      expect(result).toBe(true);
      expect(mockReddit.submitCustomPost).toHaveBeenCalledOnce();
    });

    it('does not create post when one already exists', async () => {
      await redis.set('day:2026-02-05:postId', 'existing-post');

      const result = await ensureTodayPost();

      expect(result).toBe(false);
      expect(mockReddit.submitCustomPost).not.toHaveBeenCalled();
    });

    it('stores caption and postId in Redis after creating', async () => {
      await ensureTodayPost();

      const caption = await redis.get('day:2026-02-05:caption');
      const postId = await redis.get('day:2026-02-05:postId');
      expect(caption).toBeTruthy();
      expect(postId).toBe('test-post-123');
    });

    it('selects first caption when no index exists', async () => {
      await ensureTodayPost();

      const caption = await redis.get('day:2026-02-05:caption');
      expect(caption).toBe('When you finally understand the assignment');
    });

    it('rotates caption index after posting', async () => {
      await ensureTodayPost();

      const index = await redis.get('caption:index');
      expect(index).toBe('1');
    });

    it('uses caption at stored index', async () => {
      await redis.set('caption:index', '3');

      await ensureTodayPost();

      const caption = await redis.get('day:2026-02-05:caption');
      expect(caption).toBe("When someone says 'we need to talk'");
    });

    it('wraps caption index around when reaching end of list', async () => {
      await redis.set('caption:index', '29');

      await ensureTodayPost();

      const index = await redis.get('caption:index');
      expect(index).toBe('0');
    });

    it('skips creation when lock is held by another process', async () => {
      await redis.set('lock:daily-post:2026-02-05', '1');

      const resultPromise = ensureTodayPost();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result).toBe(false);
      expect(mockReddit.submitCustomPost).not.toHaveBeenCalled();
    });

    it('cleans up lock after successful creation', async () => {
      await ensureTodayPost();

      const lock = await redis.get('lock:daily-post:2026-02-05');
      expect(lock).toBeUndefined();
    });

    it('cleans up lock even when post creation fails', async () => {
      mockReddit.submitCustomPost.mockRejectedValue(new Error('Reddit API error'));

      await expect(ensureTodayPost()).rejects.toThrow('Reddit API error');

      const lock = await redis.get('lock:daily-post:2026-02-05');
      expect(lock).toBeUndefined();
    });

    it('does not create duplicate when post exists after acquiring lock', async () => {
      await redis.set('day:2026-02-05:postId', 'already-created');

      const result = await ensureTodayPost();

      expect(result).toBe(false);
      expect(mockReddit.submitCustomPost).not.toHaveBeenCalled();
    });
  });

  describe('getTodayCaption', () => {
    it('returns null when no caption exists', async () => {
      const result = await getTodayCaption();
      expect(result).toBeNull();
    });

    it('returns caption when it exists', async () => {
      await redis.set('day:2026-02-05:caption', 'Test caption');

      const result = await getTodayCaption();
      expect(result).toBe('Test caption');
    });
  });

  describe('getTodayPostId', () => {
    it('returns null when no postId exists', async () => {
      const result = await getTodayPostId();
      expect(result).toBeNull();
    });

    it('returns postId when it exists', async () => {
      await redis.set('day:2026-02-05:postId', 'post-abc');

      const result = await getTodayPostId();
      expect(result).toBe('post-abc');
    });
  });
});
