import { createClient } from "@/lib/supabase/client";
import { signPhotoPerspectives } from "@/lib/hangout/signed-photo-urls";
import { mapPerspectives } from "@/lib/services/map-perspectives";
import { parseGalleryRpcError } from "@/lib/services/rpc-error";
import type { RevealPerspective } from "@/types/reveal";

type GalleryPerspectiveJson = {
  participant_id: string;
  nickname: string;
  real_name?: string | null;
  is_film_keeper?: boolean | null;
  photos: { id: string; storage_path: string; captured_at: string }[] | null;
};

export type GalleryData = {
  perspectives: RevealPerspective[];
};

export async function getGallery(
  hangoutId: string,
  sessionToken: string,
): Promise<{ data?: GalleryData; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_gallery", {
    p_hangout_id: hangoutId,
    p_session_token: sessionToken,
  });

  if (error) {
    return { error: parseGalleryRpcError(error) };
  }

  const payload = data as { perspectives: GalleryPerspectiveJson[] };

  return {
    data: {
      perspectives: mapPerspectives(payload.perspectives ?? []),
    },
  };
}

export async function signGalleryPhotoUrls(
  perspectives: RevealPerspective[],
): Promise<RevealPerspective[]> {
  return signPhotoPerspectives(perspectives, { includeFileName: true });
}
