import { media } from '@devvit/media';
import { storeSubmission } from './submission';

export interface SubmitMemeRequest {
  imageDataUrl: string;
  imageType: 'image' | 'gif';
}

export interface SubmitMemeResponse {
  success: boolean;
  oderId?: string;
  redditImageUrl?: string;
  error?: string;
}

export async function handleMemeSubmission(
  userId: string,
  username: string,
  caption: string,
  imageDataUrl: string,
  imageType: 'image' | 'gif'
): Promise<SubmitMemeResponse> {
  try {
    const { mediaUrl } = await media.upload({ url: imageDataUrl, type: imageType });
    const submission = await storeSubmission(userId, username, mediaUrl, caption);
    return {
      success: true,
      oderId: submission.oderId,
      redditImageUrl: mediaUrl,
    };
  } catch (error) {
    console.error('Error submitting meme:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
