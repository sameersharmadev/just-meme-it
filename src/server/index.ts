import express, { type Request, type Response, type NextFunction } from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import {
  storeSubmission,
  hasUserSubmittedToday,
  getSubmissionsForVoting,
  getSubmissionByOderId,
} from './services/submission';
import { castVote, hasUserVoted, isOwnSubmission, getVoteCount } from './services/voting';
import {
  getUserStats,
  updateStreak,
  recordWin,
  addLifetimeScore,
  getDailyLeaderboard,
  getLifetimeLeaderboard,
  setUsername,
} from './services/userStats';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

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

async function requireModerator(_req: Request, res: Response, next: NextFunction): Promise<void> {
  const isMod = await isSubredditModerator();
  if (!isMod) {
    res.status(403).json({ status: 'error', message: 'Moderator access required' });
    return;
  }
  next();
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
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
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

router.post('/api/submit', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = context.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const { imageUrl, caption } = req.body as { imageUrl?: string; caption?: string };
    if (!imageUrl || !caption) {
      res.status(400).json({ status: 'error', message: 'imageUrl and caption are required' });
      return;
    }

    const alreadySubmitted = await hasUserSubmittedToday(userId);
    if (alreadySubmitted) {
      res.status(400).json({ status: 'error', message: 'You have already submitted today' });
      return;
    }

    const submission = await storeSubmission(userId, username ?? 'anonymous', imageUrl, caption);
    await updateStreak(userId, getTodayDate());

    res.json({ status: 'success', submission });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/submissions', async (_req, res): Promise<void> => {
  try {
    const submissions = await getSubmissionsForVoting();
    res.json({ status: 'success', submissions, count: submissions.length });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
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
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/vote', async (req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const { oderId } = req.body as { oderId: string };
    const date = getTodayDate();

    if (!oderId) {
      res.status(400).json({ status: 'error', message: 'oderId is required' });
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

    res.json({ status: 'success', voted: success, voteCount });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/vote-status/:oderId', async (req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
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
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/user/status', async (_req, res): Promise<void> => {
  try {
    const userId = context.userId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const username = await reddit.getCurrentUsername();
    const [stats, hasSubmitted] = await Promise.all([
      getUserStats(userId),
      hasUserSubmittedToday(userId),
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
      date: getTodayDate(),
      stats,
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/leaderboard/daily', async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const date = getTodayDate();
    const leaderboard = await getDailyLeaderboard(date, limit);
    res.json({ status: 'success', type: 'daily', date, leaderboard });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/leaderboard/lifetime', async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await getLifetimeLeaderboard(limit);
    res.json({ status: 'success', type: 'lifetime', leaderboard });
  } catch (error) {
    console.error('Lifetime leaderboard error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/submit', requireModerator, async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = context.userId ?? 'test_user';
    const { imageUrl, caption } = req.body as { imageUrl?: string; caption?: string };

    const alreadySubmitted = await hasUserSubmittedToday(userId);
    if (alreadySubmitted) {
      res.status(400).json({ status: 'error', message: 'User already submitted today' });
      return;
    }

    const submission = await storeSubmission(
      userId,
      username ?? 'anonymous',
      imageUrl ?? 'https://example.com/test-meme.jpg',
      caption ?? 'Test meme caption'
    );

    res.json({ status: 'success', submission });
  } catch (error) {
    console.error('Test submit error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/submissions', requireModerator, async (_req, res): Promise<void> => {
  try {
    const submissions = await getSubmissionsForVoting();
    res.json({ status: 'success', submissions, count: submissions.length });
  } catch (error) {
    console.error('Test get submissions error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/submission/:oderId', requireModerator, async (req, res): Promise<void> => {
  try {
    const { oderId } = req.params;
    const submission = await getSubmissionByOderId(oderId);
    if (!submission) {
      res.status(404).json({ status: 'error', message: 'Submission not found' });
      return;
    }
    res.json({ status: 'success', submission });
  } catch (error) {
    console.error('Test get submission error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/vote', requireModerator, async (req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const { oderId } = req.body as { oderId: string };
    const date = getTodayDate();

    if (!oderId) {
      res.status(400).json({ status: 'error', message: 'oderId is required' });
      return;
    }

    const isOwn = await isOwnSubmission(userId, oderId, date);
    if (isOwn) {
      res.status(400).json({ status: 'error', message: 'Cannot vote on your own submission' });
      return;
    }

    const alreadyVoted = await hasUserVoted(userId, oderId, date);
    if (alreadyVoted) {
      res.status(400).json({ status: 'error', message: 'User already voted on this submission' });
      return;
    }

    const success = await castVote(userId, oderId, date);
    const voteCount = await getVoteCount(oderId, date);

    res.json({ status: 'success', voted: success, voteCount });
  } catch (error) {
    console.error('Test vote error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/vote-status/:oderId', requireModerator, async (req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const { oderId } = req.params;
    const date = getTodayDate();

    const [hasVoted, isOwn, voteCount] = await Promise.all([
      hasUserVoted(userId, oderId, date),
      isOwnSubmission(userId, oderId, date),
      getVoteCount(oderId, date),
    ]);

    res.json({ status: 'success', hasVoted, isOwnSubmission: isOwn, voteCount });
  } catch (error) {
    console.error('Test vote status error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/user-status', requireModerator, async (_req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const username = await reddit.getCurrentUsername();
    const [stats, hasSubmitted] = await Promise.all([
      getUserStats(userId),
      hasUserSubmittedToday(userId),
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
      date: getTodayDate(),
      stats,
    });
  } catch (error) {
    console.error('Test user status error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/update-streak', requireModerator, async (_req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const username = await reddit.getCurrentUsername();
    const date = getTodayDate();

    if (username) {
      await setUsername(userId, username);
    }

    const newStreak = await updateStreak(userId, date);
    res.json({
      status: 'success',
      userId,
      username: username ?? 'anonymous',
      date,
      streak: newStreak,
    });
  } catch (error) {
    console.error('Test update streak error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/record-win', requireModerator, async (req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const username = await reddit.getCurrentUsername();
    const { points } = req.body as { points?: number };
    const winPoints = points ?? 100;

    if (username) {
      await setUsername(userId, username);
    }

    const newWins = await recordWin(userId);
    const newLifetimeScore = await addLifetimeScore(userId, winPoints);

    res.json({
      status: 'success',
      userId,
      username: username ?? 'anonymous',
      wins: newWins,
      pointsAwarded: winPoints,
      lifetimeScore: newLifetimeScore,
    });
  } catch (error) {
    console.error('Test record win error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/add-lifetime-score', requireModerator, async (req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const username = await reddit.getCurrentUsername();
    const { points } = req.body as { points?: number };
    const pointsToAdd = points ?? 10;

    if (username) {
      await setUsername(userId, username);
    }

    const newLifetimeScore = await addLifetimeScore(userId, pointsToAdd);

    res.json({
      status: 'success',
      userId,
      username: username ?? 'anonymous',
      pointsAdded: pointsToAdd,
      lifetimeScore: newLifetimeScore,
    });
  } catch (error) {
    console.error('Test add lifetime score error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.post('/api/test/simulate-vote', requireModerator, async (req, res): Promise<void> => {
  try {
    const { oderId, votes } = req.body as { oderId: string; votes?: number };
    const date = getTodayDate();
    const votesToAdd = votes ?? 1;

    if (!oderId) {
      res.status(400).json({ status: 'error', message: 'oderId is required' });
      return;
    }

    await redis.zIncrBy(`leaderboard:${date}`, oderId, votesToAdd);
    const newVoteCount = await redis.zScore(`leaderboard:${date}`, oderId);

    res.json({
      status: 'success',
      oderId,
      votesAdded: votesToAdd,
      totalVotes: newVoteCount,
    });
  } catch (error) {
    console.error('Test simulate vote error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/leaderboard/daily', requireModerator, async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const date = getTodayDate();
    const leaderboard = await getDailyLeaderboard(date, limit);
    res.json({ status: 'success', type: 'daily', date, leaderboard });
  } catch (error) {
    console.error('Test daily leaderboard error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/leaderboard/lifetime', requireModerator, async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await getLifetimeLeaderboard(limit);
    res.json({ status: 'success', type: 'lifetime', leaderboard });
  } catch (error) {
    console.error('Test lifetime leaderboard error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

app.use(router);

const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
