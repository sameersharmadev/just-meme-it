export type Submission = {
  oderId: string;
  userId: string;
  username: string;
  imageUrl: string;
  caption: string;
  submittedAt: number;
};

export type UserStats = {
  username: string;
  streak: number;
  lastParticipation: string;
  wins: number;
};
