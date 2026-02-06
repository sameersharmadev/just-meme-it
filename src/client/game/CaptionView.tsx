interface CaptionViewProps {
  caption: string;
  onAddSubmission: () => void;
}

export const CaptionView = ({ caption, onAddSubmission }: CaptionViewProps) => {
  return (
    <>
      <div className="relative bg-paper-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center justify-center">
        <p
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl leading-tight"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {caption}
        </p>
        <img src="/quote.svg" alt="" className="absolute bottom-6 right-6 w-10 md:w-14 opacity-80" />
      </div>

      <button
        className="bg-black text-white border-4 border-black px-10 sm:px-14 md:px-16 py-4 transition-all active:translate-y-[2px] cursor-pointer hover:bg-gray-900"
        onClick={onAddSubmission}
      >
        <span className="text-base sm:text-lg md:text-xl font-semibold tracking-wider uppercase">
          ADD SUBMISSION
        </span>
      </button>
    </>
  );
};
