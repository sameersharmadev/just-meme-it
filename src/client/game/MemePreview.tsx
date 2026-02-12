import type { TextOverlay } from '../../shared/types/submission';
import { MemeTextOverlay } from './MemeTextOverlay';
import { MemeTextEditor } from './MemeTextEditor';
import { isValidImageUrl } from '../utils/isValidImageUrl';

interface MemePreviewProps {
  caption: string;
  username: string;
  imageUrl?: string | undefined;
  overlays?: TextOverlay[];
  onOverlaysChange?: (overlays: TextOverlay[]) => void;
}

export const MemePreview = ({ caption, username, imageUrl, overlays = [], onOverlaysChange }: MemePreviewProps) => {
  return (
    <div className="w-full max-w-2xl">
      <div className="bg-[#fbbf24] border-4 border-black p-4 rounded-t-xl relative">
        <p className="text-base sm:text-lg font-semibold text-left" style={{ fontFamily: 'Inter, sans-serif' }}>
          {caption}
        </p>
        <span className="absolute bottom-2 right-4 text-xs font-medium">u/{username}</span>
      </div>

      <div className="border-4 border-t-0 border-black bg-paper-white aspect-video md:aspect-video flex items-center justify-center relative rounded-b-xl overflow-hidden">
        {isValidImageUrl(imageUrl) ? (
          <>
            <img src={imageUrl} alt="Meme" className="w-full h-full object-contain" />
            {onOverlaysChange ? (
              <MemeTextEditor overlays={overlays} onOverlaysChange={onOverlaysChange} />
            ) : (
              <MemeTextOverlay overlays={overlays} />
            )}
          </>
        ) : (
          <div className="text-gray-500 text-lg">Your meme will appear here</div>
        )}
      </div>
    </div>
  );
};
