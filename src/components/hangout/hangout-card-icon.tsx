import type { IconType } from "react-icons";

import { LANDING_ICON_CLASS } from "@/components/landing/landing-icons";
import { GradientIconContainer } from "@/components/ui/gradient-icon-container";
import { cn } from "@/lib/utils";

type HangoutCardIconProps = {
  icon: IconType;
  containerClassName?: string;
  iconClassName?: string;
  borderTone?: "default" | "pink" | "ink";
};

export function HangoutCardIcon({
  icon: Icon,
  containerClassName,
  iconClassName,
  borderTone = "default",
}: HangoutCardIconProps) {
  return (
    <div className="flex justify-center">
      <GradientIconContainer
        size="lg"
        borderTone={borderTone}
        className={containerClassName}
      >
        <Icon
          size={32}
          className={cn(LANDING_ICON_CLASS, "text-pink-accent", iconClassName)}
          aria-hidden
        />
      </GradientIconContainer>
    </div>
  );
}
