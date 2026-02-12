import { useRef, useState, useCallback, useEffect } from 'react';
import type { TextOverlay } from '../../shared/types/submission';

interface MemeTextEditorProps {
  overlays: TextOverlay[];
  onOverlaysChange: (overlays: TextOverlay[]) => void;
}

export const MemeTextEditor = ({ overlays, onOverlaysChange }: MemeTextEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  const addOverlay = () => {
    if (overlays.length >= 5) return;
    const newOverlay: TextOverlay = {
      id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: 'TAP TO EDIT',
      x: 50,
      y: overlays.length === 0 ? 15 : 85,
      fontSize: 8,
    };
    onOverlaysChange([...overlays, newOverlay]);
  };

  const removeOverlay = (id: string) => {
    onOverlaysChange(overlays.filter((o) => o.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    onOverlaysChange(overlays.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const changeFontSize = (id: string, delta: number) => {
    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;
    const newSize = Math.max(3, Math.min(20, overlay.fontSize + delta));
    updateOverlay(id, { fontSize: newSize });
  };

  const getPosition = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const handleDragStart = (id: string, clientX: number, clientY: number) => {
    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;
    const pos = getPosition(clientX, clientY);
    dragOffset.current = { x: pos.x - overlay.x, y: pos.y - overlay.y };
    setDragging(id);
  };

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging) return;
      const pos = getPosition(clientX, clientY);
      const x = Math.max(0, Math.min(100, pos.x - dragOffset.current.x));
      const y = Math.max(0, Math.min(100, pos.y - dragOffset.current.y));
      updateOverlay(dragging, { x, y });
    },
    [dragging, getPosition, overlays]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  // Mouse events
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientX, e.clientY);
    };
    const onUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleDragMove, handleDragEnd]);

  // Touch events
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleDragMove(touch.clientX, touch.clientY);
    };
    const onEnd = () => handleDragEnd();
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragging, handleDragMove, handleDragEnd]);

  const handleDoubleClick = (id: string) => {
    setEditingId(id);
  };

  const handleTextChange = (id: string, text: string) => {
    if (text.length <= 80) {
      updateOverlay(id, { text });
    }
  };

  const handleTextBlur = () => {
    setEditingId(null);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className="absolute group"
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: dragging === overlay.id ? 'grabbing' : 'grab',
            zIndex: dragging === overlay.id ? 20 : 10,
            maxWidth: '90%',
          }}
          onMouseDown={(e) => {
            if (editingId === overlay.id) return;
            e.preventDefault();
            handleDragStart(overlay.id, e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (editingId === overlay.id) return;
            const touch = e.touches[0];
            if (touch) handleDragStart(overlay.id, touch.clientX, touch.clientY);
          }}
          onDoubleClick={() => handleDoubleClick(overlay.id)}
        >
          {/* Controls */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
            <button
              onClick={(e) => { e.stopPropagation(); changeFontSize(overlay.id, -1); }}
              className="bg-black text-white text-xs px-1.5 py-0.5 rounded font-bold hover:bg-gray-800"
            >
              A-
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); changeFontSize(overlay.id, 1); }}
              className="bg-black text-white text-xs px-1.5 py-0.5 rounded font-bold hover:bg-gray-800"
            >
              A+
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeOverlay(overlay.id); }}
              className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-bold hover:bg-red-700"
            >
              X
            </button>
          </div>

          {editingId === overlay.id ? (
            <input
              autoFocus
              value={overlay.text}
              onChange={(e) => handleTextChange(overlay.id, e.target.value)}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              className="meme-text bg-transparent border-2 border-dashed border-white outline-none text-center"
              style={{
                fontSize: containerWidth > 0 ? `${(overlay.fontSize / 100) * containerWidth}px` : `${overlay.fontSize}px`,
                minWidth: '60px',
              }}
            />
          ) : (
            <div
              className="meme-text whitespace-pre-wrap text-center border-2 border-transparent hover:border-dashed hover:border-white/50"
              style={{
                fontSize: containerWidth > 0 ? `${(overlay.fontSize / 100) * containerWidth}px` : `${overlay.fontSize}px`,
              }}
            >
              {overlay.text}
            </div>
          )}
        </div>
      ))}

      {/* Add Text Button */}
      {overlays.length < 5 && (
        <button
          onClick={addOverlay}
          className="absolute bottom-2 right-2 bg-black/70 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg font-bold hover:bg-black/90 transition-colors z-30"
        >
          + Add Text
        </button>
      )}
    </div>
  );
};
