import { MemePreview } from './MemePreview';

interface SubmissionViewProps {
  caption: string;
  username: string;
  selectedImage: { dataUrl: string; type: 'image' | 'gif' } | null;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  onImageSelect: (dataUrl: string, type: 'image' | 'gif') => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const SubmissionView = ({
  caption,
  username,
  selectedImage,
  submitting,
  submitError,
  submitSuccess,
  onImageSelect,
  onSubmit,
  onBack,
}: SubmissionViewProps) => {
  return (
    <>
      {submitSuccess && (
        <div className="bg-green-500 border-4 border-black rounded-2xl p-6 w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xl text-white text-center font-semibold">
            Meme submitted successfully! Now vote on others.
          </p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-500 border-4 border-black rounded-2xl p-6 w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-lg text-white text-center">{submitError}</p>
        </div>
      )}

      {selectedImage && !submitError && !submitSuccess && (
        <div className="bg-yellow-400 border-4 border-black rounded-xl p-4 w-full max-w-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-2">
          <p className="text-center font-bold uppercase text-lg">
            Submission will be PENDING until you vote on 5 submissions
          </p>
        </div>
      )}

      <MemePreview
        caption={caption}
        username={username}
        imageUrl={selectedImage?.dataUrl}
        showUpload={!selectedImage}
        onImageSelect={onImageSelect}
        disabled={submitting}
      />

      <div className="flex gap-4 w-full max-w-2xl">
        <button
          className="flex-1 bg-white text-black border-4 border-black px-6 py-4 transition-all active:translate-y-[2px] cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onBack}
          disabled={submitting}
        >
          <span className="text-base sm:text-lg font-semibold tracking-wider uppercase">BACK</span>
        </button>

        {selectedImage && (
          <button
            className="flex-1 bg-black text-white border-4 border-black px-6 py-4 transition-all active:translate-y-[2px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900"
            disabled={submitting}
            onClick={onSubmit}
          >
            <span className="text-base sm:text-lg font-semibold tracking-wider uppercase">
              {submitting ? 'SUBMITTING...' : 'SUBMIT MEME'}
            </span>
          </button>
        )}
      </div>
    </>
  );
};
