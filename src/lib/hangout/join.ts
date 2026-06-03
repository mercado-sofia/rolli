import { APP_BASE_URL } from "@/lib/constants";
import type { HangoutStatus } from "@/types/hangout";

/** Base URL for invitation links (env in prod, current host in dev). */
function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return APP_BASE_URL.replace(/\/$/, "");
}

export function buildInviteUrl(slug: string, origin?: string): string {
  const base = (origin ?? getAppOrigin()).replace(/\/$/, "");
  return `${base}/h/${slug}`;
}

export function extractSlugFromInviteLink(link: string): string {
  const trimmed = link.trim();
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

/** New guests may join via invite link while the hangout is still in progress. */
const NEW_GUEST_JOINABLE_STATUSES: HangoutStatus[] = [
  "waiting",
  "active",
  "revealing",
  "guessing",
];

/** Prior participants may rejoin with a saved session token until the hangout completes. */
const REJOINABLE_STATUSES: HangoutStatus[] = [
  "waiting",
  "active",
  "developing",
  "revealing",
  "guessing",
];

export function isHangoutJoinable(status: HangoutStatus): boolean {
  return NEW_GUEST_JOINABLE_STATUSES.includes(status);
}

export function isHangoutRejoinable(status: HangoutStatus): boolean {
  return REJOINABLE_STATUSES.includes(status);
}

export function isHangoutInProgress(status: HangoutStatus): boolean {
  return status === "active";
}

/** Footer hint when joining a hangout that has already started capture. */
export function getLateJoinHint(status: HangoutStatus): string | null {
  if (status === "active") {
    return "You can still capture photos after joining.";
  }
  if (status === "revealing") {
    return "The group is viewing photos — you can catch up after joining.";
  }
  if (status === "guessing") {
    return "Guessing is in progress — you can vote after joining.";
  }
  return null;
}

const STORAGE_PREFIX = "rolli-waiting-return:";

export function hangoutInviteReturnPath(slug: string): string {
  return `/h/${slug}`;
}

export function setWaitingReturnPath(slug: string, path: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${slug}`, path);
}

export function getWaitingReturnPath(slug: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return sessionStorage.getItem(`${STORAGE_PREFIX}${slug}`) ?? fallback;
}

export function clearWaitingReturnPath(slug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
}

/** Path to restore when leaving the waiting room after joining from invite or /join. */
export function inferWaitingReturnPathFromJoin(
  slug: string,
  slugFromUrl?: string,
): string {
  if (slugFromUrl) return hangoutInviteReturnPath(slug);
  return `/join?slug=${encodeURIComponent(slug)}`;
}
