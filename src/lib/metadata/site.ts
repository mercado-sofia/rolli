import { APP_BASE_URL } from "@/lib/constants";

/** Canonical origin for invite and metadata URLs (must be HTTPS in production). */
export function getMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? APP_BASE_URL;
  return new URL(raw.endsWith("/") ? raw : `${raw}/`);
}

export function getInvitePageUrl(slug: string): string {
  return new URL(`/h/${slug}`, getMetadataBase()).toString();
}
