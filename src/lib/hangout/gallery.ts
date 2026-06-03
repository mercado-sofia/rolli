import JSZip from "jszip";

export { getGallery, signGalleryPhotoUrls } from "@/lib/services/gallery";

export type GalleryPastelTheme = {
  accent: string;
  background: string;
};

/** Ten pastel themes — index 0 is reserved for the host (film keeper). */
export const GALLERY_PASTEL_THEMES: GalleryPastelTheme[] = [
  { accent: "#F4729A", background: "#FFF5F8" },
  { accent: "#A78BFA", background: "#F7F4FF" },
  { accent: "#60A5FA", background: "#F3F8FF" },
  { accent: "#4ADE80", background: "#F3FDF6" },
  { accent: "#FBBF24", background: "#FFFBF0" },
  { accent: "#FB923C", background: "#FFF8F3" },
  { accent: "#2DD4BF", background: "#F2FCFA" },
  { accent: "#C084FC", background: "#FAF6FF" },
  { accent: "#FB7185", background: "#FFF4F6" },
  { accent: "#34D399", background: "#F2FBF7" },
];

export function getGalleryParticipantTheme(
  participantIndexAmongNonHosts: number,
  isFilmKeeper: boolean,
): GalleryPastelTheme {
  if (isFilmKeeper) {
    return GALLERY_PASTEL_THEMES[0];
  }

  const themeIndex = (participantIndexAmongNonHosts % 9) + 1;

  return GALLERY_PASTEL_THEMES[themeIndex];
}

type DownloadPhoto = {
  fileName: string;
  url: string;
};

const MAX_FETCH_ATTEMPTS = 3;
const FETCH_RETRY_DELAY_MS = 400;

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 64);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchPhotoBlob(url: string): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      return await response.blob();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Could not download photo");
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await sleep(FETCH_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    lastError?.message ??
      "Could not download a photo. Check your connection and try again.",
  );
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadPhotosAsZip(
  zipName: string,
  photos: DownloadPhoto[],
): Promise<void> {
  if (photos.length === 0) {
    throw new Error("No photos to download");
  }

  const zip = new JSZip();

  await Promise.all(
    photos.map(async (photo, index) => {
      const blob = await fetchPhotoBlob(photo.url);
      const fileName =
        photo.fileName || `memory-${String(index + 1).padStart(2, "0")}.jpg`;
      zip.file(fileName, blob);
    }),
  );

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(zipBlob, sanitizeFileName(zipName) + ".zip");
}

export async function downloadSinglePhoto(
  url: string,
  fileName: string,
): Promise<void> {
  const blob = await fetchPhotoBlob(url);
  triggerBlobDownload(blob, sanitizeFileName(fileName));
}
