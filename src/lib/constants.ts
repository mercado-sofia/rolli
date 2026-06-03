export const APP_NAME = "rolli";

export const LANDING_NAV_SECTIONS = [
  { id: "hero", label: "Home", shortLabel: "Home" },
  { id: "guide", label: "Guide", shortLabel: "Guide" },
  { id: "perfect-for", label: "Perfect for", shortLabel: "For" },
  { id: "contact", label: "Contact", shortLabel: "Contact" },
] as const;

/** Shown on the landing contact section — update with your real address. */
export const LANDING_CONTACT = {
  email: "syraecia@gmail.com",
} as const;

/** Static files under /public — use these paths in metadata and Image src. */
export const PUBLIC_ASSETS = {
  images: {
    logo: "/images/rolli-logo.png",
  },
} as const;

/** Offset anchor sections below the fixed landing navbar. */
export const LANDING_SECTION_SCROLL_MT =
  "scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0))]";

/** Public site URL used in generated invitation links */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://rolli.app";

export const HANGOUT_LIMITS = {
  maxParticipants: 10,
  minToStart: 2,
  maxToStart: 10,
  maxPhotosPerUser: 10,
  autoEndHours: 24,
  /** Hangouts and photos are removed from the database and storage after this many days. */
  retentionDays: 7,
  hangoutPollMs: 2000,
} as const;

export const NICKNAME_MIN_LENGTH = 2;

export const GUIDE_STEPS = [
  {
    icon: "camera",
    title: "Everyone captures memories anonymously.",
    heading: "Start your shared roll",
    description:
      "Invite friends, pick your vibe, and let everyone add moments without overthinking angles or perfect poses.",
    tip: "Focus on candid moments and real reactions.",
  },
  {
    icon: "film",
    title: "Photos stay hidden until the hangout ends.",
    heading: "Keep photos hidden during the hangout",
    description:
      "Every shot stays private while the hangout is active, so people stay present instead of checking the gallery.",
    tip: "No peeking, no pressure. Just enjoy the event.",
  },
  {
    icon: "moon",
    title: "Every perspective tells a different story.",
    heading: "Reveal and relive together",
    description:
      "When the hangout ends, the full roll appears at once and everyone gets the same surprise reveal experience.",
    tip: "Use the reveal as your group recap moment.",
  },
] as const;

export type GuideSlideIconKey = (typeof GUIDE_STEPS)[number]["icon"];

export type PolaroidIconKey =
  | "flower"
  | "sparkles"
  | "party"
  | "iceCream"
  | "moon"
  | "music";
