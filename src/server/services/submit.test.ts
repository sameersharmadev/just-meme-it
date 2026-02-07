import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis, clearMockRedis } from './__mocks__/redis';

const { mockMedia } = vi.hoisted(() => ({
  mockMedia: {
    upload: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({ redis }));
vi.mock('@devvit/media', () => ({ media: mockMedia }));

import { handleMemeSubmission } from './submit';
import { getSubmissionByOderId } from './submission';

describe('submit service', () => {
  beforeEach(() => {
    clearMockRedis();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
    mockMedia.upload.mockReset();
    mockMedia.upload.mockResolvedValue({ mediaUrl: 'https://i.redd.it/uploaded-image.jpg' });
  });

  describe('handleMemeSubmission', () => {
    it('uploads media and stores submission on success', async () => {
      const result = await handleMemeSubmission(
        'user123',
        'TestUser',
        'Funny caption',
        'data:image/png;base64,abc123',
        'image'
      );

      expect(result.success).toBe(true);
      expect(result.oderId).toBeDefined();
      expect(result.redditImageUrl).toBe('https://i.redd.it/uploaded-image.jpg');
    });

    it('calls media.upload with correct parameters', async () => {
      await handleMemeSubmission(
        'user123',
        'TestUser',
        'Caption',
        'data:image/png;base64,abc123',
        'image'
      );

      expect(mockMedia.upload).toHaveBeenCalledWith({
        url: 'data:image/png;base64,abc123',
        type: 'image',
      });
    });

    it('stores submission in Redis after upload', async () => {
      const result = await handleMemeSubmission(
        'user123',
        'TestUser',
        'Funny caption',
        'data:image/png;base64,abc123',
        'image'
      );

      const stored = await getSubmissionByOderId(result.oderId!);
      expect(stored).not.toBeNull();
      expect(stored!.userId).toBe('user123');
      expect(stored!.username).toBe('TestUser');
      expect(stored!.imageUrl).toBe('https://i.redd.it/uploaded-image.jpg');
      expect(stored!.caption).toBe('Funny caption');
    });

    it('returns error when media upload fails', async () => {
      mockMedia.upload.mockRejectedValue(new Error('Upload failed'));

      const result = await handleMemeSubmission(
        'user123',
        'TestUser',
        'Caption',
        'data:image/png;base64,abc123',
        'image'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
      expect(result.oderId).toBeUndefined();
    });

    it('returns error message for non-Error throws', async () => {
      mockMedia.upload.mockRejectedValue('string error');

      const result = await handleMemeSubmission(
        'user123',
        'TestUser',
        'Caption',
        'data:image/png;base64,abc123',
        'image'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('handles gif image type', async () => {
      await handleMemeSubmission(
        'user123',
        'TestUser',
        'Caption',
        'data:image/gif;base64,abc123',
        'gif'
      );

      expect(mockMedia.upload).toHaveBeenCalledWith({
        url: 'data:image/gif;base64,abc123',
        type: 'gif',
      });
    });
  });
});
