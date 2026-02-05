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

**Type:** Set

**Description:** Tracks which users have voted for a specific submission on a given day. Prevents duplicate voting.

**Members:** User IDs (e.g., `t2_abc123`)

**Example:**

```
Key: votes:2026-02-05:oder_xyz789
Members: ["t2_user1", "t2_user2", "t2_user3"]
```

---

### 3. User Profile

**Key:** `user:{userId}`

**Type:** Hash

**Description:** Stores user statistics and participation data.

**Structure:**
| Field | Type | Description |
|-------|------|-------------|
| `totalScore` | number | Cumulative points earned |
| `streak` | number | Consecutive days participated |
| `lastParticipation` | string | Date of last participation (YYYY-MM-DD) |
| `wins` | number | Total number of daily wins |

**Example:**

```
Key: user:t2_abc123
Fields:
  totalScore: 1250
  streak: 7
  lastParticipation: 2026-02-05
  wins: 3
```

---

### 4. Daily Leaderboard

**Key:** `leaderboard:{date}`

**Type:** Sorted Set

**Description:** Ranked leaderboard for a specific day. Score represents vote count.

**Members:** `{oderId}` (submission ID)

**Score:** Number of votes received

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

**Description:** All-time leaderboard tracking cumulative user scores.

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

### Record a Vote

```typescript
await redis.sAdd(`votes:${date}:${oderId}`, userId);
await redis.zIncrBy(`leaderboard:${date}`, oderId, 1);
```

### Check if User Already Voted

```typescript
const hasVoted = await redis.sIsMember(`votes:${date}:${oderId}`, userId);
```

### Get Daily Leaderboard

```typescript
const leaders = await redis.zRange(`leaderboard:${date}`, 0, 9, { reverse: true });
```

### Update User Stats

```typescript
await redis.hIncrBy(`user:${userId}`, 'totalScore', points);
await redis.hSet(`user:${userId}`, 'lastParticipation', date);
```
