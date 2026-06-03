"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { APP_CONTAINER_CLASS, APP_PRIMARY_BUTTON_CLASS, HANGOUT_PINK_GRADIENT_BUTTON_CLASS } from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  /** Centered icon above the title (e.g. mood icon for playful confirmations) */
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
  showCancelButton?: boolean;
  dismissible?: boolean;
  /** Confirm button and error tone — pink for destructive hangout actions (abandon). */
  accent?: "pink" | "pink-highlight" | "ink";
};

export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  error = null,
  showCancelButton = true,
  dismissible = true,
  accent = "pink",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "confirm-flow-dialog fixed z-50 m-0 w-full max-w-none border-0 bg-transparent p-0 shadow-none",
        "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,100dvh)]",
        "backdrop:bg-black/50",
        "md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-none",
        "md:w-[min(100vw-2rem,22rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2",
      )}
      onClose={() => {
        if (!dismissible || !onCancel) return;
        onCancel();
      }}
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault();
          return;
        }
        onCancel?.();
      }}
      onClick={(event) => {
        if (!dismissible || !onCancel) return;
        if (event.target === dialogRef.current) {
          onCancel();
        }
      }}
    >
      <div
        className={cn(
          APP_CONTAINER_CLASS,
          "flex max-h-[min(92dvh,100dvh)] flex-col overflow-hidden",
          "rounded-t-[1.75rem] rounded-b-none md:rounded-3xl",
          "px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:py-6",
        )}
      >
        <div
          className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-black/12 md:hidden"
          aria-hidden
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
          <h2 className="text-center font-display text-xl leading-snug text-ink sm:text-[1.35rem]">
            {title}
          </h2>
          <div className="mt-3 text-center text-base leading-relaxed text-muted sm:text-sm">
            {description}
          </div>

          {error ? (
            <p
              className={cn(
                "mt-4 text-center text-base sm:text-sm",
                accent === "ink" ? "text-ink" : "text-pink",
              )}
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex shrink-0 flex-col gap-3 pt-1 sm:mt-6">
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              APP_PRIMARY_BUTTON_CLASS,
              "touch-manipulation",
              accent === "ink"
                ? "border border-ink bg-ink text-white hover:bg-[#2a2a2a]"
                : accent === "pink-highlight"
                  ? HANGOUT_PINK_GRADIENT_BUTTON_CLASS
                  : "bg-pink-accent text-white hover:bg-pink-accent/90",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
          {showCancelButton ? (
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={onCancel}
              className={cn(APP_PRIMARY_BUTTON_CLASS, "touch-manipulation")}
            >
              {cancelLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
