interface CaptionViewProps {
  caption: string;
  onAddSubmission: () => void;
  hasSubmittedToday?: boolean;
}

export const CaptionView = ({ caption, onAddSubmission, hasSubmittedToday }: CaptionViewProps) => {
  return (
    <>
      <div className="relative bg-paper-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl leading-tight"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {caption}
        </p>
        <img src="/quote.svg" alt="" className="absolute bottom-6 right-6 w-10 md:w-14 opacity-80" />
      </div>

      <button
        className="bg-black text-white border-4 border-black px-10 sm:px-14 md:px-16 py-4 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
        onClick={onAddSubmission}
      >
        <span className="text-base sm:text-lg md:text-xl font-semibold tracking-wider uppercase">
          {hasSubmittedToday ? 'VOTE ON SUBMISSIONS' : 'ADD SUBMISSION'}
        </span>
      </button>
    </>
  );
};
