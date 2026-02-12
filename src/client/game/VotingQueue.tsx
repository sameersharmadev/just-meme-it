import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faCheck,
  faArrowRight,
  faForwardStep,
} from '@fortawesome/free-solid-svg-icons';
import type { Submission } from '../../shared/types/submission';
import { MemeTextOverlay } from './MemeTextOverlay';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { isValidImageUrl } from '../utils/isValidImageUrl';

interface VotingQueueProps {
  caption: string;
  requiredVotes: number;
  onComplete: () => void;
  onShowLeaderboard: () => void;
  currentUserId: string | null;
  submittedOderId: string | null;
  hasSubmittedToday: boolean;
}

export const VotingQueue = ({
  caption,
  requiredVotes,
  onComplete,
  onShowLeaderboard,
  currentUserId,
  submittedOderId,
  hasSubmittedToday,
}: VotingQueueProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votesCompleted, setVotesCompleted] = useState(0);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [submissionPublished, setSubmissionPublished] = useState(hasSubmittedToday);
  const [showIntro, setShowIntro] = useState(true);
  const [showFinalizedMessage, setShowFinalizedMessage] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  // Card animation state
  const [cardOffset, setCardOffset] = useState(0);
  const [cardOffsetY, setCardOffsetY] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showVoteHint, setShowVoteHint] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Refs so navigate/drag closures always read fresh values
  const currentIndexRef = useRef(currentIndex);
  const submissionsLenRef = useRef(submissions.length);
  const isNavigatingRef = useRef(false);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { submissionsLenRef.current = submissions.length; }, [submissions.length]);

  // ── Fetch submissions ──────────────────────────────────────────────
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetchWithTimeout('/api/submissions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to fetch submissions');

        const otherSubmissions = (data.submissions as Submission[]).filter((s) => {
          if (submittedOderId && s.oderId === submittedOderId) return false;
          if (currentUserId && s.userId === currentUserId) return false;
          return true;
        });

        const voteChecks = await Promise.all(
          otherSubmissions.map(async (s) => {
            try {
              const voteRes = await fetchWithTimeout(`/api/vote-status/${s.oderId}`);
              const voteData = await voteRes.json();
              return { submission: s, hasVoted: voteData.hasVoted === true, error: false };
            } catch (err) {
              console.error(`Failed to check vote status for ${s.oderId}`, err);
              return { submission: s, hasVoted: false, error: true };
            }
          })
        );
        const unvotedSubmissions = voteChecks
          .filter((c) => !c.error && !c.hasVoted)
          .map((c) => c.submission);
        setSubmissions(unvotedSubmissions.sort(() => Math.random() - 0.5));
        setFetchLoading(false);
      } catch (err) {
        console.error('Failed to fetch submissions', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load submissions');
        setFetchLoading(false);
      }
    };
    void fetchSubmissions();
  }, [currentUserId, submittedOderId]);

  // Auto-finalize if no submissions to vote on (first users)
  useEffect(() => {
    if (!fetchLoading && submissions.length === 0 && !submissionPublished && hasSubmittedToday) {
      setSubmissionPublished(true);
      onComplete();
    }
  }, [fetchLoading, submissions.length, submissionPublished, hasSubmittedToday, onComplete]);

  // ── Timers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => setShowIntro(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  useEffect(() => {
    if (showFinalizedMessage) {
      const t = setTimeout(() => setShowFinalizedMessage(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showFinalizedMessage]);

  // Adjust required votes to available submissions — first users can't be blocked
  const effectiveRequiredVotes = Math.min(requiredVotes, submissions.length);

  const currentSubmission = submissions[currentIndex];
  const isCurrentVoted = currentSubmission ? votedIds.has(currentSubmission.oderId) : false;

  // ── Navigate — stable ref-based, no stale closures ─────────────────
  const navigate = useCallback((direction: 'next' | 'prev') => {
    if (isNavigatingRef.current) return;

    const idx = currentIndexRef.current;
    const len = submissionsLenRef.current;

    // Wrap around
    let nextIdx: number;
    if (direction === 'next') {
      nextIdx = idx >= len - 1 ? 0 : idx + 1;
    } else {
      nextIdx = idx <= 0 ? len - 1 : idx - 1;
    }

    isNavigatingRef.current = true;
    setIsNavigating(true);

    // Phase 1 — slide out
    setTransitionEnabled(true);
    setCardOffset(direction === 'next' ? -120 : 120);

    setTimeout(() => {
      // Phase 2 — swap (no transition)
      setTransitionEnabled(false);
      setCurrentIndex(nextIdx);
      setCardOffset(direction === 'next' ? 120 : -120);

      // Phase 3 — slide in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
          setCardOffset(0);
          setTimeout(() => {
            isNavigatingRef.current = false;
            setIsNavigating(false);
          }, 200);
        });
      });
    }, 180);
  }, []); // stable — reads from refs

  // ── Vote ─────────────────────────────────────────────────────────
  const handleVote = async () => {
    if (!currentSubmission || isCurrentVoted || voting) return;

    setVoting(true);
    try {
      const res = await fetchWithTimeout('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oderId: currentSubmission.oderId }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setVotedIds((prev) => new Set(prev).add(currentSubmission.oderId));
        const newVotesCompleted = votesCompleted + 1;
        setVotesCompleted(newVotesCompleted);

        if (newVotesCompleted >= effectiveRequiredVotes && !submissionPublished) {
          setSubmissionPublished(true);
          setShowFinalizedMessage(true);
          onComplete();
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
    setVoting(false);
  };

  // Ref to call handleVote from drag closure without stale state
  const handleVoteRef = useRef(handleVote);
  useEffect(() => { handleVoteRef.current = handleVote; }, [handleVote]);

  // ── Drag system — horizontal swipe = navigate, vertical swipe up = vote ──
  const startDrag = useCallback((startX: number, startY: number) => {
    if (isNavigatingRef.current) return;

    let phase: 'pending' | 'swipe-x' | 'swipe-y' | 'cancelled' = 'pending';
    let offsetX = 0;
    let offsetY = 0;

    const onMove = (x: number, y: number): boolean => {
      const dx = x - startX;
      const dy = y - startY;

      if (phase === 'pending') {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return false;
        // Decide direction: horizontal or vertical
        if (Math.abs(dx) > Math.abs(dy)) {
          phase = 'swipe-x';
        } else if (dy < 0) {
          // Only upward vertical swipes trigger vote
          phase = 'swipe-y';
        } else {
          phase = 'cancelled';
          return false;
        }
        setTransitionEnabled(false);
      }

      if (phase === 'swipe-x') {
        const w = cardContainerRef.current?.offsetWidth || 400;
        const pct = (dx / w) * 100;
        offsetX = pct;
        setCardOffset(pct);
        return true;
      }

      if (phase === 'swipe-y') {
        const h = cardContainerRef.current?.offsetHeight || 400;
        // Only allow upward (negative dy)
        const pct = Math.min(0, (dy / h) * 100);
        offsetY = pct;
        setCardOffsetY(pct);
        setShowVoteHint(pct < -10);
        return true;
      }

      return false;
    };

    const onEnd = () => {
      cleanup();

      if (phase === 'swipe-x') {
        const elapsed = Date.now() - startTime;
        const w = cardContainerRef.current?.offsetWidth || 400;
        const velocity = (Math.abs(offsetX) / 100) * w / Math.max(elapsed, 1);
        const threshold = velocity > 0.3 ? 8 : 18;

        if (Math.abs(offsetX) > threshold) {
          navigate(offsetX < 0 ? 'next' : 'prev');
        } else {
          setTransitionEnabled(true);
          setCardOffset(0);
        }
      } else if (phase === 'swipe-y') {
        // Swipe up past threshold → vote
        if (offsetY < -20) {
          void handleVoteRef.current();
        }
        setTransitionEnabled(true);
        setCardOffsetY(0);
        setShowVoteHint(false);
      }
    };

    const startTime = Date.now();

    const handleMouseMove = (e: MouseEvent) => { if (onMove(e.clientX, e.clientY)) e.preventDefault(); };
    const handleMouseUp = () => onEnd();
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && onMove(t.clientX, t.clientY)) e.preventDefault();
    };
    const handleTouchEnd = () => onEnd();

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [navigate]);

  // ── Keyboard navigation ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate('prev');
      if (e.key === 'ArrowRight') navigate('next');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // handleVote moved above drag system

  // ── Card transform ─────────────────────────────────────────────────
  const rotation = cardOffset * 0.06;
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${cardOffset}%) translateY(${cardOffsetY}%) rotate(${rotation}deg)`,
    transition: transitionEnabled
      ? 'transform 0.25s cubic-bezier(0.22, 0.68, 0, 1.02), opacity 0.25s ease'
      : 'none',
    opacity: Math.abs(cardOffset) > 100 ? 0 : 1,
  };

  // ── Early-return screens ───────────────────────────────────────────

  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-red-500 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xl text-white text-center font-bold">{fetchError}</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase mb-2">No Submissions Yet</p>
          <p className="text-lg text-black text-center">Check back later when others have submitted their memes</p>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase mb-2">
            Vote on {effectiveRequiredVotes} Submissions
          </p>
          <p className="text-lg text-black text-center mb-6">Swipe to browse, tap vote when you like one</p>
          <button
            onClick={() => setShowIntro(false)}
            className="w-full bg-black text-white border-4 border-black px-8 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg font-bold uppercase tracking-wide">Start Browsing</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
          </button>
        </div>
      </div>
    );
  }

  if (showFinalizedMessage) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
        <div className="bg-yellow-400 border-4 border-black rounded-2xl p-8 w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-2xl text-black text-center font-bold uppercase mb-2">Submission Finalized</p>
          <p className="text-lg text-black text-center mb-6">You can keep browsing and voting</p>
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

  // ── Main render ────────────────────────────────────────────────────

  const progressPct = effectiveRequiredVotes > 0
    ? Math.min((votesCompleted / effectiveRequiredVotes) * 100, 100)
    : 100;
  const progressLabel = submissionPublished ? 'Keep Browsing' : 'Vote to Finalize';
  const progressExtra = submissionPublished && votesCompleted > effectiveRequiredVotes
    ? ` (+${votesCompleted - effectiveRequiredVotes})`
    : '';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl px-4 sm:max-w-lg">

      {/* Horizontal progress bar — mobile only */}
      <div
        className={`sm:hidden border-4 border-black rounded-xl p-4 w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
          submissionPublished ? 'bg-green-400' : 'bg-yellow-400'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold uppercase">{progressLabel}</span>
          <span className="text-lg font-bold">
            {votesCompleted}/{effectiveRequiredVotes}{progressExtra}
          </span>
        </div>
        <div className="w-full bg-white border-2 border-black rounded-full h-3 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Sidebar + Card row (sidebar desktop only) */}
      <div className="flex gap-3 sm:gap-10 sm:-ml-[50px] w-full">
        {/* Vertical progress sidebar — desktop only */}
        <div
          className={`hidden sm:flex flex-col items-center gap-3 border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[56px] ${
            submissionPublished ? 'bg-green-400' : 'bg-yellow-400'
          }`}
        >
          <span className="text-xs font-bold uppercase text-center leading-tight">{progressLabel}</span>
          <div className="flex-1 w-3 bg-white border-2 border-black rounded-full overflow-hidden relative">
            <div
              className="absolute bottom-0 left-0 right-0 bg-black transition-all duration-300 ease-out rounded-full"
              style={{ height: `${progressPct}%` }}
            />
          </div>
          <span className="text-sm font-bold">
            {votesCompleted}/{effectiveRequiredVotes}{progressExtra}
          </span>
        </div>

        {/* Card Area */}
        <div ref={cardContainerRef} className="relative w-full aspect-[3/4] max-h-[55vh] sm:max-h-[70vh]">
          {currentSubmission && (
            <div
              style={cardStyle}
              className="absolute inset-0 bg-paper-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col select-none touch-none"
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) startDrag(t.clientX, t.clientY);
              }}
            >
              {/* Swipe-up vote overlay */}
              {showVoteHint && !isCurrentVoted && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div className="bg-green-500 border-4 border-black rounded-full w-20 h-20 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <FontAwesomeIcon icon={faArrowUp} className="text-white text-3xl" />
                  </div>
                </div>
              )}

              {/* Voted badge */}
              {isCurrentVoted && (
                <div className="absolute top-16 right-3 z-20 bg-green-500 border-3 border-black text-white px-3 py-1 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  <span className="text-xs font-bold uppercase">Voted</span>
                </div>
              )}

              {/* Caption at top */}
              <div className="bg-white border-b-4 border-black p-4">
                <p className="text-xl font-bold text-center line-clamp-2">{caption}</p>
              </div>

              {/* Image */}
              <div className="relative flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                {isValidImageUrl(currentSubmission.imageUrl) ? (
                  <img
                    src={currentSubmission.imageUrl}
                    alt="Submission"
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="text-gray-500 text-lg">Image unavailable</div>
                )}
                {currentSubmission.overlays && currentSubmission.overlays.length > 0 && (
                  <MemeTextOverlay overlays={currentSubmission.overlays} />
                )}
              </div>

              {/* Username + action buttons at bottom */}
              <div className="bg-white border-t-4 border-black px-3 py-2 flex items-center justify-between">
                <p className="text-sm font-semibold truncate">@{currentSubmission.username}</p>
                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => navigate('next')}
                    className="bg-gray-200 border-2 border-black rounded-lg w-8 h-8 flex items-center justify-center hover:bg-gray-300 active:bg-gray-400 transition-colors"
                    aria-label="Skip"
                  >
                    <FontAwesomeIcon icon={faForwardStep} className="text-xs" />
                  </button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => void handleVote()}
                    disabled={isCurrentVoted || voting}
                    className={`border-2 border-black rounded-lg w-8 h-8 flex items-center justify-center transition-colors ${
                      isCurrentVoted ? 'bg-green-400' : 'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600'
                    } disabled:opacity-60`}
                    aria-label="Vote"
                  >
                    <FontAwesomeIcon icon={isCurrentVoted ? faCheck : faArrowUp} className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hint text — mobile */}
      <p className="text-center text-gray-600 text-xs sm:hidden">
        Swipe up to vote and swipe to browse
      </p>

      {/* Hint text — desktop */}
      <p
        className="hidden sm:block text-gray-600 text-xs relative"
        style={{ bottom: '-30px', left: '40px' }}
      >
        Swipe up to vote and swipe to browse
      </p>

    </div>
  );
};
