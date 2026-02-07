import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const { mockContext, mockReddit, mockRedis, appRef } = vi.hoisted(() => ({
  mockContext: {} as Record<string, any>,
  mockReddit: {
    getCurrentUsername: vi.fn(),
    getCurrentUser: vi.fn(),
    getModerators: vi.fn(),
    submitCustomPost: vi.fn(),
  },
  mockRedis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incrBy: vi.fn(),
    zIncrBy: vi.fn(),
    zScore: vi.fn(),
  },
  appRef: { current: null as Express | null },
}));

vi.mock('@devvit/web/server', () => ({
  redis: mockRedis,
  reddit: mockReddit,
  context: mockContext,
  createServer: (expressApp: any) => {
    appRef.current = expressApp;
    return { on: vi.fn(), listen: vi.fn() };
  },
  getServerPort: () => 3000,
}));

vi.mock('@devvit/media', () => ({
  media: { upload: vi.fn() },
}));

vi.mock('./services/scheduler', () => ({
  ensureTodayPost: vi.fn().mockResolvedValue(false),
  getTodayCaption: vi.fn(),
  getTodayPostId: vi.fn(),
}));

vi.mock('./services/submit', () => ({
  handleMemeSubmission: vi.fn(),
}));

vi.mock('./services/submission', () => ({
  storeSubmission: vi.fn(),
  hasUserSubmittedToday: vi.fn(),
  getSubmissionsForVoting: vi.fn(),
  getSubmissionByOderId: vi.fn(),
}));

vi.mock('./services/voting', () => ({
  castVote: vi.fn(),
  hasUserVoted: vi.fn(),
  isOwnSubmission: vi.fn(),
  getVoteCount: vi.fn(),
}));

vi.mock('./services/userStats', () => ({
  getUserStats: vi.fn(),
  updateStreak: vi.fn(),
  recordWin: vi.fn(),
  addLifetimeScore: vi.fn(),
  getDailyLeaderboard: vi.fn(),
  getLifetimeLeaderboard: vi.fn(),
  setUsername: vi.fn(),
}));

vi.mock('./core/post', () => ({
  createPost: vi.fn(),
}));

import './index';

import { getTodayCaption, getTodayPostId } from './services/scheduler';
import { handleMemeSubmission } from './services/submit';
import {
  storeSubmission,
  hasUserSubmittedToday,
  getSubmissionsForVoting,
  getSubmissionByOderId,
} from './services/submission';
import { castVote, hasUserVoted, getVoteCount } from './services/voting';
import {
  getUserStats,
  updateStreak,
  getDailyLeaderboard,
  getLifetimeLeaderboard,
  setUsername,
} from './services/userStats';

function setContext(values: Record<string, any>) {
  Object.keys(mockContext).forEach((key) => delete mockContext[key]);
  Object.assign(mockContext, values);
}

function setDefaultContext() {
  setContext({ userId: 'user123', postId: 'post123' });
}

