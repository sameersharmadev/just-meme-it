import { navigateTo } from '@devvit/web/client';
import { useCaption } from '../hooks/useCaption';

export const App = () => {
  const { caption, date, loading, error } = useCaption();
  
  return (
    <div className="relative flex flex-col justify-center items-center min-h-screen bg-[#00EB90] overflow-hidden px-4 py-8 sm:py-12">
      {/* Decorative Background Elements */}
      <img 
        src="/top-circle.svg" 
        alt="" 
        className="absolute top-0 left-0 w-32 sm:w-40 md:w-48 opacity-60 pointer-events-none"
      />
      <img 
        src="/round-star.svg" 
        alt="" 
        className="absolute bottom-8 right-4 sm:bottom-12 sm:right-8 w-24 sm:w-32 md:w-40 opacity-60 pointer-events-none"
      />
      
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 w-full max-w-2xl lg:max-w-3xl px-2">
        {/* Title Badge */}
        <div className="bg-[#fbbf24] border-4 border-black rounded-xl px-8 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-semibold tracking-tight">
            JUST MEME IT
          </h1>
        </div>
        
        {loading && (
          <div className="relative bg-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center">
            <p className="text-2xl sm:text-4xl md:text-5xl text-center" style={{ fontFamily: 'Inter, sans-serif' }}>Loading today's caption...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500 border-4 border-black rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full">
            <p className="text-xl sm:text-2xl text-white text-center">{error}</p>
          </div>
        )}
        
        {!loading && !error && caption && (
          <>
            {/* Caption Box shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] */}
            <div className="relative bg-white border-4 border-black rounded-2xl p-8 sm:p-10 md:p-12 lg:p-16 w-full min-h-[180px] sm:min-h-[200px] flex items-center">
              <p className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl leading-tight text-left pr-12 sm:pr-16" style={{ fontFamily: 'Inter, sans-serif' }}>
                {caption}
              </p>
              <img 
                src="/quote.svg" 
                alt="" 
                className="absolute bottom-6 right-6 w-10 hidden sm:block md:w-14 opacity-80"
              />
            </div>
          </>
        )}
        
        {/* Add Meme Button */}
        <button 
          className="bg-black text-white border-4 border-black px-10 sm:px-14 md:px-16 py-4 transition-all active:translate-y-[2px] cursor-pointer"
          disabled={loading}
          onClick={() => {
            console.log('Add meme clicked');
          }}
        >
          <span className="text-base sm:text-lg md:text-xl font-semibold tracking-wider uppercase">
            ADD YOUR MEME
          </span>
        </button>
      </div>
    </div>
  );
};
