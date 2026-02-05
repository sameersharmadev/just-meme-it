import express from 'express';
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

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

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
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
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

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

router.post('/api/test/submit', async (req, res): Promise<void> => {
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

router.get('/api/test/submissions', async (_req, res): Promise<void> => {
  try {
    const submissions = await getSubmissionsForVoting();
    res.json({ status: 'success', submissions, count: submissions.length });
  } catch (error) {
    console.error('Test get submissions error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

router.get('/api/test/submission/:oderId', async (req, res): Promise<void> => {
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

router.post('/api/test/vote', async (req, res): Promise<void> => {
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

router.get('/api/test/vote-status/:oderId', async (req, res): Promise<void> => {
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

router.get('/api/test/user-status', async (_req, res): Promise<void> => {
  try {
    const userId = context.userId ?? 'test_user';
    const username = await reddit.getCurrentUsername();
    const hasSubmitted = await hasUserSubmittedToday(userId);

    res.json({
      status: 'success',
      userId,
      username: username ?? 'anonymous',
      hasSubmittedToday: hasSubmitted,
      date: getTodayDate(),
    });
  } catch (error) {
    console.error('Test user status error:', error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
