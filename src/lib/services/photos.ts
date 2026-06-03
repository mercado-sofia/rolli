import { createClient } from "@/lib/supabase/client";
import {
  mapParticipant,
  type ParticipantSessionJson,
} from "@/lib/supabase/mappers";
import { parseRpcError } from "@/lib/services/rpc-error";
import type { Participant } from "@/types/participant";

const BUCKET = "hangout-photos";

export type CaptureMemoryInput = {
  hangoutId: string;
  sessionToken: string;
  file: Blob;
};

export type CaptureMemoryResult = {
  participant: Participant;
  photoId: string;
  storagePath: string;
};

export async function captureMemory(
  input: CaptureMemoryInput,
): Promise<{ data?: CaptureMemoryResult; error?: string }> {
  const supabase = createClient();

  const { data: prepareData, error: prepareError } = await supabase.rpc(
    "prepare_photo_upload",
    {
      p_hangout_id: input.hangoutId,
      p_session_token: input.sessionToken,
    },
  );

  if (prepareError) {
    return { error: parseRpcError(prepareError) };
  }

  const prepared = prepareData as {
    storage_path: string;
    content_type: string;
  };

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(prepared.storage_path, input.file, {
      contentType: prepared.content_type ?? "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message ?? "Could not upload photo" };
  }

  const { data: captureData, error: captureError } = await supabase.rpc(
    "capture_photo",
    {
      p_hangout_id: input.hangoutId,
      p_session_token: input.sessionToken,
      p_storage_path: prepared.storage_path,
    },
  );

  if (captureError) {
    await supabase.storage.from(BUCKET).remove([prepared.storage_path]);
    return { error: parseRpcError(captureError) };
  }

  const payload = captureData as {
    participant: ParticipantSessionJson;
    photo: {
      id: string;
      storage_path: string;
    };
  };

  return {
    data: {
      participant: mapParticipant(payload.participant),
      photoId: payload.photo.id,
      storagePath: payload.photo.storage_path,
    },
  };
}
