export type HangoutStatus =
  | "waiting"
  | "active"
  | "developing"
  | "revealing"
  | "guessing"
  | "completed"
  | "cancelled";

export type Hangout = {
  id: string;
  slug: string;
  title: string;
  status: HangoutStatus;
  participantCount: number;
  filmKeeperId: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  /** Set when Film Keeper taps Start reveal (before countdown ends). */
  revealPendingAt: string | null;
};
