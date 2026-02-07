You are helping me build a Reddit Devvit Web app for a hackathon.

APP IDEA (IMPORTANT CONTEXT):
This is a daily meme game on Reddit.

Core flow:
- Exactly ONE caption per day.
- At 12:00 AM UTC, the bot posts a daily caption as a Reddit post.
- Users reply with ONE meme (image or GIF) per day.
- A submission is stored as PENDING at first.
- After submitting, the user must vote/skip at least N randomly selected other submissions (forced voting queue).
- Only after completing N votes does the user’s submission become PUBLISHED.
- After that, the user may optionally browse and vote more

TECH STACK / CONSTRAINTS:
- Using Devvit Web (server / client / shared folders).
- NO external backend.
- Use Devvit KV store (Redis-like) for persistence.
- Scheduler must run on the SERVER side.
- Client must NEVER decide captions or timing.
- Captions are pre-written and stored in a JSON file.
- Scheduler chooses the caption and stores it in KV.
- Everything else reads today’s caption from KV.

ARCHITECTURE DECISIONS (LOCKED):
- One caption per day (no multiple captions).
- Captions rotate from a JSON list.
- Caption + postId are written to KV as the single source of truth.
- Scheduler time: 12:00 AM UTC daily.
- Folder structure:
  - server/ → scheduler, listeners, KV logic
  - client/ → UI only
  - shared/ → types and constants only


Assume this is an MVP for a hackathon and correctness + clarity with polish matter more than features.