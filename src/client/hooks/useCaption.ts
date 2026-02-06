import { useEffect, useState } from 'react';

type CaptionData = {
  caption: string;
  postId: string;
  date: string;
  username: string;
};

type CaptionState = {
  caption: string | null;
  postId: string | null;
  date: string | null;
  username: string;
  loading: boolean;
  error: string | null;
};

export const useCaption = () => {
  const [state, setState] = useState<CaptionState>({
    caption: null,
    postId: null,
    date: null,
    username: 'anonymous',
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchCaption = async () => {
      try {
        const res = await fetch('/api/today-caption');
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('No caption posted yet');
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data: CaptionData = await res.json();
        setState({
          caption: data.caption,
          postId: data.postId,
          date: data.date,
          username: data.username,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Failed to fetch caption', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load caption',
        }));
      }
    };
    void fetchCaption();
  }, []);

  return state;
};
