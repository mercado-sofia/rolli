import type { Hangout, HangoutStatus } from "@/types/hangout";
import type { Participant } from "@/types/participant";

export type HangoutRowJson = {
  id: string;
  slug: string;
  title: string;
  status: string;
  participant_count: number;
  film_keeper_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  reveal_pending_at?: string | null;
};

export type ParticipantSessionJson = {
  id: string;
  hangout_id: string;
  nickname: string;
  real_name: string | null;
  session_token: string;
  is_film_keeper: boolean;
  photos_taken: number;
  joined_at: string;
  reveal_finished_at?: string | null;
};

const HANGOUT_STATUSES: HangoutStatus[] = [
  "waiting",
  "active",
  "developing",
  "revealing",
  "guessing",
  "completed",
  "cancelled",
];

function toHangoutStatus(value: string): HangoutStatus {
  if (HANGOUT_STATUSES.includes(value as HangoutStatus)) {
    return value as HangoutStatus;
  }
  return "waiting";
}

export function mapHangout(row: HangoutRowJson): Hangout {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: toHangoutStatus(row.status),
    participantCount: row.participant_count,
    filmKeeperId: row.film_keeper_id ?? "",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    revealPendingAt: row.reveal_pending_at ?? null,
  };
}

export function mapParticipant(row: ParticipantSessionJson): Participant {
  return {
    id: row.id,
    hangoutId: row.hangout_id,
    nickname: row.nickname,
    realName: row.real_name ?? "",
    sessionToken: row.session_token,
    isFilmKeeper: row.is_film_keeper,
    photosTaken: row.photos_taken,
    joinedAt: row.joined_at,
    revealFinishedAt: row.reveal_finished_at ?? null,
  };
}
