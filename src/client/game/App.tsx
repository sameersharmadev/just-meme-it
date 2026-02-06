import { useState } from 'react';
import { useCaption } from '../hooks/useCaption';
import { Layout } from './Layout';
import { CaptionView } from './CaptionView';
import { SubmissionView } from './SubmissionView';

type Step = 'view' | 'create';

export const App = () => {
  const { caption, username, loading, error } = useCaption();
  const [step, setStep] = useState<Step>('view');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; type: 'image' | 'gif' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleImageSelect = (dataUrl: string, type: 'image' | 'gif') => {
    setSelectedImage({ dataUrl, type });
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setSubmitError('Please select an image first');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/submit-meme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageDataUrl: selectedImage.dataUrl,
          imageType: selectedImage.type,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitSuccess(true);
        setSelectedImage(null);
        setTimeout(() => {
          setStep('view');
          setSubmitSuccess(false);
        }, 2000);
      } else {
        setSubmitError(result.error || 'Failed to submit meme');
      }
    } catch (err) {
      setSubmitError('Network error: Failed to submit meme');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('view');
    setSelectedImage(null);
    setSubmitError(null);
  };

  return (
    <Layout showTitle={step === 'view'}>
      {loading && (
        <>
          <div className="relative bg-paper-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center">
            <p className="text-2xl sm:text-4xl md:text-5xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              Loading today's caption...
            </p>
            <img src="/quote.svg" alt="" className="absolute bottom-6 right-6 w-10 md:w-14 opacity-80" />
          </div>

          {/* Disabled Add Submission Button */}
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
    </Layout>
  );
};
