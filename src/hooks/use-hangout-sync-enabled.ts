"use client";

import { usePathname } from "next/navigation";

import { useInHangoutSession } from "@/hooks/use-in-hangout-session";

/** Skip poll/realtime on the invite landing unless the user already has a session. */
export function useHangoutSyncEnabled(slug: string): boolean {
  const pathname = usePathname();
  const inSession = useInHangoutSession(slug);
  const isInviteRoot = pathname === `/h/${slug}`;

  return !isInviteRoot || inSession;
}
