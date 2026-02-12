import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faFire, faChartSimple } from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
  streak: number;
  onLeaderboardClick: () => void;
  onStreakClick: () => void;
  onStatsClick: () => void;
  onTitleClick?: () => void;
}

export const Header = ({ streak, onLeaderboardClick, onStreakClick, onStatsClick, onTitleClick }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full" onClick={onTitleClick}>
      <div className="flex items-center justify-end gap-3 px-4 py-3">
        {/* Streak Display - Clickable */}
        <button
          onClick={onStreakClick}
          className="flex items-center justify-center bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all min-w-[70px] h-[42px]"
          aria-label="View streak leaderboard"
        >
          <FontAwesomeIcon icon={faFire} className="text-black text-lg" />
          <span className="font-bold text-lg">{streak}</span>
        </button>

        {/* Leaderboard Button */}
        <button
          onClick={onLeaderboardClick}
          className="flex items-center justify-center bg-yellow-400 border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all min-w-[70px] h-[42px]"
          aria-label="Toggle leaderboard"
        >
          <FontAwesomeIcon icon={faTrophy} className="text-lg" />
        </button>

        {/* Stats Button */}
        <button
          onClick={onStatsClick}
          className="flex items-center justify-center bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all min-w-[70px] h-[42px]"
          aria-label="View stats"
        >
          <FontAwesomeIcon icon={faChartSimple} className="text-lg" />
        </button>
      </div>
    </header>
  );
};
