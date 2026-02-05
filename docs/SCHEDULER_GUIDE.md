# Daily Caption Scheduler - Implementation Guide

## ✨ Automatic Lazy-Loading Approach

This implementation uses **automatic lazy-loading** to create daily posts - perfect for serverless environments like Devvit Web.

### How It Works

**No manual intervention needed!** The system automatically creates today's post when:
- Any user opens the app
- Any API endpoint is called
- First request of the day triggers post creation

This is called "lazy initialization" - the post is created on-demand when needed, which fits perfectly with serverless architecture.

### Flow

1. User opens the meme game app
2. Middleware checks: "Does today's post exist in KV?"
3. If NO → Automatically creates it with next caption
4. If YES → Continues normally
5. All future requests that day use the existing post

### Race Condition Protection

The system uses Redis locks to prevent multiple users from creating duplicate posts if they access the app simultaneously:
- First request acquires a lock
- Creates the post
- Releases the lock
- Concurrent requests wait and use the created post

### Middleware Auto-Creation

Every API request goes through middleware that ensures today's post exists:

```typescript
app.use(async (_req, _res, next) => {
  await ensureTodayPost(); 
  next();
});
```

### API Endpoints Available

#### Get Today's Caption
```
GET /api/today-caption
```
Returns:
```json
{
  "caption": "When you finally understand the assignment",
  "postId": "abc123",
  "date": "2026-02-05"
}
```

## How the Caption Rotation Works

1. **Caption Storage**: All captions are stored in [`captions.json`](captions.json) at the root
2. **Index Tracking**: Redis stores a `caption:index` key that tracks which caption is next
3. **Daily Storage**: Each day's data is stored as:
   - `day:YYYY-MM-DD:caption` - The caption text
   - `day:YYYY-MM-DD:postId` - The Reddit post ID
   - `lock:daily-post:YYYY-MM-DD` - Temporary lock (60s) to prevent race conditions
4. **Rotation**: After posting, the index increments (wraps around at 30 captions)

## Advantages

✅ **Fully Automatic** - Zero manual intervention required  
✅ **Serverless-Friendly** - Works perfectly in Devvit Web's Lambda-like environment  
✅ **Race-Condition Safe** - Redis locks prevent duplicate posts  
✅ **User-Driven** - Post appears when users actually need it  
✅ **Simple & Elegant** - Clean implementation without external dependencies  
✅ **Cost-Effective** - No external cron services needed  

## Trade-offs

⚠️ **Timing**: Post is created when first user arrives (not exactly 12:00 AM UTC)  
⚠️ **First Request Delay**: Slight delay on first API call of the day (~1-2s for post creation)

For a hackathon/MVP, these trade-offs are acceptable. Users care about having a daily challenge, not the exact timestamp it was created.

## Files

- [`captions.json`](captions.json) - 30 rotating meme captions
- [`src/server/scheduler.ts`](src/server/scheduler.ts) - Lazy-loading logic with race condition protection
- [`src/server/index.ts`](src/server/index.ts) - Middleware integration and API endpoints
- [`devvit.json`](devvit.json) - App configuration

## Testing

```bash
# Start development server
npm run dev

# Access your test subreddit
# Open the app - daily post is auto-created!
# Check Redis to see stored data:
# - caption:index
# - day:2026-02-05:caption
# - day:2026-02-05:postId
```

## Production Considerations

If you absolutely need posts at exactly 12:00 AM UTC (not recommended for MVP):

### Option 1: External Cron Service

Use GitHub Actions to make a "wake-up" call:

```yaml
name: Wake Daily Post
on:
  schedule:
    - cron: '0 0 * * *'  # 12:00 AM UTC
jobs:
  wake:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger lazy load
        run: curl https://your-app-url/api/today-caption
```

This triggers the lazy-loading at a specific time.

### Option 2: Traditional Devvit App

Switch from Devvit Web to traditional Devvit for built-in scheduler support (but lose React/custom UI).

## Summary

✅ **What Works**: Automatic daily caption posting when users access the app  
✅ **What's Stored**: Captions, post IDs, and rotation index in Redis  
✅ **What's Protected**: Race conditions prevented with Redis locks  
✅ **What's Automatic**: Everything - zero manual intervention  