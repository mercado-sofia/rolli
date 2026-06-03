import type { RevealPerspective } from "@/types/reveal";

type PerspectivePhotoJson = {
  id: string;
  storage_path: string;
  captured_at: string;
};

type PerspectiveJson = {
  participant_id: string;
  nickname: string;
  real_name?: string | null;
  is_film_keeper?: boolean | null;
  photos: PerspectivePhotoJson[] | null;
};

export function mapPerspectives(rows: PerspectiveJson[]): RevealPerspective[] {
  return rows.map((row) => ({
    participantId: row.participant_id,
    nickname: row.nickname,
    realName: row.real_name ?? undefined,
    isFilmKeeper: row.is_film_keeper ?? undefined,
    photos: (row.photos ?? []).map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      capturedAt: photo.captured_at,
    })),
  }));
}
