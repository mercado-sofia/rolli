/** Shared step counts for pre–waiting-room setup (start → create/join → identity/link). */
export const SETUP_FLOW_TOTAL_STEPS = 3;

export const setupFlowSteps = {
  start: 1,
  createTitle: 2,
  createIdentity: 3,
  createLinkReady: 3,
  joinLink: 2,
  joinIdentity: 3,
  inviteJoin: 2,
} as const;

export const SESSION_GUIDE_CONTENT = {
  title: "Hangout started",
  bullets: [
    "Tap the camera to capture memories (up to 10 each).",
    "Photos stay hidden until the hangout ends.",
    "The Film Keeper ends the hangout when everyone is done.",
  ],
  primaryLabel: "Got it",
} as const;

export type RolliSessionGuideSection = {
  title: string;
  bullets: readonly string[];
};

export const ROLLI_SESSION_GUIDE_CONTENT = {
  title: "Rolli guide",
  sections: [
    {
      title: "Capturing memories",
      bullets: [
        "Each participant shoots from their own anonymous perspective.",
        "Photos upload while the hangout is active (10 max per person).",
      ],
    },
    {
      title: "Film Keeper",
      bullets: [
        "The Film Keeper hosts the hangout and can end it for everyone.",
        "If the Keeper leaves, host duties pass to the next guest.",
      ],
    },
    {
      title: "After capture",
      bullets: [
        "Memories develop, then reveal by perspective.",
        "Guess who took each shot, then browse the gallery.",
      ],
    },
  ] satisfies readonly RolliSessionGuideSection[],
} as const;

const PENDING_SLUG_KEY = "rolli-session-guide-pending-slug";

function seenKey(hangoutId: string) {
  return `rolli-session-guide-seen-${hangoutId}`;
}

/** Call when the Film Keeper successfully starts the hangout. */
export function markSessionGuidePending(slug: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PENDING_SLUG_KEY, slug);
}

/** True once when landing on session right after start (flag is consumed). */
export function consumeSessionGuidePending(slug: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(PENDING_SLUG_KEY) !== slug) return false;
  sessionStorage.removeItem(PENDING_SLUG_KEY);
  return true;
}

export function hasSeenSessionGuide(hangoutId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(seenKey(hangoutId)) === "1";
}

export function markSessionGuideSeen(hangoutId: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(seenKey(hangoutId), "1");
}
