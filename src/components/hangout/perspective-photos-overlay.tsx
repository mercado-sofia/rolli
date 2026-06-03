"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

import {
  GuideModalCloseButton,
  useGuideDialog,
} from "@/components/hangout/guide-modals";
import { cn } from "@/lib/utils";
import type { RevealPhoto } from "@/types/reveal";

type PerspectivePhotosOverlayProps = {
  open: boolean;
  onClose: () => void;
  nickname: string;
  photos: RevealPhoto[];
  loading?: boolean;
  loadError?: string | null;
};

function subscribeToClientMount() {
  return () => {};
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

export function PerspectivePhotosOverlay({
  open,
  onClose,
  nickname,
  photos,
  loading = false,
  loadError = null,
}: PerspectivePhotosOverlayProps) {
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const { dialogRef, requestClose, handleDialogClose, handleCancel } =
    useGuideDialog(open, onClose);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className={cn(
        "confirm-flow-dialog m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden",
        "border-0 bg-transparent p-0 shadow-none",
        "backdrop:bg-black/55 supports-[height:100dvh]:h-dvh",
      )}
      aria-labelledby="perspective-photos-title"
      onClose={handleDialogClose}
      onCancel={handleCancel}
    >
      <div className="flex h-full min-h-0 w-full items-center justify-center p-4 sm:p-6">
        <div
          role="document"
          className={cn(
            "relative flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden",
            "rounded-3xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.2)]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-container-border/70 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-overline text-muted">
                  POV PHOTOS
                </p>
                <h2
                  id="perspective-photos-title"
                  className="font-display mt-1 text-xl leading-snug text-ink"
                >
                  {nickname}
                </h2>
              </div>
              <GuideModalCloseButton onClose={requestClose} />
            </div>

            <div>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted">Loading photos…</p>
              ) : null}

              {!loading && loadError ? (
                <p className="py-8 text-center text-sm text-pink">{loadError}</p>
              ) : null}

              {!loading && !loadError && photos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No photos from this perspective.
                </p>
              ) : null}

              {!loading && !loadError && photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3">
                  {photos.map((photo, index) => (
                    <li
                      key={photo.id}
                      className="aspect-3/4 overflow-hidden rounded-2xl border border-container-border bg-[#F8F8F8]"
                    >
                      {photo.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.signedUrl}
                          alt={`${nickname} memory ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">
                          Unavailable
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
