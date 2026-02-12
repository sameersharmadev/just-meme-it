export type TextOverlay = {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // percentage of container width
};

export type Submission = {
  oderId: string;
  userId: string;
  username: string;
  imageUrl: string;
  caption: string;
  submittedAt: number;
  overlays?: TextOverlay[];
};

export type UserStats = {
  username: string;
  streak: number;
  lastParticipation: string;
  wins: number;
};
