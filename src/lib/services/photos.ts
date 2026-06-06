import { createClient } from "@/lib/supabase/client";
import {
  mapParticipant,
  type ParticipantSessionJson,
} from "@/lib/supabase/mappers";
import { parseRpcError } from "@/lib/services/rpc-error";
import type { Participant } from "@/types/participant";

const BUCKET = "hangout-photos";
const PREPARE_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const CAPTURE_TIMEOUT_MS = 10_000;

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

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

  const prepareResult = (await withTimeout(
    Promise.resolve(
      supabase.rpc("prepare_photo_upload", {
        p_hangout_id: input.hangoutId,
        p_session_token: input.sessionToken,
      }),
    ),
    PREPARE_TIMEOUT_MS,
    "Preparing the photo upload timed out. Try again.",
  )) as { data?: unknown; error?: unknown };

  const { data: prepareData, error: prepareError } = prepareResult;

  if (prepareError) {
    return { error: parseRpcError(prepareError as Error) };
  }

  const prepared = prepareData as {
    storage_path: string;
    content_type: string;
  };

  const { error: uploadError } = await withTimeout(
    supabase.storage.from(BUCKET).upload(prepared.storage_path, input.file, {
      contentType: prepared.content_type ?? "image/jpeg",
      upsert: false,
    }),
    UPLOAD_TIMEOUT_MS,
    "Photo upload timed out. Check your connection and try again.",
  );

  if (uploadError) {
    return { error: uploadError.message ?? "Could not upload photo" };
  }

  const captureResult = (await withTimeout(
    Promise.resolve(
      supabase.rpc("capture_photo", {
        p_hangout_id: input.hangoutId,
        p_session_token: input.sessionToken,
        p_storage_path: prepared.storage_path,
      }),
    ),
    CAPTURE_TIMEOUT_MS,
    "Saving the photo timed out. Try capturing again.",
  )) as { data?: unknown; error?: unknown };

  const { data: captureData, error: captureError } = captureResult;

  if (captureError) {
    await supabase.storage.from(BUCKET).remove([prepared.storage_path]);
    return { error: parseRpcError(captureError as Error) };
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
