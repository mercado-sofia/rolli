import { createClient } from "@/lib/supabase/client";
import {
  mapHangout,
  mapParticipant,
  type HangoutRowJson,
  type ParticipantSessionJson,
} from "@/lib/supabase/mappers";
import { parseRpcError } from "@/lib/services/rpc-error";
import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

export type CreateHangoutInput = {
  title: string;
  nickname: string;
  realName: string;
};

export type JoinHangoutInput = {
  slug: string;
  nickname: string;
  realName: string;
};

export type HangoutSessionResult = {
  hangout: Hangout;
  participant: Participant;
};

export async function createHangoutWithKeeper(
  input: CreateHangoutInput,
): Promise<{ data?: HangoutSessionResult; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_hangout_with_keeper", {
    p_title: input.title,
    p_nickname: input.nickname,
    p_real_name: input.realName,
  });

  if (error) {
    return { error: parseRpcError(error) };
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

export async function joinHangout(
  input: JoinHangoutInput,
): Promise<{ data?: HangoutSessionResult; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_hangout", {
    p_slug: input.slug,
    p_nickname: input.nickname,
    p_real_name: input.realName,
  });

  if (error) {
    return { error: parseRpcError(error) };
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

export async function fetchHangoutBySlug(
  slug: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_hangout_public", {
    p_slug: slug,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  if (!data) {
    return { error: "Hangout not found" };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function startHangout(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("start_hangout", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function endHangout(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("end_hangout", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function abandonHangout(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: Hangout; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("abandon_hangout", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  return { data: mapHangout(data as HangoutRowJson) };
}

export async function leaveHangout(
  hangoutId: string,
  sessionToken: string,
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { error } = await supabase.rpc("leave_hangout", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
  }

  return {};
}

export async function rejoinHangout(
  slug: string,
  sessionToken: string,
): Promise<{ data?: HangoutSessionResult; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("rejoin_hangout", {
    p_slug: slug,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseRpcError(error) };
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
