import { createClient } from "@/lib/supabase/client";
import type { RevealPerspective } from "@/types/reveal";

const SIGNED_URL_TTL_SEC = 3600;
/** Re-sign before Supabase signed URLs expire (~1 hour). */
export const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;

const BUCKET = "hangout-photos";

function fileNameFromStoragePath(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? "photo.jpg";
  return base.includes(".") ? base : `${base}.jpg`;
}

export async function signPhotoPerspectives(
  perspectives: RevealPerspective[],
  options?: { includeFileName?: boolean },
): Promise<RevealPerspective[]> {
  const supabase = createClient();

  const signed = await Promise.all(
    perspectives.map(async (perspective) => {
      const photos = await Promise.all(
        perspective.photos.map(async (photo) => {
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(photo.storagePath, SIGNED_URL_TTL_SEC);

          if (error || !data?.signedUrl) {
            return photo;
          }

          const next = { ...photo, signedUrl: data.signedUrl };

          if (options?.includeFileName) {
            return {
              ...next,
              fileName: fileNameFromStoragePath(photo.storagePath),
            };
          }

          return next;
        }),
      );

      return { ...perspective, photos };
    }),
  );

  return signed;
}
