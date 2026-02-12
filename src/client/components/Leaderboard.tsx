import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward, faFire } from '@fortawesome/free-solid-svg-icons';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'points' | 'streaks';
}

type LeaderboardTab = 'daily' | 'lifetime' | 'streak';

type DailyEntry = {
  oderId: string;
  username: string;
  votes: number;
};

type LifetimeEntry = {
  userId: string;
  username: string;
  score: number;
};

type StreakEntry = {
  userId: string;
  username: string;
  streak: number;
};

export const Leaderboard = ({ isOpen, onClose, mode }: LeaderboardProps) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(mode === 'streaks' ? 'streak' : 'daily');
  const [dailyData, setDailyData] = useState<DailyEntry[]>([]);
  const [lifetimeData, setLifetimeData] = useState<LifetimeEntry[]>([]);
  const [streakData, setStreakData] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync tab when mode changes externally
  useEffect(() => {
    setActiveTab(mode === 'streaks' ? 'streak' : 'daily');
  }, [mode]);

  // Fetch leaderboard data when modal opens or tab changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = activeTab === 'daily'
          ? '/api/leaderboard/daily?limit=10'
          : activeTab === 'streak'
          ? '/api/leaderboard/streaks?limit=10'
          : '/api/leaderboard/lifetime?limit=10';

        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.status !== 'success') {
          throw new Error(data.message || 'Failed to fetch leaderboard');
        }

        if (activeTab === 'daily') {
          setDailyData(data.leaderboard);
        } else if (activeTab === 'streak') {
          setStreakData(data.leaderboard);
        } else {
          setLifetimeData(data.leaderboard);
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    void fetchLeaderboard();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className="text-yellow-400 text-xl" />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className="text-gray-400 text-xl" />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className="text-amber-600 text-xl" />;
      default:
        return <span className="text-lg font-bold text-gray-700">#{rank}</span>;
    }
  };

  const renderEntries = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-gray-500">Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-red-500">{error}</p>
        </div>
      );
    }

    const entries = activeTab === 'daily'
      ? dailyData
      : activeTab === 'streak'
      ? streakData
      : lifetimeData;

    if (entries.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-gray-500">No entries yet</p>
        </div>
      );
    }

    return entries.map((entry, index) => {
      const rank = index + 1;

      let score: number;
      let key: string;
      if (activeTab === 'daily') {
        score = (entry as DailyEntry).votes;
        key = (entry as DailyEntry).oderId;
      } else if (activeTab === 'streak') {
        score = (entry as StreakEntry).streak;
        key = (entry as StreakEntry).userId;
      } else {
        score = (entry as LifetimeEntry).score;
        key = (entry as LifetimeEntry).userId;
      }

      return (
        <div
          key={key}
          className="bg-white border-3 border-black rounded-lg p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 flex items-center justify-center">
              {getRankIcon(rank)}
            </div>
            <span className="text-lg font-semibold truncate max-w-[150px]">{entry.username}</span>
          </div>
          <div className="bg-black text-white px-3 py-1 rounded-md font-bold">
            {activeTab === 'streak' && <FontAwesomeIcon icon={faFire} className="mr-1" />}
            {score}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90%] max-w-md">
        <div className="bg-paper-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-2xl font-bold hover:text-gray-600 transition-colors"
            aria-label="Close leaderboard"
          >
            ×
          </button>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {mode === 'points' && (
              <>
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex-1 py-2 px-3 font-bold uppercase tracking-wide border-3 border-black rounded-lg transition-all text-sm ${
                    activeTab === 'daily'
                      ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setActiveTab('lifetime')}
                  className={`flex-1 py-2 px-3 font-bold uppercase tracking-wide border-3 border-black rounded-lg transition-all text-sm ${
                    activeTab === 'lifetime'
                      ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  Lifetime
                </button>
              </>
            )}
            {mode === 'streaks' && (
              <div className="w-full py-2 px-3 font-bold uppercase tracking-wide border-3 border-black rounded-lg bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center text-sm">
                <FontAwesomeIcon icon={faFire} className="mr-1" />
                Streak Leaderboard
              </div>
            )}
          </div>

          {/* Leaderboard List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {renderEntries()}
          </div>
        </div>
      </div>
    </>
  );
};
