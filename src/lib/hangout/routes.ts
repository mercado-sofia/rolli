import type { HangoutStatus } from "@/types/hangout";

/** Route for a participant already in this hangout, by status. */
export function hangoutParticipantPath(slug: string, status: HangoutStatus): string {
  switch (status) {
    case "active":
      return `/h/${slug}/session`;
    case "waiting":
      return `/h/${slug}/waiting`;
    case "developing":
      return `/h/${slug}/reveal`;
    case "revealing":
      return `/h/${slug}/reveal`;
    case "guessing":
      return `/h/${slug}/guessing`;
    case "completed":
      return `/h/${slug}/gallery`;
    case "cancelled":
      return `/h/${slug}`;
    default:
      return `/h/${slug}/waiting`;
  }
}

export const HANGOUT_GUESSING_PATH_SUFFIX = "/guessing";
export const HANGOUT_GALLERY_PATH_SUFFIX = "/gallery";
export const HANGOUT_SHARE_PATH_SUFFIX = "/share";

const GUESSING_PATH_SUFFIX = HANGOUT_GUESSING_PATH_SUFFIX;
const GALLERY_PATH_SUFFIX = HANGOUT_GALLERY_PATH_SUFFIX;
const SHARE_PATH_SUFFIX = HANGOUT_SHARE_PATH_SUFFIX;

export function normalizeHangoutPath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

/** Results + memory gallery routes allowed while hangout status is `completed`. */
export function isCompletedPhasePath(slug: string, currentPath: string): boolean {
  const path = normalizeHangoutPath(currentPath);
  return (
    path === `/h/${slug}${GUESSING_PATH_SUFFIX}` ||
    path === `/h/${slug}${GALLERY_PATH_SUFFIX}`
  );
}

export function hangoutSharePath(slug: string): string {
  return `/h/${slug}/share`;
}

export function hangoutGalleryPath(slug: string): string {
  return `/h/${slug}${GALLERY_PATH_SUFFIX}`;
}

export type HangoutRouteRedirectOptions = {
  revealFinishedAt?: string | null;
};

/**
 * Returns the path to redirect to when the user is on the wrong phase page, or null if OK.
 */
export function getHangoutRouteRedirect(
  slug: string,
  currentPath: string,
  status: HangoutStatus,
  options?: HangoutRouteRedirectOptions,
): string | null {
  const path = normalizeHangoutPath(currentPath);
  const canonical = hangoutParticipantPath(slug, status);
  const readyForGuessing = Boolean(options?.revealFinishedAt);
  const revealPath = `/h/${slug}/reveal`;
  const guessingPath = `/h/${slug}${GUESSING_PATH_SUFFIX}`;

  if (status === "revealing") {
    if (path === revealPath && !readyForGuessing) {
      return null;
    }
    if (path === revealPath && readyForGuessing) {
      return guessingPath;
    }
    if (path === guessingPath && readyForGuessing) {
      return null;
    }
    if (path === guessingPath && !readyForGuessing) {
      return revealPath;
    }
  }

  if (path === canonical) {
    return null;
  }

  if (status === "completed" && isCompletedPhasePath(slug, path)) {
    return null;
  }

  if (status === "waiting" && path.endsWith(SHARE_PATH_SUFFIX)) {
    return null;
  }

  if (status === "developing" && path === revealPath) {
    return null;
  }

  if (path === `/h/${slug}/developing`) {
    return revealPath;
  }

  return canonical;
}
