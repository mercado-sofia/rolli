import { createClient } from "@/lib/supabase/client";
import { signPhotoPerspectives } from "@/lib/hangout/signed-photo-urls";
import { mapPerspectives } from "@/lib/services/map-perspectives";
import { parseRevealRpcError } from "@/lib/services/rpc-error";
import {
  mapHangout,
  mapParticipant,
  type HangoutRowJson,
  type ParticipantSessionJson,
} from "@/lib/supabase/mappers";
import type { Hangout } from "@/types/hangout";
import type {
  MarkReadyForGuessingResult,
  RevealPerspective,
  RevealState,
} from "@/types/reveal";

type RevealPerspectiveJson = {
  participant_id: string;
  nickname: string;
  photos: { id: string; storage_path: string; captured_at: string }[] | null;
};

type RevealStateJson = {
  perspectives: RevealPerspectiveJson[];
  ready_progress?: { ready: number; total: number };
  participant?: ParticipantSessionJson;
  hangout?: HangoutRowJson;
};

export async function signalRevealPending(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("signal_reveal_pending", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRevealRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function startReveal(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("start_reveal", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRevealRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function getRevealState(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: RevealState; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_reveal_state", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRevealRpcError(error) };
  }

  const payload = data as RevealStateJson;

  return {
    data: {
      perspectives: mapPerspectives(payload.perspectives ?? []),
      readyProgress: payload.ready_progress
        ? {
            ready: payload.ready_progress.ready,
            total: payload.ready_progress.total,
          }
        : undefined,
      participant: payload.participant
        ? mapParticipant(payload.participant)
        : undefined,
      hangout: payload.hangout ? mapHangout(payload.hangout) : undefined,
    },
  };
}

export async function markReadyForGuessing(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: MarkReadyForGuessingResult; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("mark_ready_for_guessing", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRevealRpcError(error) };
  }

  const payload = data as {
    hangout: HangoutRowJson;
    participant: ParticipantSessionJson;
  };

  return {
    data: {
      hangout: mapHangout(payload.hangout),
      participant: mapParticipant(payload.participant),
    },
  };
}

export async function signRevealPhotoUrls(
  perspectives: RevealPerspective[],
): Promise<RevealPerspective[]> {
  return signPhotoPerspectives(perspectives);
}
