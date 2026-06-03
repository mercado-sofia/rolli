import { createClient } from "@/lib/supabase/client";
import { parseRpcError } from "@/lib/services/rpc-error";
import type { ParticipantSessionStatus } from "@/types/participant-session";

export async function getParticipantSessionStatus(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: ParticipantSessionStatus; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_participant_session_status", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  const payload = data as {
    is_active: boolean;
    removed_by_keeper: boolean;
  };

  return {
    data: {
      isActive: payload.is_active,
      removedByKeeper: payload.removed_by_keeper,
    },
  };
}
