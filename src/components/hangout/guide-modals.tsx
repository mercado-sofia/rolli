"use client";

import {
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { IoClose } from "react-icons/io5";

import { SESSION_GUIDE_CONTENT, ROLLI_SESSION_GUIDE_CONTENT } from "@/lib/hangout/setup";
import { cn } from "@/lib/utils";

export function useGuideDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openRef = useRef(open);

  const syncDialogOpen = useCallback((dialog: HTMLDialogElement | null) => {
    if (!dialog) return;

    if (openRef.current && !dialog.open) {
      dialog.showModal();
    } else if (!openRef.current && dialog.open) {
      dialog.close();
    }
  }, []);

  const setDialogRef = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      syncDialogOpen(node);
    },
    [syncDialogOpen],
  );

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    onClose();
  }, [onClose]);

  useLayoutEffect(() => {
    openRef.current = open;
    syncDialogOpen(dialogRef.current);
  }, [open, syncDialogOpen]);

  useLayoutEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog?.open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleDialogClose() {
    onClose();
  }

  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    requestClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  }

  return {
    dialogRef: setDialogRef,
    requestClose,
    handleDialogClose,
    handleCancel,
    handleBackdropClick,
  };
}

type GuideBulletListProps = {
  items: readonly string[];
  className?: string;
};

export function GuideBulletList({ items, className }: GuideBulletListProps) {
  return (
    <ul className={cn("space-y-4", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-left text-sm leading-relaxed text-ink">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-highlight"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function GuideModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        "border border-black/8 bg-white text-ink",
        "outline-none transition-colors hover:bg-black/5 active:scale-95",
      )}
      aria-label="Close"
    >
      <IoClose size={20} aria-hidden />
    </button>
  );
}

type GuideModalShellProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode | ((requestClose: () => void) => ReactNode);
  panelClassName?: string;
  /** Horizontal padding for body (and footer). */
  bodyClassName?: string;
  /** Center title in the panel header row. */
  centerTitle?: boolean;
  /** Top-right × control — off when footer has a dismiss CTA (e.g. session start guide). */
  showHeaderClose?: boolean;
};

export function GuideModalShell({
  open,
  onClose,
  titleId,
  title,
  children,
  footer,
  panelClassName,
  bodyClassName,
  centerTitle = false,
  showHeaderClose = true,
}: GuideModalShellProps) {
  const { dialogRef, requestClose, handleDialogClose, handleCancel } =
    useGuideDialog(open, onClose);

  function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleBackdropLayerClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "confirm-flow-dialog m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden",
        "border-0 bg-transparent p-0 shadow-none",
        "backdrop:bg-black/45 supports-[height:100dvh]:h-dvh",
      )}
      aria-labelledby={titleId}
      aria-hidden={!open}
      onClose={handleDialogClose}
      onCancel={handleCancel}
    >
      {/* Full-viewport layer — dialog itself only sizes to content, so flex centering must live here */}
      <div
        className="flex h-full min-h-0 w-full items-center justify-center p-4 sm:p-6"
        onClick={handleBackdropLayerClick}
      >
        <div
          role="document"
          className={cn(
            "relative flex max-h-[min(88dvh,36rem)] w-[min(100%,24rem)] flex-col overflow-hidden",
            "rounded-3xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.2)]",
            panelClassName,
          )}
          onClick={handlePanelClick}
        >
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-5 pt-5 sm:pt-6",
              bodyClassName ?? "px-5 sm:px-6",
            )}
          >
            {showHeaderClose ? (
              <div
                className={cn(
                  "mb-4",
                  centerTitle
                    ? "grid grid-cols-[1fr_auto_1fr] items-start gap-x-2"
                    : "flex items-start justify-between gap-3",
                )}
              >
                {centerTitle ? <div className="h-9 w-9 shrink-0" aria-hidden /> : null}
                <h2
                  id={titleId}
                  className={cn(
                    "font-display min-w-0 text-xl leading-snug text-ink",
                    centerTitle
                      ? "col-start-2 text-center"
                      : "flex-1",
                  )}
                >
                  {title}
                </h2>
                <div
                  className={cn(
                    "shrink-0",
                    centerTitle && "col-start-3 flex justify-end",
                  )}
                >
                  <GuideModalCloseButton onClose={requestClose} />
                </div>
              </div>
            ) : (
              <h2
                id={titleId}
                className={cn(
                  "font-display mb-4 text-xl leading-snug text-ink",
                  centerTitle && "text-center",
                )}
              >
                {title}
              </h2>
            )}
            <div className="mt-4">{children}</div>
          </div>

          {footer ? (
            <div
              className={cn(
                "shrink-0 border-t border-black/6 py-4",
                bodyClassName ?? "px-5 sm:px-6",
              )}
            >
              {typeof footer === "function" ? footer(requestClose) : footer}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

type SessionGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SessionGuideModal({ open, onClose }: SessionGuideModalProps) {
  const content = SESSION_GUIDE_CONTENT;

  return (
    <GuideModalShell
      open={open}
      onClose={onClose}
      showHeaderClose={false}
      centerTitle
      titleId="session-guide-title"
      title={content.title}
      footer={(requestClose) => (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestClose();
          }}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold",
            "border border-ink bg-ink text-white hover:bg-[#2a2a2a] active:scale-[0.98]",
          )}
        >
          {content.primaryLabel}
        </button>
      )}
    >
      <GuideBulletList items={content.bullets} />
    </GuideModalShell>
  );
}

export function RolliGuideContent() {
  const content = ROLLI_SESSION_GUIDE_CONTENT;

  return (
    <div className="space-y-5">
      {content.sections.map((section) => (
        <section key={section.title}>
          <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
          <GuideBulletList items={section.bullets} className="mt-2.5" />
        </section>
      ))}
    </div>
  );
}

type RolliGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RolliGuideModal({ open, onClose }: RolliGuideModalProps) {
  const content = ROLLI_SESSION_GUIDE_CONTENT;

  return (
    <GuideModalShell
      open={open}
      onClose={onClose}
      titleId="rolli-guide-title"
      title={content.title}
      centerTitle
      bodyClassName="px-8 pb-8 sm:px-10 sm:pb-9"
      panelClassName="w-[min(100%,26rem)]"
    >
      <RolliGuideContent />
    </GuideModalShell>
  );
}
