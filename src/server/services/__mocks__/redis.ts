type ZSetEntry = { member: string; score: number };

const stringStore: Map<string, string> = new Map();
const hashStore: Map<string, Map<string, string>> = new Map();
const zsetStore: Map<string, ZSetEntry[]> = new Map();

export function clearMockRedis(): void {
  stringStore.clear();
  hashStore.clear();
  zsetStore.clear();
}

export const redis = {
  get: async (key: string): Promise<string | undefined> => {
    return stringStore.get(key);
  },

  set: async (
    key: string,
    value: string,
    options?: { nx?: boolean; expiration?: Date }
  ): Promise<string | null> => {
    if (options?.nx && stringStore.has(key)) {
      return null;
    }
    stringStore.set(key, value);
    return 'OK';
  },

  del: async (key: string): Promise<number> => {
    const existed = stringStore.has(key);
    stringStore.delete(key);
    return existed ? 1 : 0;
  },

  incrBy: async (key: string, increment: number): Promise<number> => {
    const current = parseInt(stringStore.get(key) ?? '0', 10);
    const newValue = current + increment;
    stringStore.set(key, String(newValue));
    return newValue;
  },

  hSet: async (key: string, fields: Record<string, string>): Promise<number> => {
    if (!hashStore.has(key)) {
      hashStore.set(key, new Map());
    }
    const hash = hashStore.get(key)!;
    let count = 0;
    for (const [field, value] of Object.entries(fields)) {
      if (!hash.has(field)) count++;
      hash.set(field, value);
    }
    return count;
  },

  hGet: async (key: string, field: string): Promise<string | undefined> => {
    const hash = hashStore.get(key);
    return hash?.get(field);
  },

  hGetAll: async (key: string): Promise<Record<string, string>> => {
    const hash = hashStore.get(key);
    if (!hash) return {};
    const result: Record<string, string> = {};
    for (const [field, value] of hash.entries()) {
      result[field] = value;
    }
    return result;
  },

  hIncrBy: async (key: string, field: string, increment: number): Promise<number> => {
    if (!hashStore.has(key)) {
      hashStore.set(key, new Map());
    }
    const hash = hashStore.get(key)!;
    const current = parseInt(hash.get(field) ?? '0', 10);
    const newValue = current + increment;
    hash.set(field, String(newValue));
    return newValue;
  },

  zAdd: async (key: string, entry: ZSetEntry): Promise<number> => {
    if (!zsetStore.has(key)) {
      zsetStore.set(key, []);
    }
    const zset = zsetStore.get(key)!;
    const existingIndex = zset.findIndex((e) => e.member === entry.member);
    if (existingIndex >= 0) {
      zset[existingIndex] = entry;
      return 0;
    }
    zset.push(entry);
    return 1;
  },

  zScore: async (key: string, member: string): Promise<number | undefined> => {
    const zset = zsetStore.get(key);
    const entry = zset?.find((e) => e.member === member);
    return entry?.score;
  },

  zCard: async (key: string): Promise<number> => {
    const zset = zsetStore.get(key);
    return zset?.length ?? 0;
  },

  zIncrBy: async (key: string, member: string, increment: number): Promise<number> => {
    if (!zsetStore.has(key)) {
      zsetStore.set(key, []);
    }
    const zset = zsetStore.get(key)!;
    const existingIndex = zset.findIndex((e) => e.member === member);
    if (existingIndex >= 0) {
      zset[existingIndex]!.score += increment;
      return zset[existingIndex]!.score;
    }
    zset.push({ member, score: increment });
    return increment;
  },

  zRange: async (
    key: string,
    start: number,
    stop: number,
    options?: { by?: string; reverse?: boolean }
  ): Promise<ZSetEntry[]> => {
    const zset = zsetStore.get(key);
    if (!zset) return [];
    const sorted = [...zset].sort((a, b) =>
      options?.reverse ? b.score - a.score : a.score - b.score
    );
    return sorted.slice(start, stop + 1);
  },
};