describe('API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultContext();
    mockReddit.getCurrentUsername.mockResolvedValue('TestUser');
    mockReddit.getCurrentUser.mockResolvedValue({ id: 'user123', username: 'TestUser' });
  });

  describe('GET /api/today-caption', () => {
    it('returns 404 when no caption exists', async () => {
      vi.mocked(getTodayCaption).mockResolvedValue(null);
      vi.mocked(getTodayPostId).mockResolvedValue(null);

      const res = await request(appRef.current).get('/api/today-caption');

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });

    it('returns 404 when caption exists but no postId', async () => {
      vi.mocked(getTodayCaption).mockResolvedValue('Test caption');
      vi.mocked(getTodayPostId).mockResolvedValue(null);

      const res = await request(appRef.current).get('/api/today-caption');

      expect(res.status).toBe(404);
    });

    it('returns caption data on success', async () => {
      vi.mocked(getTodayCaption).mockResolvedValue('Funny caption');
      vi.mocked(getTodayPostId).mockResolvedValue('post-abc');

      const res = await request(appRef.current).get('/api/today-caption');

      expect(res.status).toBe(200);
      expect(res.body.caption).toBe('Funny caption');
      expect(res.body.postId).toBe('post-abc');
      expect(res.body.username).toBe('TestUser');
      expect(res.body.date).toBeDefined();
    });

    it('returns anonymous when user is not logged in', async () => {
      vi.mocked(getTodayCaption).mockResolvedValue('Caption');
      vi.mocked(getTodayPostId).mockResolvedValue('post-abc');
      mockReddit.getCurrentUsername.mockResolvedValue(null);

      const res = await request(appRef.current).get('/api/today-caption');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('anonymous');
    });
  });

  describe('POST /api/submit-meme', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockReddit.getCurrentUsername.mockResolvedValue(null);
      mockReddit.getCurrentUser.mockResolvedValue(null);

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'image' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when imageDataUrl is missing', async () => {
      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageType: 'image' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Missing required fields/);
    });

    it('returns 400 when imageType is missing', async () => {
      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Missing required fields/);
    });

    it('returns 400 when imageType is invalid', async () => {
      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'video' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/imageType must be/);
    });

    it('returns 400 when imageDataUrl is not a data URL', async () => {
      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'https://example.com/img.png', imageType: 'image' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid data URL/);
    });

    it('returns 400 when user already submitted today', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(true);

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'image' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already submitted/);
    });

    it('returns 400 when no caption available', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(getTodayCaption).mockResolvedValue(null);

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'image' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No caption available/);
    });

    it('returns 200 and updates streak on successful submission', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(getTodayCaption).mockResolvedValue('Today caption');
      vi.mocked(handleMemeSubmission).mockResolvedValue({
        success: true,
        oderId: 'oder_123',
        redditImageUrl: 'https://i.redd.it/img.jpg',
      });

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'image' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateStreak).toHaveBeenCalledWith('user123', expect.any(String));
    });

    it('does not update streak when submission fails', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(getTodayCaption).mockResolvedValue('Today caption');
      vi.mocked(handleMemeSubmission).mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/png;base64,abc', imageType: 'image' });

      expect(res.status).toBe(500);
      expect(updateStreak).not.toHaveBeenCalled();
    });

    it('accepts gif imageType', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(getTodayCaption).mockResolvedValue('Caption');
      vi.mocked(handleMemeSubmission).mockResolvedValue({
        success: true,
        oderId: 'oder_123',
        redditImageUrl: 'https://i.redd.it/img.gif',
      });

      const res = await request(appRef.current)
        .post('/api/submit-meme')
        .send({ imageDataUrl: 'data:image/gif;base64,abc', imageType: 'gif' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/submit', () => {
    it('returns 401 when userId is missing', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: 'Test' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when username is missing', async () => {
      mockReddit.getCurrentUsername.mockResolvedValue(null);

      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: 'Test' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when imageUrl is missing', async () => {
      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ caption: 'Test caption' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/imageUrl and caption are required/);
    });

    it('returns 400 when caption is missing', async () => {
      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when caption is whitespace only', async () => {
      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Caption cannot be empty/);
    });

    it('returns 400 when imageUrl is not a valid URL', async () => {
      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'not-a-url', caption: 'Test caption' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid URL/);
    });

    it('returns 400 when user already submitted today', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(true);

      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: 'Test caption' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already submitted/);
    });

    it('returns 200 on successful submission', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(storeSubmission).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'user123',
        username: 'TestUser',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Test caption',
        submittedAt: Date.now(),
      });

      const res = await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: 'Test caption' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(storeSubmission).toHaveBeenCalled();
      expect(updateStreak).toHaveBeenCalled();
    });

    it('trims caption before storing', async () => {
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);
      vi.mocked(storeSubmission).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'user123',
        username: 'TestUser',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Trimmed caption',
        submittedAt: Date.now(),
      });

      await request(appRef.current)
        .post('/api/submit')
        .send({ imageUrl: 'https://example.com/img.jpg', caption: '  Trimmed caption  ' });

      expect(storeSubmission).toHaveBeenCalledWith(
        'user123',
        'TestUser',
        'https://example.com/img.jpg',
        'Trimmed caption'
      );
    });
  });

  describe('GET /api/submissions', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/submissions');

      expect(res.status).toBe(401);
    });

    it('returns submissions on success', async () => {
      vi.mocked(getSubmissionsForVoting).mockResolvedValue([
        {
          oderId: 'oder_1',
          userId: 'user1',
          username: 'User1',
          imageUrl: 'https://example.com/1.jpg',
          caption: 'Caption 1',
          submittedAt: Date.now(),
        },
      ]);

      const res = await request(appRef.current).get('/api/submissions');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.submissions).toHaveLength(1);
      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/submission/:oderId', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/submission/oder_123');

      expect(res.status).toBe(401);
    });

    it('returns 404 when submission not found', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue(null);

      const res = await request(appRef.current).get('/api/submission/oder_nonexistent');

      expect(res.status).toBe(404);
    });

    it('returns submission on success', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'user1',
        username: 'User1',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });

      const res = await request(appRef.current).get('/api/submission/oder_123');

      expect(res.status).toBe(200);
      expect(res.body.submission.oderId).toBe('oder_123');
    });
  });

  describe('POST /api/vote', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current)
        .post('/api/vote')
        .send({ oderId: 'oder_123' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when oderId is missing', async () => {
      const res = await request(appRef.current)
        .post('/api/vote')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/oderId is required/);
    });

    it('returns 404 when submission does not exist', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue(null);

      const res = await request(appRef.current)
        .post('/api/vote')
        .send({ oderId: 'oder_nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Submission not found/);
    });

    it('returns 400 when voting on own submission', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'user123',
        username: 'TestUser',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });

      const res = await request(appRef.current)
        .post('/api/vote')
        .send({ oderId: 'oder_123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/own submission/);
    });

    it('returns 400 when already voted', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'other_user',
        username: 'Other',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });
      vi.mocked(hasUserVoted).mockResolvedValue(true);

      const res = await request(appRef.current)
        .post('/api/vote')
        .send({ oderId: 'oder_123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already voted/);
    });

    it('returns 200 on successful vote', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'other_user',
        username: 'Other',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });
      vi.mocked(hasUserVoted).mockResolvedValue(false);
      vi.mocked(castVote).mockResolvedValue(true);
      vi.mocked(getVoteCount).mockResolvedValue(5);

      const res = await request(appRef.current)
        .post('/api/vote')
        .send({ oderId: 'oder_123' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.voted).toBe(true);
      expect(res.body.voteCount).toBe(5);
    });
  });

  describe('GET /api/vote-status/:oderId', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/vote-status/oder_123');

      expect(res.status).toBe(401);
    });

    it('returns 404 when submission not found', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue(null);

      const res = await request(appRef.current).get('/api/vote-status/oder_nonexistent');

      expect(res.status).toBe(404);
    });

    it('returns vote status on success', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'other_user',
        username: 'Other',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });
      vi.mocked(hasUserVoted).mockResolvedValue(true);
      vi.mocked(getVoteCount).mockResolvedValue(3);

      const res = await request(appRef.current).get('/api/vote-status/oder_123');

      expect(res.status).toBe(200);
      expect(res.body.hasVoted).toBe(true);
      expect(res.body.isOwnSubmission).toBe(false);
      expect(res.body.voteCount).toBe(3);
    });

    it('correctly identifies own submission', async () => {
      vi.mocked(getSubmissionByOderId).mockResolvedValue({
        oderId: 'oder_123',
        userId: 'user123',
        username: 'TestUser',
        imageUrl: 'https://example.com/img.jpg',
        caption: 'Caption',
        submittedAt: Date.now(),
      });
      vi.mocked(hasUserVoted).mockResolvedValue(false);
      vi.mocked(getVoteCount).mockResolvedValue(0);

      const res = await request(appRef.current).get('/api/vote-status/oder_123');

      expect(res.status).toBe(200);
      expect(res.body.isOwnSubmission).toBe(true);
    });
  });

  describe('GET /api/user/status', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/user/status');

      expect(res.status).toBe(401);
    });

    it('returns user status on success', async () => {
      vi.mocked(getUserStats).mockResolvedValue({
        username: 'TestUser',
        streak: 3,
        lastParticipation: '2026-02-05',
        wins: 1,
      });
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);

      const res = await request(appRef.current).get('/api/user/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.userId).toBe('user123');
      expect(res.body.username).toBe('TestUser');
      expect(res.body.hasSubmittedToday).toBe(false);
      expect(res.body.stats.streak).toBe(3);
    });

    it('auto-sets username when stats have no username', async () => {
      vi.mocked(getUserStats).mockResolvedValue({
        username: '',
        streak: 0,
        lastParticipation: '',
        wins: 0,
      });
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);

      const res = await request(appRef.current).get('/api/user/status');

      expect(res.status).toBe(200);
      expect(setUsername).toHaveBeenCalledWith('user123', 'TestUser');
      expect(res.body.username).toBe('TestUser');
    });

    it('does not overwrite existing username', async () => {
      vi.mocked(getUserStats).mockResolvedValue({
        username: 'ExistingName',
        streak: 0,
        lastParticipation: '',
        wins: 0,
      });
      vi.mocked(hasUserSubmittedToday).mockResolvedValue(false);

      await request(appRef.current).get('/api/user/status');

      expect(setUsername).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/leaderboard/daily', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/leaderboard/daily');

      expect(res.status).toBe(401);
    });

    it('returns daily leaderboard with default limit', async () => {
      vi.mocked(getDailyLeaderboard).mockResolvedValue([]);

      const res = await request(appRef.current).get('/api/leaderboard/daily');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('daily');
      expect(getDailyLeaderboard).toHaveBeenCalledWith(expect.any(String), 10);
    });

    it('clamps limit to maximum of 100', async () => {
      vi.mocked(getDailyLeaderboard).mockResolvedValue([]);

      await request(appRef.current).get('/api/leaderboard/daily?limit=500');

      expect(getDailyLeaderboard).toHaveBeenCalledWith(expect.any(String), 100);
    });

    it('clamps limit to minimum of 1', async () => {
      vi.mocked(getDailyLeaderboard).mockResolvedValue([]);

      await request(appRef.current).get('/api/leaderboard/daily?limit=-5');

      expect(getDailyLeaderboard).toHaveBeenCalledWith(expect.any(String), 1);
    });
  });

  describe('GET /api/leaderboard/lifetime', () => {
    it('returns 401 when user is not authenticated', async () => {
      setContext({ postId: 'post123' });

      const res = await request(appRef.current).get('/api/leaderboard/lifetime');

      expect(res.status).toBe(401);
    });

    it('returns lifetime leaderboard with default limit', async () => {
      vi.mocked(getLifetimeLeaderboard).mockResolvedValue([]);

      const res = await request(appRef.current).get('/api/leaderboard/lifetime');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('lifetime');
      expect(getLifetimeLeaderboard).toHaveBeenCalledWith(10);
    });

    it('clamps limit to maximum of 100', async () => {
      vi.mocked(getLifetimeLeaderboard).mockResolvedValue([]);

      await request(appRef.current).get('/api/leaderboard/lifetime?limit=999');

      expect(getLifetimeLeaderboard).toHaveBeenCalledWith(100);
    });

    it('clamps limit to minimum of 1', async () => {
      vi.mocked(getLifetimeLeaderboard).mockResolvedValue([]);

      await request(appRef.current).get('/api/leaderboard/lifetime?limit=-5');

      expect(getLifetimeLeaderboard).toHaveBeenCalledWith(1);
    });
  });
});
