import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { ensureTodayPost, getTodayCaption, getTodayPostId } from './services/scheduler';
import { handleMemeSubmission, SubmitMemeRequest, SubmitMemeResponse } from './services/submit';
import { hasUserSubmittedToday } from './services/submission';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

app.use(async (_req, _res, next) => {
  try {
    await ensureTodayPost();
  } catch (error) {
    console.error('[Middleware] Failed to ensure daily post:', error);
  }
  next();
});

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

// API endpoint to get today's caption (for client use)
router.get('/api/today-caption', async (_req, res): Promise<void> => {
  try {
    const [caption, postId, username] = await Promise.all([
      getTodayCaption(),
      getTodayPostId(),
      reddit.getCurrentUsername(),
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
    });
  } catch (error) {
    console.error(`Error fetching today's caption: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch today\'s caption',
    });
  }
});

// API endpoint to submit a meme
router.post<unknown, SubmitMemeResponse, SubmitMemeRequest>(
  '/api/submit-meme',
  async (req, res): Promise<void> => {
    try {
      const [username, currentUser] = await Promise.all([
        reddit.getCurrentUsername(),
        reddit.getCurrentUser(),
      ]);
      if (!username || !currentUser?.id) {
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
      if (!imageDataUrl || !imageType) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }
      const result = await handleMemeSubmission(userId, username, caption, imageDataUrl, imageType);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error('Error in /api/submit-meme:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

app.use(router);

const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
