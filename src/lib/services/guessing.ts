import { createClient } from "@/lib/supabase/client";
import { mapHangout, type HangoutRowJson } from "@/lib/supabase/mappers";
import type { Hangout } from "@/types/hangout";
import { parseGuessingRpcError } from "@/lib/services/rpc-error";
import type {
  GuessingResults,
  GuessingState,
  GuessingTarget,
  GuessingVote,
} from "@/types/guessing";

type GuessingStateJson = {
  hangout?: HangoutRowJson;
  targets: { participant_id: string; nickname: string }[];
  real_name_options: string[];
  my_votes: {
    target_participant_id: string;
    guessed_real_name: string;
  }[];
  votes_required: number;
  votes_submitted: number;
  total_votes_required?: number;
  total_votes_submitted?: number;
  all_participants_voted?: boolean;
};

type GuessingResultsJson = {
  revealed: {
    participant_id: string;
    nickname: string;
    real_name: string;
  }[];
  my_score: {
    correct: number;
    total: number;
  };
};

export type GuessingStateResponse = {
  state: GuessingState;
  hangout?: Hangout;
};

function mapGuessingState(payload: GuessingStateJson): GuessingStateResponse {
  const totalVotesRequired = payload.total_votes_required ?? 0;
  const totalVotesSubmitted = payload.total_votes_submitted ?? 0;

  return {
    hangout: payload.hangout ? mapHangout(payload.hangout) : undefined,
    state: {
      targets: (payload.targets ?? []).map(
        (target): GuessingTarget => ({
          participantId: target.participant_id,
          nickname: target.nickname,
        }),
      ),
      realNameOptions: payload.real_name_options ?? [],
      myVotes: (payload.my_votes ?? []).map(
        (vote): GuessingVote => ({
          targetParticipantId: vote.target_participant_id,
          guessedRealName: vote.guessed_real_name,
        }),
      ),
      votesRequired: payload.votes_required ?? 0,
      votesSubmitted: payload.votes_submitted ?? 0,
      totalVotesRequired,
      totalVotesSubmitted,
      allParticipantsVoted:
        payload.all_participants_voted ??
        totalVotesSubmitted >= totalVotesRequired,
    },
  };
}

function mapGuessingResults(payload: GuessingResultsJson): GuessingResults {
  return {
    revealed: (payload.revealed ?? []).map((row) => ({
      participantId: row.participant_id,
      nickname: row.nickname,
      realName: row.real_name,
    })),
    myScore: {
      correct: payload.my_score?.correct ?? 0,
      total: payload.my_score?.total ?? 0,
    },
  };
}

export async function getGuessingState(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: GuessingStateResponse; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_guessing_state", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseGuessingRpcError(error) };
  }

  return { data: mapGuessingState(data as GuessingStateJson) };
}

export async function submitVote(
  hangoutId: string,
  sessionToken: string,
  targetParticipantId: string,
  guessedRealName: string,
): Promise<{ data?: GuessingStateResponse; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("submit_vote", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
    p_target_participant_id: targetParticipantId,
    p_guessed_real_name: guessedRealName,
  });

  if (error) {
    return { error: parseGuessingRpcError(error) };
  }

  return { data: mapGuessingState(data as GuessingStateJson) };
}

export async function finishGuessing(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("finish_guessing", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseGuessingRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function getGuessingResults(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: GuessingResults; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_guessing_results", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseGuessingRpcError(error) };
  }

  return { data: mapGuessingResults(data as GuessingResultsJson) };
}
