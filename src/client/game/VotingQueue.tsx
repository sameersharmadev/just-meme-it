import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faXmark, faCheckCircle, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { mockVotingSubmissions, VotingSubmission } from '../mocks/submissions';

interface VotingQueueProps {
  caption: string;
  requiredVotes: number;
  onComplete: () => void;
  onShowLeaderboard: () => void;
}

export const VotingQueue = ({ caption, requiredVotes, onComplete, onShowLeaderboard }: VotingQueueProps) => {
  const [submissions, setSubmissions] = useState<VotingSubmission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votesCompleted, setVotesCompleted] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [submissionPublished, setSubmissionPublished] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showFinalizedMessage, setShowFinalizedMessage] = useState(false);

  useEffect(() => {
    // Use all submissions, not just required votes amount
    const shuffled = [...mockVotingSubmissions].sort(() => Math.random() - 0.5);
    setSubmissions(shuffled);
  }, []);

  // Auto-skip intro after 2 seconds
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  // Auto-hide finalized message after 2 seconds
  useEffect(() => {
    if (showFinalizedMessage) {
      const timer = setTimeout(() => {
        setShowFinalizedMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFinalizedMessage]);

  const currentSubmission = submissions[currentIndex];
  const hasMoreSubmissions = currentIndex < submissions.length;

  const handleVote = (action: 'vote' | 'skip') => {
    if (isAnimating || !hasMoreSubmissions) return;

    setIsAnimating(true);
    setSwipeDirection(action === 'vote' ? 'right' : 'left');

    setTimeout(() => {
      const newVotesCompleted = votesCompleted + 1;
      setVotesCompleted(newVotesCompleted);

      // Check if we just hit the required votes threshold
      if (newVotesCompleted === requiredVotes && !submissionPublished) {
        setSubmissionPublished(true);
        setShowFinalizedMessage(true);
        onComplete();
      }

      // Move to next submission or finish
      if (currentIndex + 1 >= submissions.length) {
        // All submissions exhausted
        setTimeout(() => {
          onShowLeaderboard();
        }, 500);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setIsAnimating(false);
        setSwipeDirection(null);
      }
    }, 400);
  };

  // Show intro screen
  if (showIntro) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase mb-2">
            Vote on {requiredVotes} Submissions
          </p>
          <p className="text-lg text-black text-center mb-6">
            Finalize your submission by voting
          </p>
            <button
            onClick={() => setShowIntro(false)}
            className="w-full bg-black text-white border-4 border-black px-8 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
            >
            <span className="text-lg font-bold uppercase tracking-wide">Start Voting</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
          </button>
        </div>
      </div>
    );
  }

  // Show finalized message
  if (showFinalizedMessage) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase mb-2">
            Submission Finalized
          </p>
          <p className="text-lg text-black text-center mb-6">
            You can continue voting on more submissions
          </p>
          <button
            onClick={() => setShowFinalizedMessage(false)}
            className="w-full bg-black text-white border-4 border-black px-8 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg font-bold uppercase tracking-wide">Continue</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
          </button>
        </div>
      </div>
    );
  }

  // All submissions exhausted - show final message
  if (!hasMoreSubmissions) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-green-500 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faCheckCircle} className="text-6xl text-white" />
          </div>
          <p className="text-2xl text-white text-center font-bold uppercase">
            All Submissions Reviewed
          </p>
          <p className="text-lg text-white text-center mt-2">
            Opening leaderboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
      {/* Progress Header */}
      <div className={`border-4 border-black rounded-xl p-4 w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
        submissionPublished ? 'bg-green-400' : 'bg-yellow-400'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold uppercase">
            {submissionPublished ? 'Keep Browsing' : 'Vote to Finalize'}
          </span>
          <span className="text-lg font-bold">
            {votesCompleted}/{requiredVotes}
            {submissionPublished && ` (+${votesCompleted - requiredVotes})`}
          </span>
        </div>
        <div className="w-full bg-white border-2 border-black rounded-full h-3 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min((votesCompleted / requiredVotes) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Swipe Card */}
      <div className="relative w-full aspect-[3/4] max-w-md">
        {currentSubmission && (
          <div
            className={`absolute inset-0 bg-paper-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-400 ${
              isAnimating && swipeDirection === 'left'
                ? 'translate-x-[-120%] rotate-[-30deg] opacity-0'
                : isAnimating && swipeDirection === 'right'
                ? 'translate-x-[120%] rotate-[30deg] opacity-0'
                : ''
            }`}
          >
            {/* Caption at top */}
            <div className="bg-white border-b-4 border-black p-4">
              <p className="text-xl font-bold text-center line-clamp-2">{caption}</p>
            </div>

            {/* Image */}
            <div className="relative flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={currentSubmission.imageUrl}
                alt="Submission"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username at bottom */}
            <div className="bg-white border-t-4 border-black p-4">
              <p className="text-lg font-semibold text-center">@{currentSubmission.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={() => handleVote('skip')}
          disabled={isAnimating}
          className="flex-1 bg-white text-black border-4 border-black px-8 py-6 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            <FontAwesomeIcon icon={faXmark} className="text-3xl" />
            <span className="text-lg font-bold uppercase tracking-wide">Skip</span>
          </div>
        </button>

        <button
          onClick={() => handleVote('vote')}
          disabled={isAnimating}
          className="flex-1 bg-yellow-400 text-black border-4 border-black px-8 py-6 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            <FontAwesomeIcon icon={faArrowUp} className="text-3xl" />
            <span className="text-lg font-bold uppercase tracking-wide">Vote</span>
          </div>
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-center text-gray-600 text-sm px-4">
        {submissionPublished 
          ? `Browse remaining submissions (${submissions.length - currentIndex - 1} left)`
          : `Vote on ${requiredVotes} submissions to finalize your meme`
        }
      </p>
    </div>
  );
};
