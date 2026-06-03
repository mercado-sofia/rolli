import type { RevealPerspective } from "@/types/reveal";
import { getRevealState, signRevealPhotoUrls } from "@/lib/hangout/hangout-api";

export type RevealPreloadEntry = {
  perspectives: RevealPerspective[];
  signedAt: number;
};

const cache = new Map<string, RevealPreloadEntry>();

export function setRevealPreload(
  hangoutId: string,
  perspectives: RevealPerspective[],
): void {
  cache.set(hangoutId, { perspectives, signedAt: Date.now() });
}

export function getRevealPreload(hangoutId: string): RevealPreloadEntry | null {
  return cache.get(hangoutId) ?? null;
}

export function clearRevealPreload(hangoutId: string): void {
  cache.delete(hangoutId);
}

export function isRevealPreloadUsable(
  entry: RevealPreloadEntry | null | undefined,
): entry is RevealPreloadEntry {
  if (!entry) return false;

  const photos = entry.perspectives.flatMap((perspective) => perspective.photos);
  if (photos.length === 0) return true;

  return photos.every((photo) => Boolean(photo.signedUrl));
}

export const REVEAL_COUNTDOWN_MS = 3000;
export const REVEAL_COUNTDOWN_EXTENDED_MS = 8000;
export const REVEAL_COUNTDOWN_SECONDS = 3;
export const REVEAL_COUNTDOWN_LARGE_ALBUM_PHOTOS = 10;

export function getRevealCountdownMs(photoCount = 0): number {
  return photoCount > REVEAL_COUNTDOWN_LARGE_ALBUM_PHOTOS
    ? REVEAL_COUNTDOWN_EXTENDED_MS
    : REVEAL_COUNTDOWN_MS;
}

export function getRevealCountdownEndsAt(
  countdownStartedAt: number | null | undefined,
  countdownMs = REVEAL_COUNTDOWN_MS,
): number | null {
  if (countdownStartedAt == null) return null;
  return countdownStartedAt + countdownMs;
}

export function getRevealCountdownDisplaySeconds(
  endsAt: number,
  countdownSeconds = REVEAL_COUNTDOWN_SECONDS,
): number | null {
  const remainingMs = endsAt - Date.now();
  if (remainingMs <= 0) return null;
  return Math.min(countdownSeconds, Math.ceil(remainingMs / 1000));
}

export function isRevealCountdownActive(
  countdownStartedAt: number | null | undefined,
  countdownMs = REVEAL_COUNTDOWN_MS,
): boolean {
  const endsAt = getRevealCountdownEndsAt(countdownStartedAt, countdownMs);
  if (!endsAt) return false;
  return Date.now() < endsAt;
}

function revealPerspectivesHaveSignedUrls(
  perspectives: RevealPerspective[],
): boolean {
  const photos = perspectives.flatMap((perspective) => perspective.photos);
  if (photos.length === 0) return true;
  return photos.every((photo) => Boolean(photo.signedUrl));
}

function collectSignedPhotoUrls(perspectives: RevealPerspective[]): string[] {
  return perspectives.flatMap((perspective) =>
    perspective.photos
      .map((photo) => photo.signedUrl)
      .filter((url): url is string => Boolean(url)),
  );
}

function preloadRevealImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();

  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = url;
        }),
    ),
  ).then(() => undefined);
}

export { preloadRevealAmbientAudio } from "@/lib/hangout/reveal-audio";

export async function preloadRevealState(
  hangoutId: string,
  sessionToken: string,
): Promise<boolean> {
  const existing = getRevealPreload(hangoutId);
  if (isRevealPreloadUsable(existing)) {
    return true;
  }
  if (existing) {
    clearRevealPreload(hangoutId);
  }

  const { data, error } = await getRevealState(hangoutId, sessionToken);
  if (error || !data) {
    return false;
  }

  const signed = await signRevealPhotoUrls(data.perspectives);
  if (!revealPerspectivesHaveSignedUrls(signed)) {
    return false;
  }

  setRevealPreload(hangoutId, signed);
  await preloadRevealImages(collectSignedPhotoUrls(signed));
  return true;
}
