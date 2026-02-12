import { useRef, useState, useEffect } from 'react';
import type { TextOverlay } from '../../shared/types/submission';

interface MemeTextOverlayProps {
  overlays: TextOverlay[];
}

export const MemeTextOverlay = ({ overlays }: MemeTextOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth);

    return () => observer.disconnect();
  }, []);

  if (overlays.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className="meme-text absolute whitespace-pre-wrap text-center"
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: containerWidth > 0 ? `${(overlay.fontSize / 100) * containerWidth}px` : `${overlay.fontSize}px`,
            maxWidth: '90%',
          }}
        >
          {overlay.text}
        </div>
      ))}
    </div>
  );
};
