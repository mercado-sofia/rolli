import { cn } from "@/lib/utils";

/** Horizontal padding for the app page shell (MobileShell variant="app") */
export const APP_SHELL_PADDING_X = "px-3.5 sm:px-5 md:px-7";

/** Horizontal padding for footer / primary buttons (tighter than main content) */
export const APP_ACTION_PADDING_X = "px-2 sm:px-3 md:px-4";

/** Pull setup footers past inner content padding so CTAs read wider than the body */
export const SETUP_FLOW_FOOTER_BLEED_X = "-mx-4 sm:-mx-7 md:-mx-8";

/** Horizontal padding for headers, forms, and cards */
export const APP_CONTENT_PADDING_X = "px-4 sm:px-7 md:px-8";

/** Bottom safe-area padding for scrollable app shells */
export const APP_SAFE_BOTTOM = "pb-[max(1.5rem,env(safe-area-inset-bottom))]";

/** Vertical shell padding for app pages */
export const APP_SHELL_PY = "pt-6 sm:pt-8 md:pt-9";

/** Max width of the app page column (MobileShell inner) */
export const APP_SHELL_MAX_WIDTH =
  "max-w-md md:max-w-[28rem] lg:max-w-[34rem]";

/** Wider shell for split-panel setup flows on desktop */
export const APP_SETUP_SHELL_MAX_WIDTH =
  "max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl";

/** Max width for centered hints / footer actions in setup flows */
export const APP_ACTION_MAX_WIDTH = "mx-auto w-full max-w-md md:max-w-lg";

/** Outer MobileShell classes for setup / wizard pages */
export const SETUP_FLOW_SHELL_CLASS = cn(
  APP_SETUP_SHELL_MAX_WIDTH,
  "flex min-h-dvh max-h-dvh flex-col overflow-hidden py-0! supports-[height:100dvh]:min-h-dvh supports-[height:100dvh]:max-h-dvh",
  "md:h-auto md:max-h-none md:min-h-[calc(100dvh-3rem)] md:overflow-visible",
  "lg:min-h-[calc(100dvh-4rem)]",
);

/**
 * Mobile: header → main → footer stack.
 * Desktop (md+): left = nav + headings, right = fields + actions.
 */
export const SETUP_FLOW_INNER_CLASS = cn(
  "flex min-h-0 flex-1 flex-col",
  APP_CONTENT_PADDING_X,
  "pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-6 md:pt-8",
  "pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-8",
  "md:grid md:grid-cols-[minmax(13rem,38%)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]",
  "md:items-stretch md:gap-x-8 lg:gap-x-12 xl:gap-x-14",
  "md:px-6 md:pb-8 lg:px-8",
);

/** Less top padding for reveal / guessing / gallery after the hangout ends. */
export const SETUP_FLOW_INNER_COMPACT_CLASS = cn(
  SETUP_FLOW_INNER_CLASS,
  "pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4 md:pt-5",
);

/** White card surface for the right panel only (desktop) */
export const SETUP_FLOW_RIGHT_PANEL_SURFACE =
  "md:bg-white md:shadow-soft";

/** Left panel — back, progress, title; sits on canvas (desktop) */
export const SETUP_FLOW_HEADER_CLASS = cn(
  "shrink-0",
  "md:col-start-1 md:row-start-1 md:row-span-2",
  "md:self-start md:sticky md:top-8",
  "md:pr-4 lg:pr-6",
);

export const SETUP_FLOW_HEADER_COMPACT_CLASS = SETUP_FLOW_HEADER_CLASS;

/** Right panel — scrollable body */
export const SETUP_FLOW_MAIN_CLASS = cn(
  "flex min-h-0 flex-1 flex-col",
  "overflow-y-auto overscroll-y-contain",
  "md:col-start-2 md:row-start-1 md:overflow-y-auto md:overscroll-y-contain",
  SETUP_FLOW_RIGHT_PANEL_SURFACE,
  "md:rounded-t-[1.75rem] md:border md:border-b-0 md:border-container-border",
  "md:px-8 md:pt-8 lg:px-10 lg:pt-9",
);

/** Vertically center short content in the right panel */
export const SETUP_FLOW_MAIN_CENTER_CLASS = "justify-center md:py-6";

/** Keep content at the top of the right panel (e.g. waiting room) */
export const SETUP_FLOW_MAIN_UPPER_CLASS = "justify-start md:pt-2";

export const SETUP_FLOW_MAIN_INNER_CLASS = "w-full py-2 md:py-0";

/** Right panel — hint + CTAs below fields */
export const SETUP_FLOW_FOOTER_CLASS = cn(
  "relative z-10 shrink-0 border-t border-container-border/60 pt-4",
  SETUP_FLOW_FOOTER_BLEED_X,
  APP_ACTION_PADDING_X,
  "md:col-start-2 md:row-start-2",
  SETUP_FLOW_RIGHT_PANEL_SURFACE,
  "md:rounded-b-[1.75rem] md:border md:border-container-border",
  "md:mx-0 md:px-8 md:pb-8 md:pt-6 lg:px-10 lg:pb-9",
);

export const SETUP_FLOW_FOOTER_INNER_CLASS =
  "flex w-full flex-col items-stretch gap-4 md:gap-5";

export const SETUP_FLOW_FOOTER_HINT_CLASS = cn(
  "text-center text-sm leading-relaxed text-muted md:text-left md:text-base",
);

/** Choice cards — stacked in the right panel on desktop */
export const APP_CHOICE_GRID_CLASS =
  "grid grid-cols-1 gap-4 md:flex md:flex-col md:gap-5";

