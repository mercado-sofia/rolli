import { type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, id, className, ...props }: FieldProps) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label htmlFor={id} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
        {hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <input
        id={id}
        suppressHydrationWarning
        {...props}
        className={cn(
          "h-[52px] w-full rounded-2xl border border-black/8 bg-[#FAFAFA] px-4",
          "text-base text-ink placeholder:text-muted/60",
          "transition-[border-color,box-shadow,background-color] duration-200",
          "outline-none focus:border-pink-highlight/40 focus:bg-white focus:ring-4 focus:ring-pink-highlight/10",
          error &&
            "border-pink-accent/30 focus:border-pink-accent/40 focus:ring-pink-accent/10",
          className,
        )}
      />
      {error ? <p className="text-[13px] leading-snug text-pink-accent">{error}</p> : null}
    </div>
  );
}
