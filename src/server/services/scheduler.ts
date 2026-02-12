import { redis, reddit } from '@devvit/web/server';
import captions from '../../../captions.json';

/**
 * Ensures today's caption post exists. If not, creates it automatically.
 * This is called at the start of every API request to provide "lazy-loading"
 * of the daily post - perfect for serverless environments.
 * 
 * Uses a Redis lock to prevent race conditions when multiple users
 * access the app simultaneously.
 * 
 * @returns true if post was created, false if it already existed
 */
export async function ensureTodayPost(): Promise<boolean> {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const existingPostId = await redis.get(`day:${dateKey}:postId`);
  if (existingPostId) {
    return false;
  }

  const lockKey = `lock:daily-post:${dateKey}`;
  const lockExpiry = new Date(Date.now() + 60000);
  const retryDelays = [500, 1000, 2000];

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    const lockAcquired = await redis.set(lockKey, '1', { nx: true, expiration: lockExpiry });

    if (!lockAcquired) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      const postId = await redis.get(`day:${dateKey}:postId`);
      if (postId) {
        return false;
      }
      continue;
    }

    try {
      const existingPost = await redis.get(`day:${dateKey}:postId`);
      if (existingPost) {
        await redis.del(lockKey);
        return false;
      }

      await postDailyCaption();
      console.log(`[Auto-Create] Successfully created daily post for ${dateKey}`);
      return true;
    } finally {
      await redis.del(lockKey);
    }
  }

  // All retry attempts failed - check if another process created the post
  const postId = await redis.get(`day:${dateKey}:postId`);
  if (postId) {
    return false;
  }
  console.error(`[Scheduler] Failed to acquire lock for ${dateKey} after ${retryDelays.length} attempts`);
  return false;
}

/**
 * Creates a new daily caption post.
 * 
 * This function:
 * 1. Retrieves the current caption index from KV store
 * 2. Gets the next caption from captions.json (rotating through the list)
 * 3. Creates a new Reddit post with the caption as the title
 * 4. Stores the caption and post ID in KV with the current date as the key
 * 5. Increments the caption index for tomorrow
 */
async function postDailyCaption(): Promise<void> {
  try {
    // Get the current date in YYYY-MM-DD format (UTC)
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; 

    console.log(`[Scheduler] Starting daily caption post for ${dateKey}`);

    // Get the current caption index from KV (defaults to 0)
    const indexStr = await redis.get('caption:index');
    const currentIndex = indexStr ? parseInt(indexStr, 10) : 0;

    // Get the next caption (rotate through the list)
    const captionsList = captions.captions;
    const caption = captionsList[currentIndex % captionsList.length];

    if (!caption) {
      throw new Error('No caption available at current index');
    }

    console.log(`[Scheduler] Selected caption #${currentIndex}: "${caption}"`);

    // Create the Reddit post with the caption as the title
    const post = await reddit.submitCustomPost({
      title: caption,
    });

    console.log(`[Scheduler] Created post with ID: ${post.id}`);

    // Store the caption and post ID in KV for this day
    await Promise.all([
      redis.set(`day:${dateKey}:caption`, caption),
      redis.set(`day:${dateKey}:postId`, post.id),
      // Increment the index for tomorrow's caption
      redis.set('caption:index', String((currentIndex + 1) % captionsList.length)),
    ]);

    console.log(`[Scheduler] Successfully stored caption and post data for ${dateKey}`);
    console.log(`[Scheduler] Next caption index will be: ${(currentIndex + 1) % captionsList.length}`);

  } catch (error) {
    console.error('[Scheduler] Error in postDailyCaption:', error);
    throw error;
  }
}

/**
 * Get today's caption from KV store.
 * This should be called by other parts of the app that need the current day's caption.
 * 
 * @returns The caption for today, or null if not yet posted
 */
export async function getTodayCaption(): Promise<string | null> {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const result = await redis.get(`day:${dateKey}:caption`);
  return result ?? null;
}

/**
 * Get today's post ID from KV store.
 * This should be called by other parts of the app that need the current day's post ID.
 * 
 * @returns The post ID for today, or null if not yet posted
 */
export async function getTodayPostId(): Promise<string | null> {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const result = await redis.get(`day:${dateKey}:postId`);
  return result ?? null;
}
