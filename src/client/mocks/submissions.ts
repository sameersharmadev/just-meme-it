export interface VotingSubmission {
  oderId: string;
  username: string;
  imageUrl: string;
  caption: string;
  submittedAt: number;
}

export const mockVotingSubmissions: VotingSubmission[] = [
  {
    oderId: 'oder_1770466325743_abc123',
    username: 'meme_wizard',
    imageUrl: 'https://placehold.co/600x400/ff6b6b/ffffff?text=Meme+1',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 3600000,
  },
  {
    oderId: 'oder_1770466325744_def456',
    username: 'gif_master',
    imageUrl: 'https://placehold.co/600x400/4ecdc4/ffffff?text=Meme+2',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 3000000,
  },
  {
    oderId: 'oder_1770466325745_ghi789',
    username: 'dank_dealer',
    imageUrl: 'https://placehold.co/600x400/95e1d3/000000?text=Meme+3',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 2400000,
  },
  {
    oderId: 'oder_1770466325746_jkl012',
    username: 'viral_vibes',
    imageUrl: 'https://placehold.co/600x400/f38181/ffffff?text=Meme+4',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 1800000,
  },
  {
    oderId: 'oder_1770466325747_mno345',
    username: 'spicy_memes',
    imageUrl: 'https://placehold.co/600x400/aa96da/ffffff?text=Meme+5',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 1200000,
  },
  {
    oderId: 'oder_1770466325748_pqr678',
    username: 'top_tier',
    imageUrl: 'https://placehold.co/600x400/fcbad3/000000?text=Meme+6',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 600000,
  },
  {
    oderId: 'oder_1770466325749_stu901',
    username: 'legendary_poster',
    imageUrl: 'https://placehold.co/600x400/ffffd2/000000?text=Meme+7',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 300000,
  },
  {
    oderId: 'oder_1770466325750_vwx234',
    username: 'rookie_star',
    imageUrl: 'https://placehold.co/600x400/a8e6cf/000000?text=Meme+8',
    caption: 'When you finally fix the bug',
    submittedAt: Date.now() - 120000,
  },
];
