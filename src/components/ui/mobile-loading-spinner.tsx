import { cn } from "@/lib/utils";
import { FIXED_VIEWPORT_BLEED_CLASS } from "@/lib/app-page-layout";

type MobileLoadingSpinnerProps = {
  className?: string;
  /** In-flow spinner for page sections; default is a fixed mobile overlay. */
  inline?: boolean;
};

/** Full-viewport loading indicator on small screens; hidden on md+ where skeletons are shown. */
export function MobileLoadingSpinner({
  className,
  inline = false,
}: MobileLoadingSpinnerProps) {
  return (
    <div
      className={cn(
        inline
          ? "flex w-full items-center justify-center"
          : cn(
              FIXED_VIEWPORT_BLEED_CLASS,
              "pointer-events-none z-20 flex items-center justify-center md:hidden",
            ),
        className,
      )}
      aria-live="polite"
      aria-busy="true"
      role="status"
      aria-label="Loading"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-highlight/25 border-t-pink-highlight" />
    </div>
  );
}
