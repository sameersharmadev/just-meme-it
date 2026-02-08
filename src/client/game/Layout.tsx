interface LayoutProps {
  children: React.ReactNode;
  showTitle?: boolean;
}

export const Layout = ({ children, showTitle = true }: LayoutProps) => {
  return (
    <div className="relative flex flex-col justify-center items-center min-h-screen bg-[#00EB90] overflow-hidden px-4 py-8 sm:py-12 pt-20">
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
        {showTitle && (
          <div className="bg-[#fbbf24] border-4 border-black rounded-xl px-8 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              JUST MEME IT
            </h1>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
