# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Reddit Devvit game app where users compete daily: everyone gets the same caption, submits a meme for it, then votes on others. Streak tracking, leaderboards, and personal stats powered by Redis.

## Commands

```bash
npm run dev          # Start client + server + devvit playtest (concurrent)
npm run build        # Build client and server for deployment
npm run check        # Type-check + lint:fix + prettier (run before committing)
npm run test         # Vitest single run
npm run test:watch   # Vitest watch mode
npm run deploy       # Build + devvit upload
npm run launch       # Build + upload + publish
```

## Architecture

**Three-part Devvit app:** client (React webview), server (Express API), shared types.

```
src/client/       → React 19 + Tailwind 4 + Vite (browser webview)
src/server/       → Express 5 on Devvit serverless runtime (Node 22 target)
src/shared/       → TypeScript types shared between client and server
```

**Entry points:** `splash.html` (inline default post view) and `game.html` (full game). Server builds to `dist/server/index.cjs`.

**Client communicates with server via `fetch('/api/...')`** — no WebSockets, no URL routing. Navigation is state-driven (`Step = 'view' | 'create' | 'voting'`).

### Server Constraints (Devvit Serverless)

- No `fs`, `http`, `https`, `net` — use `fetch` for external requests
- Read-only filesystem
- Redis via `@devvit/web/server` (not a standard Redis client)
- `reddit` and `context` globals from `@devvit/web/server` for Reddit API access

### Key Services (src/server/services/)

- **submission.ts** — store/retrieve meme submissions in Redis
- **userStats.ts** — streaks, wins, lifetime scores, leaderboard queries
- **voting.ts** — vote casting, validation, vote counts
- **scheduler.ts** — daily post/caption management

### Redis Key Patterns

- `submissions:{date}` — hash of daily submissions
- `leaderboard:{date}` — sorted set of submissions by vote count
- `leaderboard:lifetime` — sorted set of users by lifetime score
- `leaderboard:streaks` — sorted set of users by streak
- `user:{userId}` — hash with username, streak, lastParticipation, wins

### Client Patterns

- Functional components only, state via React hooks
- Custom hooks: `useCaption()` (today's caption + mod status), `useUserStatus()` (submission status, streak)
- UI style: neobrutalist — thick black borders (`border-3`/`border-4`), hard drop shadows (`shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`), `bg-paper-white`, yellow-400 accents, rounded-2xl cards
- Modal pattern (Leaderboard, MyStats): fixed overlay with backdrop + centered card, fetch on open
- FontAwesome for icons (`@fortawesome/react-fontawesome`)

## Style Preferences

- Type aliases over interfaces
- Config files are assumed working — bugs are in code, not config
- `@typescript-eslint/no-floating-promises` is enforced (use `void` prefix for fire-and-forget)
