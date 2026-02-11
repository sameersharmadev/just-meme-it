import '../index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const TITLES = [
  'YOUR MEME COULD WIN',
  'CAPTION THIS',
  'PROVE YOUR MEME GAME',
  'MEME LORDS WANTED',
  'SHOW US WHAT YOU GOT',
  'TODAY\'S CHALLENGE AWAITS',
];

export const Splash = () => {
  const [mounted, setMounted] = useState(false);
  const [titleIdx] = useState(() => Math.floor(Math.random() * TITLES.length));
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{
        background: '#00EB90',
        minHeight: '100vh',
        fontFamily: "'Impact', 'Arial Black', 'Haettenschweiler', sans-serif",
      }}
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      {/* Background halftone dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #000 1.2px, transparent 1.2px)`,
          backgroundSize: '16px 16px',
        }}
      />

      {/* Diagonal stripes accent — top-left */}
      <div
        className="absolute -top-8 -left-8 w-40 h-40 opacity-[0.08] pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            #000,
            #000 3px,
            transparent 3px,
            transparent 10px
          )`,
          borderRadius: '0 0 100% 0',
        }}
      />

      {/* Floating comic elements */}
      <svg
        className="absolute pointer-events-none"
        style={{
          top: '8%',
          right: '8%',
          width: '48px',
          height: '48px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'rotate(12deg) scale(1)' : 'rotate(-30deg) scale(0)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
        }}
        viewBox="0 0 40 40"
        fill="none"
      >
        {/* Star burst */}
        <path
          d="M20 0L24.5 13.8L38 8L28 20L38 32L24.5 26.2L20 40L15.5 26.2L2 32L12 20L2 8L15.5 13.8Z"
          fill="#FBBF24"
          stroke="#000"
          strokeWidth="2"
        />
      </svg>

      <svg
        className="absolute pointer-events-none"
        style={{
          bottom: '12%',
          left: '6%',
          width: '36px',
          height: '36px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'rotate(-8deg) scale(1)' : 'rotate(30deg) scale(0)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s',
        }}
        viewBox="0 0 32 32"
        fill="none"
      >
        {/* Lightning bolt */}
        <path
          d="M18 2L6 18H15L13 30L26 14H17L18 2Z"
          fill="#FBBF24"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Small circle accent */}
      <div
        className="absolute rounded-full border-[3px] border-black pointer-events-none"
        style={{
          width: 20,
          height: 20,
          bottom: '20%',
          right: '12%',
          background: '#FF6B6B',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-8 w-full max-w-md">

        {/* "JUST MEME IT" title with stacked, staggered blocks */}
        <div
          className="flex flex-col items-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.22, 0.68, 0, 1.02) 0.1s',
          }}
        >
          {/* JUST */}
          <div
            className="border-4 border-black px-3 py-0.5 bg-white relative"
            style={{
              transform: 'rotate(-2deg)',
              boxShadow: '3px 3px 0 0 rgba(0,0,0,1)',
              marginBottom: '-6px',
              zIndex: 1,
            }}
          >
            <span
              className="text-black tracking-[0.15em] block"
              style={{
                fontSize: 'clamp(14px, 4vw, 20px)',
                letterSpacing: '0.2em',
                lineHeight: 1.3,
              }}
            >
              JUST
            </span>
          </div>

          {/* MEME */}
          <div
            className="border-4 border-black px-4 py-1 bg-[#FBBF24] relative"
            style={{
              transform: 'rotate(1deg)',
              boxShadow: '4px 4px 0 0 rgba(0,0,0,1)',
              zIndex: 2,
            }}
          >
            <span
              className="text-black block"
              style={{
                fontSize: 'clamp(36px, 12vw, 64px)',
                lineHeight: 1,
                letterSpacing: '0.04em',
              }}
            >
              MEME
            </span>
          </div>

          {/* IT */}
          <div
            className="border-4 border-black px-3 py-0.5 bg-black relative"
            style={{
              transform: 'rotate(-1.5deg)',
              boxShadow: '3px 3px 0 0 rgba(251,191,36,1)',
              marginTop: '-6px',
              zIndex: 3,
            }}
          >
            <span
              className="text-white tracking-[0.3em] block"
              style={{
                fontSize: 'clamp(18px, 5vw, 28px)',
                lineHeight: 1.3,
              }}
            >
              IT
            </span>
          </div>
        </div>

        {/* Tagline — rotating text */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease 0.35s',
          }}
        >
          <p
            className="text-black text-center font-bold uppercase"
            style={{
              fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
              fontSize: 'clamp(11px, 3vw, 15px)',
              letterSpacing: '0.12em',
              lineHeight: 1.4,
              opacity: 0.7,
            }}
          >
            {TITLES[titleIdx]}
          </p>
        </div>

        {/* CTA button */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)',
            transition: 'all 0.5s cubic-bezier(0.22, 0.68, 0, 1.02) 0.5s',
          }}
        >
          <button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            onClick={(e) => {
              e.stopPropagation();
              requestExpandedMode(e.nativeEvent, 'game');
            }}
            className="relative border-4 border-black rounded-xl cursor-pointer"
            style={{
              background: '#000',
              padding: '14px 40px',
              boxShadow: pressed
                ? '2px 2px 0 0 rgba(0,0,0,1)'
                : '5px 5px 0 0 rgba(0,0,0,1)',
              transform: pressed ? 'translate(3px, 3px)' : 'translate(0, 0)',
              transition: 'all 0.1s ease',
            }}
          >
            <span
              className="text-white uppercase tracking-[0.15em] block"
              style={{
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                fontSize: 'clamp(16px, 5vw, 22px)',
                lineHeight: 1,
              }}
            >
              TAP TO PLAY
            </span>
          </button>
        </div>

        {/* Bottom flavor text */}
        <p
          className="text-center"
          style={{
            fontFamily: "'Arial', sans-serif",
            fontSize: '11px',
            color: 'rgba(0,0,0,0.4)',
            letterSpacing: '0.05em',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.5s ease 0.7s',
          }}
        >
          DAILY MEME BATTLES &bull; VOTE &bull; COMPETE
        </p>
      </div>

      {/* Bottom edge decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 bg-black"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease 0.2s',
        }}
      />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
