export type GuessingTarget = {
  participantId: string;
  nickname: string;
};

export type GuessingVote = {
  targetParticipantId: string;
  guessedRealName: string;
};

export type GuessingState = {
  targets: GuessingTarget[];
  realNameOptions: string[];
  myVotes: GuessingVote[];
  votesRequired: number;
  votesSubmitted: number;
  totalVotesRequired: number;
  totalVotesSubmitted: number;
  allParticipantsVoted: boolean;
};

export type GuessingReveal = {
  participantId: string;
  nickname: string;
  realName: string;
};

export type GuessingResults = {
  revealed: GuessingReveal[];
  myScore: {
    correct: number;
    total: number;
  };
};
