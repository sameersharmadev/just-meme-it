# Redis Data Schema

Should be pretty self explanatory :3

## Key Naming Convention

All keys follow the pattern: `{entity}:{identifier}:{sub-identifier}`

Date format: `YYYY-MM-DD` (e.g., `2026-02-05`)

---

## Data Structures

### 1. Daily Submissions

**Key:** `submissions:{date}`

**Type:** Hash

**Description:** Stores all meme submissions for a specific day.

**Structure:**
| Field | Value |
|-------|-------|
| `{oderId}` | JSON string containing submission data |

**Submission Data Schema:**

```json
{
  "userId": "t2_abc123",
  "username": "meme_master",
  "imageUrl": "https://...",
  "caption": "When the code works on first try",
  "submittedAt": 1738747865473
}
```

**Example:**

```
Key: submissions:2026-02-05
Field: oder_xyz789
Value: {"userId":"t2_abc123","username":"meme_master","imageUrl":"https://...","caption":"...","submittedAt":1738747865473}
```

---

### 2. Vote Tracking

**Key:** `votes:{date}:{oderId}`

**Type:** Sorted Set

**Description:** Tracks which users have voted (upvoted) a specific submission on a given day. Prevents duplicate voting. Score represents the timestamp when the vote was cast.

**Members:** User IDs (e.g., `t2_abc123`)

**Score:** Timestamp of when the vote was cast

**Example:**

```
Key: votes:2026-02-05:oder_xyz789
Members with scores:
  t2_user1: 1738747865473
  t2_user2: 1738747866123
  t2_user3: 1738747867890
```

---

### 3. User Profile

**Key:** `user:{userId}`

**Type:** Hash

**Description:** Stores user statistics and participation data.

**Structure:**
| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Reddit username |
| `streak` | number | Consecutive days participated |
| `lastParticipation` | string | Date of last participation (YYYY-MM-DD) |
| `wins` | number | Total number of daily wins |

**Example:**

```
Key: user:t2_abc123
Fields:
  username: meme_master
  streak: 7
  lastParticipation: 2026-02-05
  wins: 3
```

---

### 4. Daily Leaderboard

**Key:** `leaderboard:{date}`

**Type:** Sorted Set

**Description:** Ranked leaderboard for a specific day. Score represents vote count (upvotes).

**Members:** `{oderId}` (submission ID)

**Score:** Number of upvotes received

**Example:**

```
Key: leaderboard:2026-02-05
Members with scores:
  oder_xyz789: 42
  oder_abc123: 38
  oder_def456: 25
```

---

### 5. Lifetime Leaderboard

**Key:** `leaderboard:lifetime`

**Type:** Sorted Set

**Description:** All-time leaderboard tracking cumulative user scores from wins and daily rounds.

**Members:** `{userId}`

**Score:** Total lifetime points

**Example:**

```
Key: leaderboard:lifetime
Members with scores:
  t2_abc123: 1250
  t2_def456: 980
  t2_ghi789: 750
```

---

## Common Operations

### Store a Submission

```typescript
await redis.hSet(`submissions:${date}`, oderId, JSON.stringify(submissionData));
```

### Check if User Submitted Today

```typescript
const submissions = await redis.hGetAll(`submissions:${date}`);
const hasSubmitted = Object.values(submissions).some((data) => JSON.parse(data).userId === userId);
```

### Get Submissions for Voting

```typescript
const submissions = await redis.hGetAll(`submissions:${date}`);
```

### Record a Vote (Upvote)

```typescript
await redis.zAdd(`votes:${date}:${oderId}`, { member: userId, score: Date.now() });
```

### Check if User Already Voted

```typescript
const score = await redis.zScore(`votes:${date}:${oderId}`, userId);
const hasVoted = score !== undefined;
```

### Get Vote Count

```typescript
const voteCount = await redis.zCard(`votes:${date}:${oderId}`);
```

### Get Daily Leaderboard

```typescript
const leaders = await redis.zRange(`leaderboard:${date}`, 0, 9, { by: 'rank', reverse: true });
```

### Update User Streak

```typescript
await redis.hSet(`user:${userId}`, { streak: String(newStreak), lastParticipation: date });
```

### Record a Win

```typescript
await redis.hIncrBy(`user:${userId}`, 'wins', 1);
```

### Add to Lifetime Leaderboard

```typescript
await redis.zIncrBy('leaderboard:lifetime', userId, points);
```

### Get Lifetime Leaderboard

```typescript
const leaders = await redis.zRange('leaderboard:lifetime', 0, 9, { by: 'rank', reverse: true });
```
