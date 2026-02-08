import { useState } from 'react';
import { useCaption } from '../hooks/useCaption';
import { Layout } from './Layout';
import { CaptionView } from './CaptionView';
import { SubmissionView } from './SubmissionView';
import { VotingQueue } from './VotingQueue';
import { TestPanel } from '../components/TestPanel';
import { Leaderboard } from '../components/Leaderboard';
import { Header } from '../components/Header';
import { mockCurrentUser } from '../mocks/user';

type Step = 'view' | 'create' | 'voting';

const REQUIRED_VOTES = 5;

export const App = () => {
  const { caption, username, loading, error } = useCaption();
  const [step, setStep] = useState<Step>('view');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; type: 'image' | 'gif' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'points' | 'streaks'>('points');

  const handleImageSelect = (dataUrl: string, type: 'image' | 'gif') => {
    setSelectedImage({ dataUrl, type });
    setSubmitError(null);
  };

  const handleSubmit = () => {
    if (!selectedImage) {
      setSubmitError('Please select an image first');
      return;
    }

    // Move to voting queue - submission will be finalized after votes
    setStep('voting');
    setSubmitError(null);
  };

  const handleVotingComplete = () => {
    // User completed required votes, submission is now published
    setSubmitSuccess(true);
  };

  const handleShowLeaderboard = () => {
    // All submissions exhausted, show leaderboard
    setSelectedImage(null);
    setLeaderboardMode('points');
    setShowLeaderboard(true);
    setTimeout(() => {
      setStep('view');
      setSubmitSuccess(false);
    }, 2000);
  };

  const handleBack = () => {
    setStep('view');
    setSelectedImage(null);
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
      {/* Fixed Header with Streak and Leaderboard */}
      <Header 
        streak={mockCurrentUser.streak}
        onLeaderboardClick={handleLeaderboardClick}
        onStreakClick={handleStreakClick}
      />

      {/* Leaderboard Modal - Outside Layout to prevent z-index issues */}
      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)}
        mode={leaderboardMode}
      />

      <Layout showTitle={false}>

      <button
        onClick={() => setShowTestPanel(!showTestPanel)}
        className="fixed top-4 right-20 px-3 py-1 bg-gray-800 text-white text-sm rounded z-50"
      >
        {showTestPanel ? 'Hide' : 'Test'} Panel
      </button>
      {showTestPanel && <TestPanel />}

      {loading && (
        <>
          <div className="relative bg-paper-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center">
            <p className="text-2xl sm:text-4xl md:text-5xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              Loading today's caption...
            </p>
            <img src="/quote.svg" alt="" className="absolute bottom-6 right-6 w-10 md:w-14 opacity-80" />
          </div>

          <button
            className="bg-gray-900 text-white border-4 border-black px-10 sm:px-14 md:px-16 py-4 cursor-not-allowed opacity-90"
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
        <CaptionView caption={caption} onAddSubmission={() => setStep('create')} />
      )}

      {!loading && !error && caption && step === 'create' && (
        <SubmissionView
          caption={caption}
          username={username}
          selectedImage={selectedImage}
          submitting={submitting}
          submitError={submitError}
          submitSuccess={submitSuccess}
          onImageSelect={handleImageSelect}
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
        />
      )}
    </Layout>
    </>
  );
};
