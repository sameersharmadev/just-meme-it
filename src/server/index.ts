import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { ensureTodayPost, getTodayCaption, getTodayPostId } from './services/scheduler';
import { handleMemeSubmission, SubmitMemeRequest, SubmitMemeResponse } from './services/submit';
import {
  storeSubmission,
  hasUserSubmittedToday,
  getUserSubmissionOderId,
  getSubmissionsForVoting,
  getSubmissionByOderId,
} from './services/submission';
import { castVote, hasUserVoted, isOwnSubmission, getVoteCount } from './services/voting';
import {
  getUserStats,
  updateStreak,
  getDailyLeaderboard,
  getLifetimeLeaderboard,
  getStreakLeaderboard,
  setUsername,
} from './services/userStats';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.text({ limit: '500kb' }));

app.use(async (_req, _res, next) => {
  try {
    await ensureTodayPost();
  } catch (error) {
    console.error('[Middleware] Failed to ensure daily post:', error);
  }
  next();
});

const router = express.Router();

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

async function isSubredditModerator(): Promise<boolean> {
  const username = await reddit.getCurrentUsername();
  if (!username || !context.subredditName) return false;

  try {
    const moderators = reddit.getModerators({
      subredditName: context.subredditName,
      username,
    });

    for await (const mod of moderators) {
      if (mod.username.toLowerCase() === username.toLowerCase()) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username, isMod] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
        isSubredditModerator(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        isModerator: isMod,
      });
    } catch (error) {
      console.error('API Init Error:', error);
      res.status(500).json({ status: 'error', message: 'Failed to initialize' });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.get('/api/today-caption', async (_req, res): Promise<void> => {
  try {
    const [caption, postId, username, isMod] = await Promise.all([
      getTodayCaption(),
      getTodayPostId(),
      reddit.getCurrentUsername(),
      isSubredditModerator(),
    ]);

    if (!caption || !postId) {
      res.status(404).json({
        status: 'error',
        message: 'No caption posted for today yet',
      });
      return;
    }

    res.json({
      caption,
      postId,
      date: new Date().toISOString().split('T')[0],
      username: username ?? 'anonymous',
      isModerator: isMod,
    });
  } catch (error) {
    console.error(`Error fetching today's caption: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch today\'s caption',
    });
  }
});

router.post<unknown, SubmitMemeResponse, SubmitMemeRequest>(
  '/api/submit-meme',
  async (req, res): Promise<void> => {
    try {
      const [username, currentUser] = await Promise.all([
        reddit.getCurrentUsername(),
        reddit.getCurrentUser(),
      ]);
      if (!username || !currentUser?.id) {
        console.warn('[AUTH] Unauthenticated request to /api/submit-meme');
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }
      const userId = currentUser.id;
      if (await hasUserSubmittedToday(userId)) {
        res.status(400).json({ success: false, error: 'You have already submitted a meme today' });
        return;
      }
      const caption = await getTodayCaption();
      if (!caption) {
        res.status(400).json({ success: false, error: 'No caption available for today' });
        return;
      }
      const { imageDataUrl, imageType } = req.body;
      if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageType || typeof imageType !== 'string') {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }
      if (!imageDataUrl.startsWith('data:image/')) {
        res.status(400).json({ success: false, error: 'imageDataUrl must be a valid data URI starting with data:image/' });
        return;
      }
      // ~5MB base64 encoded = ~6.7M chars
      if (imageDataUrl.length > 7_000_000) {
        res.status(400).json({ success: false, error: 'Image data is too large (max ~5MB)' });
        return;
      }
      if (imageType !== 'image' && imageType !== 'gif') {
        res.status(400).json({ success: false, error: 'imageType must be "image" or "gif"' });
        return;
      }
      const result = await handleMemeSubmission(userId, username, caption, imageDataUrl, imageType);
      if (result.success) {
        console.warn('[SUBMIT] User', userId, 'submitted meme via /api/submit-meme');
      }
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error('Error in /api/submit-meme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit meme',
      });
    }
  }
);

router.post('/api/submit', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/submit');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const { imageUrl, caption, overlays } = req.body as {
      imageUrl?: string;
      caption?: string;
      overlays?: unknown[];
    };
    if (!imageUrl || typeof imageUrl !== 'string' || !caption || typeof caption !== 'string') {
      res.status(400).json({ status: 'error', message: 'imageUrl and caption are required' });
      return;
    }
    if (imageUrl.length > 5000) {
      res.status(400).json({ status: 'error', message: 'imageUrl must be 5000 characters or less' });
      return;
    }
    if (caption.length > 500) {
      res.status(400).json({ status: 'error', message: 'Caption must be 500 characters or less' });
      return;
    }

    // Validate overlays if provided
    let validatedOverlays: { id: string; text: string; x: number; y: number; fontSize: number }[] | undefined;
    if (overlays !== undefined && !Array.isArray(overlays)) {
      res.status(400).json({ status: 'error', message: 'Overlays must be an array' });
      return;
    }
    if (overlays && Array.isArray(overlays)) {
      if (overlays.length > 5) {
        res.status(400).json({ status: 'error', message: 'Maximum 5 text overlays allowed' });
        return;
      }
      validatedOverlays = [];
      for (const o of overlays) {
        const overlay = o as Record<string, unknown>;
        if (
          typeof overlay.id !== 'string' ||
          typeof overlay.text !== 'string' ||
          typeof overlay.x !== 'number' ||
          typeof overlay.y !== 'number' ||
          typeof overlay.fontSize !== 'number'
        ) {
          res.status(400).json({ status: 'error', message: 'Invalid overlay format' });
          return;
        }
        // Strip HTML tags from overlay text
        const sanitizedText = overlay.text.replace(/<[^>]*>/g, '');
        if (sanitizedText.length > 80) {
          res.status(400).json({ status: 'error', message: 'Overlay text must be 80 characters or less' });
          return;
        }
        if (overlay.x < 0 || overlay.x > 100 || overlay.y < 0 || overlay.y > 100) {
          res.status(400).json({ status: 'error', message: 'Overlay positions must be between 0 and 100' });
          return;
        }
        if (overlay.fontSize < 1 || overlay.fontSize > 50) {
          res.status(400).json({ status: 'error', message: 'Overlay fontSize must be between 1 and 50' });
          return;
        }
        validatedOverlays.push({
          id: overlay.id,
          text: sanitizedText,
          x: overlay.x,
          y: overlay.y,
          fontSize: overlay.fontSize,
        });
      }
    }

    const alreadySubmitted = await hasUserSubmittedToday(userId);
    if (alreadySubmitted) {
      res.status(400).json({ status: 'error', message: 'You have already submitted today' });
      return;
    }

    const submission = await storeSubmission(userId, username ?? 'anonymous', imageUrl, caption, validatedOverlays);
    await updateStreak(userId, getTodayDate());
    console.warn('[SUBMIT] User', userId, 'submitted meme', submission.oderId);

    res.json({ status: 'success', submission });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit meme' });
  }
});

router.get('/api/submissions', async (_req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/submissions');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const hasSubmitted = await hasUserSubmittedToday(userId);
    if (!hasSubmitted) {
      res.status(403).json({ status: 'error', message: 'You must submit a meme before viewing submissions' });
      return;
    }

    const submissions = await getSubmissionsForVoting();
    res.json({ status: 'success', submissions, count: submissions.length });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch submissions' });
  }
});

router.get('/api/submission/:oderId', async (req, res): Promise<void> => {
  try {
    const { oderId } = req.params;
    const submission = await getSubmissionByOderId(oderId);
    if (!submission) {
      res.status(404).json({ status: 'error', message: 'Submission not found' });
      return;
    }
    res.json({ status: 'success', submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch submission' });
  }
});

router.post('/api/vote', async (req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/vote');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const { oderId } = req.body as { oderId: string };
    const date = getTodayDate();

    if (!oderId || typeof oderId !== 'string') {
      res.status(400).json({ status: 'error', message: 'oderId is required' });
      return;
    }
    if (oderId.length > 100) {
      res.status(400).json({ status: 'error', message: 'oderId must be 100 characters or less' });
      return;
    }

    const isOwn = await isOwnSubmission(userId, oderId, date);
    if (isOwn) {
      res.status(400).json({ status: 'error', message: 'Cannot vote on your own submission' });
      return;
    }

    const alreadyVoted = await hasUserVoted(userId, oderId, date);
    if (alreadyVoted) {
      res
        .status(400)
        .json({ status: 'error', message: 'You have already voted on this submission' });
      return;
    }

    const success = await castVote(userId, oderId, date);
    const voteCount = await getVoteCount(oderId, date);
    console.warn('[VOTE] User', userId, 'voted on', oderId);

    res.json({ status: 'success', voted: success, voteCount });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process vote' });
  }
});

router.get('/api/vote-status/:oderId', async (req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/vote-status');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const { oderId } = req.params;
    const date = getTodayDate();

    const [hasVoted, isOwn, voteCount] = await Promise.all([
      hasUserVoted(userId, oderId, date),
      isOwnSubmission(userId, oderId, date),
      getVoteCount(oderId, date),
    ]);

    res.json({ status: 'success', hasVoted, isOwnSubmission: isOwn, voteCount });
  } catch (error) {
    console.error('Vote status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch vote status' });
  }
});

router.get('/api/user/status', async (_req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/user/status');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const username = await reddit.getCurrentUsername();
    const [stats, hasSubmitted, submittedOderId] = await Promise.all([
      getUserStats(userId),
      hasUserSubmittedToday(userId),
      getUserSubmissionOderId(userId),
    ]);

    if (username && !stats.username) {
      await setUsername(userId, username);
      stats.username = username;
    }

    res.json({
      status: 'success',
      userId,
      username: stats.username || username || 'anonymous',
      hasSubmittedToday: hasSubmitted,
      submittedOderId,
      date: getTodayDate(),
      stats,
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user status' });
  }
});

router.get('/api/user/my-stats', async (_req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      console.warn('[AUTH] Unauthenticated request to /api/user/my-stats');
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const date = getTodayDate();
    const [stats, submittedOderId] = await Promise.all([
      getUserStats(userId),
      getUserSubmissionOderId(userId),
    ]);

    let todayVotes: number | null = null;
    let todayRank: number | null = null;

    if (submittedOderId) {
      const [voteCount, dailyLeaderboard] = await Promise.all([
        getVoteCount(submittedOderId, date),
        getDailyLeaderboard(date, 100),
      ]);
      todayVotes = voteCount;
      const rankIndex = dailyLeaderboard.findIndex((e) => e.oderId === submittedOderId);
      todayRank = rankIndex >= 0 ? rankIndex + 1 : null;
    }

    const lifetimeScore = (await redis.zScore('leaderboard:lifetime', userId)) ?? 0;

    res.json({
      status: 'success',
      today: submittedOderId
        ? { oderId: submittedOderId, votes: todayVotes, rank: todayRank }
        : null,
      stats: {
        streak: stats.streak,
        wins: stats.wins,
        lifetimeScore,
      },
    });
  } catch (error) {
    console.error('My stats error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user stats' });
  }
});

router.get('/api/leaderboard/daily', async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const date = getTodayDate();
    const leaderboard = await getDailyLeaderboard(date, limit);
    res.json({ status: 'success', type: 'daily', date, leaderboard });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leaderboard' });
  }
});

router.get('/api/leaderboard/lifetime', async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const leaderboard = await getLifetimeLeaderboard(limit);
    res.json({ status: 'success', type: 'lifetime', leaderboard });
  } catch (error) {
    console.error('Lifetime leaderboard error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leaderboard' });
  }
});

router.get('/api/leaderboard/streaks', async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const leaderboard = await getStreakLeaderboard(limit);
    res.json({ status: 'success', type: 'streaks', leaderboard });
  } catch (error) {
    console.error('Streak leaderboard error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leaderboard' });
  }
});

app.use(router);

const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
