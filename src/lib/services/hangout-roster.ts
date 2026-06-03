import { createClient } from "@/lib/supabase/client";
import { mapHangout, type HangoutRowJson } from "@/lib/supabase/mappers";
import { parseRpcError } from "@/lib/services/rpc-error";
import type { Hangout } from "@/types/hangout";
import type {
  HangoutParticipantsResult,
  HangoutRosterParticipant,
} from "@/types/hangout-roster";

type RosterParticipantJson = {
  id: string;
  nickname: string;
  is_film_keeper: boolean;
  votes_submitted: number | null;
  votes_required: number | null;
  has_finished_guessing: boolean | null;
};

function mapRosterParticipant(row: RosterParticipantJson): HangoutRosterParticipant {
  return {
    id: row.id,
    nickname: row.nickname,
    isFilmKeeper: row.is_film_keeper,
    votesSubmitted: row.votes_submitted,
    votesRequired: row.votes_required,
    hasFinishedGuessing: row.has_finished_guessing,
  };
}

export async function getHangoutParticipants(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: HangoutParticipantsResult; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_hangout_participants", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  const payload = data as {
    participants: RosterParticipantJson[];
    hangout: HangoutRowJson;
  };

  return {
    data: {
      participants: (payload.participants ?? []).map(mapRosterParticipant),
      hangout: mapHangout(payload.hangout),
    },
  };
}

export async function removeParticipantByKeeper(
  hangoutId: string,
  sessionToken: string,
  targetParticipantId: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("remove_participant_by_keeper", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
    p_target_participant_id: targetParticipantId,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}
