interface MemePreviewProps {
  caption: string;
  username: string;
  imageUrl?: string | undefined;
  showUpload?: boolean;
  onImageSelect?: (dataUrl: string, type: 'image' | 'gif') => void;
  disabled?: boolean;
}

export const MemePreview = ({ caption, username, imageUrl, showUpload, onImageSelect, disabled }: MemePreviewProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelect) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (PNG, JPEG, WEBP, or GIF)');
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image must be less than 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const imageType = file.type === 'image/gif' ? 'gif' : 'image';
      onImageSelect?.(dataUrl, imageType);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-[#fbbf24] border-4 border-black p-4 rounded-t-xl relative">
        <p className="text-base sm:text-lg font-semibold text-left" style={{ fontFamily: 'Inter, sans-serif' }}>
          {caption}
        </p>
        <span className="absolute bottom-2 right-4 text-xs font-medium">u/{username}</span>
      </div>

      <div className="border-4 border-t-0 border-black bg-paper-white aspect-video md:aspect-video flex items-center justify-center relative rounded-b-xl overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Meme" className="w-full h-full object-contain" />
        ) : showUpload ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onPaste={handlePaste}
            onClick={() => document.getElementById('meme-file-input')?.click()}
            tabIndex={0}
          >
            <input
              id="meme-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
            />
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-700 font-semibold mb-1">Click, drag, or paste your meme</p>
            <p className="text-gray-600 text-sm">PNG, JPEG, WEBP, or GIF • Max 20MB</p>
          </div>
        ) : (
          <div className="text-gray-500 text-lg">Your meme will appear here</div>
        )}
      </div>
    </div>
  );
};
