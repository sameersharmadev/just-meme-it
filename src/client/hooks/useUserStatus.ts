import { useEffect, useState, useCallback } from 'react';
import type { UserStats } from '../../shared/types/submission';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

type UserStatusState = {
  userId: string | null;
  username: string;
  hasSubmittedToday: boolean;
  submittedOderId: string | null;
  streak: number;
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
};

export const useUserStatus = () => {
  const [state, setState] = useState<UserStatusState>({
    userId: null,
    username: 'anonymous',
    hasSubmittedToday: false,
    submittedOderId: null,
    streak: 0,
    stats: null,
    loading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetchWithTimeout('/api/user/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to fetch user status');
      }
      setState({
        userId: data.userId,
        username: data.username,
        hasSubmittedToday: data.hasSubmittedToday,
        submittedOderId: data.submittedOderId ?? null,
        streak: data.stats?.streak ?? 0,
        stats: data.stats,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to fetch user status', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load user status',
      }));
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { ...state, refetch: fetchStatus };
};
