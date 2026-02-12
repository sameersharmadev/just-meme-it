import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faFire, faStar, faArrowUp } from '@fortawesome/free-solid-svg-icons';

interface MyStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

type MyStatsData = {
  today: { oderId: string; votes: number; rank: number | null } | null;
  stats: { streak: number; wins: number; lifetimeScore: number };
};

export const MyStats = ({ isOpen, onClose }: MyStatsProps) => {
  const [data, setData] = useState<MyStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/user/my-stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (json.status !== 'success') {
          throw new Error(json.message || 'Failed to fetch stats');
        }

        setData({ today: json.today, stats: json.stats });
      } catch (err) {
        console.error('My stats fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
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

    if (!data) return null;

    return (
      <div className="space-y-5">
        {/* Today's Meme Section */}
        <div>
          <h3 className="font-bold uppercase tracking-wide text-sm text-gray-500 mb-3">Today's Meme</h3>
          {data.today ? (
            <div className="bg-white border-3 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faArrowUp} className="text-green-500 text-xl" />
                  <div>
                    <p className="font-bold text-2xl">{data.today.votes}</p>
                    <p className="text-sm text-gray-500">votes</p>
                  </div>
                </div>
                {data.today.rank !== null && (
                  <div className="bg-yellow-400 border-3 border-black rounded-lg px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold text-lg">#{data.today.rank}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-3 border-gray-300 border-dashed rounded-lg p-4 text-center">
              <p className="text-gray-400 font-semibold">No submission today</p>
            </div>
          )}
        </div>

        {/* Your Stats Section */}
        <div>
          <h3 className="font-bold uppercase tracking-wide text-sm text-gray-500 mb-3">Your Stats</h3>
          <div className="space-y-3">
            <div className="bg-white border-3 border-black rounded-lg p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faFire} className="text-orange-500 text-xl" />
                <span className="font-semibold text-lg">Streak</span>
              </div>
              <div className="bg-black text-white px-3 py-1 rounded-md font-bold">
                {data.stats.streak}
              </div>
            </div>

            <div className="bg-white border-3 border-black rounded-lg p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faTrophy} className="text-yellow-400 text-xl" />
                <span className="font-semibold text-lg">Wins</span>
              </div>
              <div className="bg-black text-white px-3 py-1 rounded-md font-bold">
                {data.stats.wins}
              </div>
            </div>

            <div className="bg-white border-3 border-black rounded-lg p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faStar} className="text-purple-500 text-xl" />
                <span className="font-semibold text-lg">Lifetime Score</span>
              </div>
              <div className="bg-black text-white px-3 py-1 rounded-md font-bold">
                {data.stats.lifetimeScore}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
            aria-label="Close stats"
          >
            ×
          </button>

          {/* Title */}
          <div className="mb-6">
            <div className="w-full py-2 px-3 font-bold uppercase tracking-wide border-3 border-black rounded-lg bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center text-sm">
              My Stats
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};
