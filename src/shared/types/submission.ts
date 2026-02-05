export type Submission = {
  oderId: string;
  userId: string;
  username: string;
  imageUrl: string;
  caption: string;
  submittedAt: number;
};

export type UserStats = {
  totalScore: number;
  streak: number;
  lastParticipation: string;
  wins: number;
};
