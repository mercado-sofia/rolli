import type { IconType } from "react-icons";
import {
  LuCamera,
  LuCake,
  LuFilm,
  LuFlower2,
  LuIceCreamCone,
  LuMartini,
  LuMoon,
  LuMusic2,
  LuPartyPopper,
  LuPlane,
  LuSparkles,
} from "react-icons/lu";

import { cn } from "@/lib/utils";
import type { GuideSlideIconKey, PolaroidIconKey } from "@/lib/constants";

/** Shared stroke weight for landing Lucide icons via react-icons */
export const LANDING_ICON_CLASS =
  "stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]";

const GUIDE_ICON_MAP: Record<GuideSlideIconKey, IconType> = {
  camera: LuCamera,
  film: LuFilm,
  moon: LuMoon,
};

const POLAROID_ICON_MAP: Record<PolaroidIconKey, IconType> = {
  flower: LuFlower2,
  sparkles: LuSparkles,
  party: LuPartyPopper,
  iceCream: LuIceCreamCone,
  moon: LuMoon,
  music: LuMusic2,
};

type LandingIconProps = {
  icon: IconType;
  size?: number;
  className?: string;
};

export function LandingIcon({ icon: Icon, size = 24, className }: LandingIconProps) {
  return (
    <Icon
      size={size}
      className={cn(LANDING_ICON_CLASS, "text-lavender-deep", className)}
      aria-hidden
    />
  );
}

type GuideSlideIconProps = {
  iconKey: GuideSlideIconKey;
  size?: number;
};

export function GuideSlideIcon({ iconKey, size = 48 }: GuideSlideIconProps) {
  const Icon = GUIDE_ICON_MAP[iconKey];

  return (
    <Icon
      size={size}
      className={cn(LANDING_ICON_CLASS, "text-white")}
      aria-hidden
    />
  );
}

type PolaroidIconProps = {
  iconKey: PolaroidIconKey;
  size?: number;
  className?: string;
};

export function PolaroidIcon({ iconKey, size = 22, className }: PolaroidIconProps) {
  const Icon = POLAROID_ICON_MAP[iconKey];

  return (
    <Icon
      size={size}
      className={cn(LANDING_ICON_CLASS, "text-pink-accent", className)}
      aria-hidden
    />
  );
}

export const PERFECT_FOR_ICONS = {
  birthdays: LuCake,
  nightsOut: LuMartini,
  trips: LuPlane,
} as const satisfies Record<string, IconType>;
