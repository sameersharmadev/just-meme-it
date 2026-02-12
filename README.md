<img width="627" height="212" alt="image" src="https://github.com/user-attachments/assets/a0595854-fe6f-4ce9-ae3e-23e91d28b769" /><br>
Just Meme It is a Devvit-powered daily meme competition game where users rise to the top through creativity, humor, and consistency.

Every day, a new caption drops. The community responds. The funniest memes win.

---

## Overview

Just Meme It transforms Reddit’s meme culture into a structured, fair, and competitive daily experience.

- A new caption is automatically posted every day at **12:00 AM UTC**
- Users submit an image or GIF that fits the caption
- Optional custom text can be added to enhance the meme
- Submissions are viewed in a swipeable card-style interface
- Users vote on memes they find funny
- Top-voted memes rise to the leaderboard

---

## Core Features

### Daily Caption System

- One caption per day
- Automatically scheduled
- Creates a fresh competitive cycle every 24 hours

### Meme Submissions

- Users reply with an image or GIF
- Optional text overlay supported
- One submission per user per day

### Swipe-to-Vote Interface

- Memes are displayed as swipeable cards
- Simple, fast voting experience
- Designed for high engagement

### Fairness Mechanism (Anti-Bury System)

To ensure equal visibility for all submissions:

- Before a user’s submission is confirmed, they must vote on **5 randomly ordered memes**
- After submission, additional memes are shown in **random order**
- Early posts cannot dominate purely due to timing
- No meme gets buried
- Every submission has a fair chance to be seen and win

---

## Leaderboards

We support two competitive layers:

### Points Leaderboard

- Tracks total accumulated votes
- Rewards overall meme performance

### Streak Leaderboard

- Tracks consecutive daily participation
- Rewards consistency and dedication

This enables two play styles:
- Compete for daily dominance
- Build long-term meme supremacy

---

## User Stats

Each user can track:

- Total wins
- Current streak
- Longest streak
- Total votes received
- Historical performance

This adds progression and long-term engagement beyond single-day results.

---

## Architecture Overview

Built using Devvit with a structured client-server approach.

### Key Components

- **Daily Scheduler**
  - Automatically posts caption at 12:00 AM UTC

- **Submission System**
  - Stores daily entries

- **Voting Engine**
  - Randomized distribution
  - Prevents self-voting
  - Prevents duplicate votes

- **Leaderboard Engine**
  - Daily winner calculation
  - Lifetime points aggregation
  - Streak tracking

- **Redis Storage**
  - Submissions
  - Votes
  - User stats
  - Streak data

---

## Fairness & Integrity

We implemented multiple safeguards:

- Forced pre-submission voting
- Randomized meme distribution
- Vote deduplication
- Self-vote prevention
- Equal exposure model

The system ensures visibility is earned by engagement, not timing.

---

## Daily Flow

1. Caption drops at 12:00 AM UTC
2. Users submit memes
3. Users vote via swipe interface
4. Votes accumulate
5. Daily leaderboard updates
6. Streaks and points update
7. Cycle resets the next day

---

## Future Improvements

- Weekly themed challenges
- Tiered ranking system
- Meme categories
- Badge and achievement system
- Seasonal tournaments

---

## Vision

Just Meme It is designed specifically for Reddit’s ecosystem, where humor and community interaction already thrive.

It turns passive scrolling into active participation and transforms meme culture into a fair, competitive daily experience.
