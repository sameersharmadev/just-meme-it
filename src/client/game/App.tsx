import { useState, useRef, useCallback } from 'react';
import { showForm } from '@devvit/web/client';
import type { TextOverlay } from '../../shared/types/submission';
import { useCaption } from '../hooks/useCaption';
import { useUserStatus } from '../hooks/useUserStatus';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { Layout } from './Layout';
import { CaptionView } from './CaptionView';
import { SubmissionView } from './SubmissionView';
import { VotingQueue } from './VotingQueue';
import { Leaderboard } from '../components/Leaderboard';
import { MyStats } from '../components/MyStats';
import { Header } from '../components/Header';
import { TestPanel } from '../components/TestPanel';

declare const __ENABLE_TEST_PANEL__: boolean;

type Step = 'view' | 'create' | 'voting';

const REQUIRED_VOTES = 5;

export const App = () => {
  const { caption, username, loading, error } = useCaption();
  const { streak, hasSubmittedToday, submittedOderId: serverOderId, userId, refetch: refetchUserStatus } = useUserStatus();
  const [step, setStep] = useState<Step>('view');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'points' | 'streaks'>('points');
  const [showMyStats, setShowMyStats] = useState(false);
  const [sessionOderId, setSessionOderId] = useState<string | null>(null);
  // Use in-session oderId if available, fall back to server-provided one
  const submittedOderId = sessionOderId ?? serverOderId;

  // Debug tap to reveal test panel (5 taps within 2 seconds)
  const DEBUG_TAP_COUNT = 5;
  const DEBUG_TAP_WINDOW = 2000;
  const [showTestPanel, setShowTestPanel] = useState(false);
  const debugTaps = useRef<number[]>([]);

  const handleDebugTap = useCallback(() => {
    if (!__ENABLE_TEST_PANEL__) return;
    const now = Date.now();
    debugTaps.current = [...debugTaps.current.filter((t) => now - t < DEBUG_TAP_WINDOW), now];
    if (debugTaps.current.length >= DEBUG_TAP_COUNT) {
      setShowTestPanel((prev) => !prev);
      debugTaps.current = [];
    }
  }, []);

  const handleAddSubmission = async () => {
    if (hasSubmittedToday) {
      setStep('voting');
      return;
    }

    try {
      const result = await showForm({
        title: 'Upload Your Meme',
        acceptLabel: 'Continue',
        fields: [
          {
            type: 'image' as const,
            name: 'memeImage',
            label: 'Select your meme image',
            required: true,
          },
        ],
      });

      if (result.action === 'SUBMITTED') {
        const imageUrl = result.values.memeImage as string;
        setUploadedImageUrl(imageUrl);
        setOverlays([]);
        setSubmitError(null);
        setStep('create');
      }
      // If cancelled, stay on view
    } catch (err) {
      console.error('Image upload error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to upload image');
    }
  };

  const handleChangeImage = async () => {
    try {
      const result = await showForm({
        title: 'Upload Your Meme',
        acceptLabel: 'Continue',
        fields: [
          {
            type: 'image' as const,
            name: 'memeImage',
            label: 'Select your meme image',
            required: true,
          },
        ],
      });

      if (result.action === 'SUBMITTED') {
        const imageUrl = result.values.memeImage as string;
        setUploadedImageUrl(imageUrl);
        setOverlays([]);
        setSubmitError(null);
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedImageUrl || !caption) {
      setSubmitError('Please select an image first');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetchWithTimeout('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedImageUrl,
          caption,
          overlays: overlays.length > 0 ? overlays : undefined,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setSubmitError('Server returned an unexpected response');
        setSubmitting(false);
        return;
      }

      if (!res.ok || data.status !== 'success') {
        setSubmitError(data.message || data.error || 'Failed to submit meme');
        setSubmitting(false);
        return;
      }

      setSessionOderId(data.submission?.oderId ?? null);
      setSubmitSuccess(true);
      setSubmitting(false);
      setStep('voting');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit meme');
      setSubmitting(false);
    }
  };

  const handleVotingComplete = () => {
    void refetchUserStatus();
  };

  const handleShowLeaderboard = () => {
    setUploadedImageUrl(null);
    setSessionOderId(null);
    setLeaderboardMode('points');
    setShowLeaderboard(true);
    setTimeout(() => {
      setStep('view');
      setSubmitSuccess(false);
    }, 2000);
  };

  const handleBack = () => {
    setStep('view');
    setUploadedImageUrl(null);
    setOverlays([]);
    setSubmitError(null);
  };

  const handleStreakClick = () => {
    setLeaderboardMode('streaks');
    setShowLeaderboard(true);
  };

  const handleLeaderboardClick = () => {
    if (showLeaderboard && leaderboardMode === 'points') {
      setShowLeaderboard(false);
    } else {
      setLeaderboardMode('points');
      setShowLeaderboard(true);
    }
  };

  return (
    <>
      <Header
        streak={streak}
        onLeaderboardClick={handleLeaderboardClick}
        onStreakClick={handleStreakClick}
        onStatsClick={() => setShowMyStats(true)}
        onTitleClick={handleDebugTap}
      />

      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        mode={leaderboardMode}
      />

      <MyStats
        isOpen={showMyStats}
        onClose={() => setShowMyStats(false)}
      />

      {__ENABLE_TEST_PANEL__ && showTestPanel && <TestPanel />}

      <Layout showTitle={false}>

      {loading && (
        <>
          <div className="relative bg-paper-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-2xl sm:text-4xl md:text-5xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              Loading today's caption...
            </p>
            <img src="/quote.svg" alt="" className="absolute bottom-6 right-6 w-10 md:w-14 opacity-80" />
          </div>

          <button
            className="bg-gray-900 text-white border-4 border-black px-10 sm:px-14 md:px-16 py-4 cursor-not-allowed opacity-90 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            disabled
          >
            <span className="text-base sm:text-lg md:text-xl font-semibold tracking-wider uppercase">
              ADD SUBMISSION
            </span>
          </button>
        </>
      )}

      {error && (
        <div className="bg-red-500 border-4 border-black rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full">
          <p className="text-xl sm:text-2xl text-white text-center">{error}</p>
        </div>
      )}

      {!loading && !error && caption && step === 'view' && (
        <CaptionView
          caption={caption}
          onAddSubmission={handleAddSubmission}
          hasSubmittedToday={hasSubmittedToday}
        />
      )}

      {!loading && !error && caption && step === 'create' && (
        <SubmissionView
          caption={caption}
          username={username}
          imageUrl={uploadedImageUrl}
          submitting={submitting}
          submitError={submitError}
          submitSuccess={submitSuccess}
          overlays={overlays}
          onOverlaysChange={setOverlays}
          onChangeImage={handleChangeImage}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}

      {!loading && !error && caption && step === 'voting' && (
        <VotingQueue
          caption={caption}
          requiredVotes={REQUIRED_VOTES}
          onComplete={handleVotingComplete}
          onShowLeaderboard={handleShowLeaderboard}
          currentUserId={userId}
          submittedOderId={submittedOderId}
          hasSubmittedToday={hasSubmittedToday}
        />
      )}
    </Layout>
    </>
  );
};
