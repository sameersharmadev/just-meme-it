import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward, faFire } from '@fortawesome/free-solid-svg-icons';
import { mockDailyLeaderboard, mockLifetimeLeaderboard } from '../mocks/leaderboard';
import { mockStreakLeaderboard } from '../mocks/user';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'points' | 'streaks';
}

type LeaderboardTab = 'daily' | 'lifetime' | 'streak';

export const Leaderboard = ({ isOpen, onClose, mode }: LeaderboardProps) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(mode === 'streaks' ? 'streak' : 'daily');
  const dailyData = mockDailyLeaderboard.leaderboard;
  const lifetimeData = mockLifetimeLeaderboard.leaderboard;
  const streakData = mockStreakLeaderboard.leaderboard;
  
  const currentData = 
    activeTab === 'daily' ? dailyData : 
    activeTab === 'lifetime' ? lifetimeData : 
    streakData;

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
            {currentData.map((entry, index) => {
              const rank = index + 1;
              const score = 
                activeTab === 'daily' ? (entry as typeof dailyData[0]).votes :
                activeTab === 'lifetime' ? (entry as typeof lifetimeData[0]).points :
                (entry as typeof streakData[0]).streak;
              
              const key = 
                activeTab === 'daily' ? (entry as typeof dailyData[0]).oderId :
                activeTab === 'lifetime' ? (entry as typeof lifetimeData[0]).userId :
                (entry as typeof streakData[0]).userId;
              
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
                    {score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