/** Form width — centered on mobile, full width in the right panel on desktop */
export const APP_SETUP_FORM_MAX_WIDTH =
  "mx-auto w-full max-w-lg md:mx-0 md:max-w-none";

/** Raised panel on tablet+ so app pages read as a card on wide screens */
export const APP_SHELL_DESKTOP_FRAME =
  "md:rounded-[1.75rem] md:border md:border-container-border md:bg-white md:shadow-soft";

/** Vertical inset on desktop — panel floats on the canvas */
export const APP_SHELL_DESKTOP_INSET = "md:my-6 lg:my-8";

/** Primary CTA at the bottom of app / setup flows */
export const APP_PRIMARY_BUTTON_CLASS = "h-[54px] w-full";

/** Hangout session CTAs — pink-highlight gradient (not landing purple→pink) */
export const HANGOUT_PINK_GRADIENT_BUTTON_CLASS = cn(
  "border border-pink-highlight/40 bg-gradient-pink-highlight text-white",
  "hover:brightness-[1.03] active:scale-[0.98]",
);

/** Multi-column photo grids (gallery, etc.) */
export const APP_PHOTO_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-4";

/** Perspective folder grid — 2 cols when ≤2 folders, 3 cols when 3+. */
export function galleryFolderGridClass(folderCount: number) {
  return cn(
    "grid gap-3 sm:gap-4",
    folderCount >= 3 ? "grid-cols-3" : "grid-cols-2",
  );
}

/** Min height for gallery loading spinners (page shell + experience). */
export const GALLERY_LOADING_MIN_HEIGHT_CLASS = "min-h-[40vh] md:min-h-112";

/**
 * Minimum bleed above/below the layout viewport when safe-area env vars are 0
 * (common in mobile browser chrome). ~44px matches iOS status bar height.
 */
const MOBILE_STATUS_BAR_BLEED = "2.75rem";
const MOBILE_HOME_INDICATOR_BLEED = "1.25rem";

/**
 * Fixed layer that fills the full device viewport, including status bar and home
 * indicator regions when viewport-fit=cover is enabled (iOS Safari).
 */
export const FIXED_VIEWPORT_BLEED_CLASS = cn(
  "fixed inset-x-0 w-full",
  `top-[calc(-1*max(env(safe-area-inset-top,0px),${MOBILE_STATUS_BAR_BLEED}))]`,
  "right-[calc(-1*max(env(safe-area-inset-right,0px),0px))]",
  `bottom-[calc(-1*max(env(safe-area-inset-bottom,0px),${MOBILE_HOME_INDICATOR_BLEED}))]`,
  "left-[calc(-1*max(env(safe-area-inset-left,0px),0px))]",
  `min-h-[calc(100dvh+max(env(safe-area-inset-top,0px),${MOBILE_STATUS_BAR_BLEED})+max(env(safe-area-inset-bottom,0px),${MOBILE_HOME_INDICATOR_BLEED}))]`,
  `supports-[height:100dvh]:min-h-[calc(100dvh+max(env(safe-area-inset-top,0px),${MOBILE_STATUS_BAR_BLEED})+max(env(safe-area-inset-bottom,0px),${MOBILE_HOME_INDICATOR_BLEED}))]`,
);

/** Header/footer above the developing overlay on mobile (title + CTAs stay readable). */
export const DEVELOPING_FLOW_CHROME_CLASS = cn(
  "relative z-40 bg-white",
  // Parent shell adds safe-area top padding — bleed white into the status bar gap.
  `before:pointer-events-none before:absolute before:-top-[max(${MOBILE_STATUS_BAR_BLEED},env(safe-area-inset-top,0px))] before:-left-[100vw] before:-right-[100vw] before:h-[max(${MOBILE_STATUS_BAR_BLEED},env(safe-area-inset-top,0px))] before:bg-white before:content-['']`,
  "md:relative md:z-auto md:bg-transparent md:before:hidden",
);

/** Footer variant — bleed white into the home-indicator safe area. */
export const DEVELOPING_FLOW_FOOTER_CHROME_CLASS = cn(
  DEVELOPING_FLOW_CHROME_CLASS,
  `after:pointer-events-none after:absolute after:-bottom-[max(${MOBILE_HOME_INDICATOR_BLEED},env(safe-area-inset-bottom,0px))] after:-left-[100vw] after:-right-[100vw] after:h-[max(${MOBILE_HOME_INDICATOR_BLEED},env(safe-area-inset-bottom,0px))] after:bg-white after:content-['']`,
  "md:after:hidden",
);

/**
 * Full-screen white developing backdrop (mobile portal).
 * Top/bottom inset keeps centered content clear of page header and footer.
 */
export const DEVELOPING_MOBILE_OVERLAY_CLASS = cn(
  FIXED_VIEWPORT_BLEED_CLASS,
  "z-30 flex flex-col bg-white md:hidden",
  "justify-center",
  "pt-[max(7.25rem,calc(env(safe-area-inset-top)+5.25rem))]",
  "pb-[max(11rem,calc(env(safe-area-inset-bottom)+8.5rem))]",
);

/** White (#FFF) app container with 1px #FFEDF5 border */
export const APP_CONTAINER_SURFACE = "border border-container-border bg-white";

/** Rounded app page container (cards, dialogs) */
export const APP_CONTAINER_CLASS = `${APP_CONTAINER_SURFACE} rounded-3xl`;

/** Same border as default — waiting room and other neutral cards */
export const APP_CONTAINER_SURFACE_NEUTRAL = APP_CONTAINER_SURFACE;

export const APP_CONTAINER_CLASS_NEUTRAL = `${APP_CONTAINER_SURFACE_NEUTRAL} rounded-3xl`;
