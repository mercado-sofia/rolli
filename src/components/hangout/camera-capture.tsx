"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { LuCamera } from "react-icons/lu";

import { AppBackButton } from "@/components/ui/app-back-button";
import {
  CAMERA_VIDEO_CONSTRAINTS,
  encodeVideoFrameToJpeg,
} from "@/lib/hangout/camera-frame";
import { captureMemory } from "@/lib/hangout/hangout-api";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types/participant";

type CameraCaptureProps = {
  hangoutId: string;
  sessionToken: string;
  participant?: Participant;
  photosTaken: number;
  maxPhotos: number;
  onCaptured: (participant: Participant) => void;
  /** Session page: circular trigger + label below (e.g. "your pov"). */
  appearance?: "default" | "session";
  povLabel?: string;
};

type CameraPhase = "idle" | "opening" | "ready" | "capturing";

/** Portal-mounted <video> is only ref-attached after React commits the overlay. */
function waitForVideoElement(
  videoRef: RefObject<HTMLVideoElement | null>,
  maxFrames = 48,
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    let frames = 0;

    function tryAttach() {
      const video = videoRef.current;
      if (video) {
        resolve(video);
        return;
      }

      frames += 1;
      if (frames >= maxFrames) {
        reject(new Error("Camera not ready"));
        return;
      }

      requestAnimationFrame(tryAttach);
    }

    requestAnimationFrame(tryAttach);
  });
}

function subscribeToClientMount() {
  return () => {};
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

export function CameraCapture({
  hangoutId,
  sessionToken,
  participant,
  photosTaken,
  maxPhotos,
  onCaptured,
  appearance = "default",
  povLabel,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const warmStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const serverPhotosTakenRef = useRef(photosTaken);
  const pendingUploadsRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());

  const [phase, setPhase] = useState<CameraPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  const isSessionMode = appearance === "session";
  const photosRemaining = maxPhotos - photosTaken;
  const isOpening = phase === "opening";
  const isDisabled =
    photosRemaining <= 0 || phase === "capturing" || isOpening;
  const isOverlayOpen = phase !== "idle";

  useEffect(() => {
    serverPhotosTakenRef.current = photosTaken;
  }, [photosTaken]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    warmStreamPromiseRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    setPhase("idle");
    setError(null);
  }, [stopCamera]);

  const triggerFlash = useCallback(() => {
    setFlash(true);
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlash(false);
      flashTimeoutRef.current = null;
    }, 180);
  }, []);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera is not supported on this device.");
    }

    if (streamRef.current) {
      return streamRef.current;
    }

    if (!warmStreamPromiseRef.current) {
      warmStreamPromiseRef.current = navigator.mediaDevices
        .getUserMedia({
          video: CAMERA_VIDEO_CONSTRAINTS,
          audio: false,
        })
        .then((stream) => {
          streamRef.current = stream;
          return stream;
        })
        .catch((streamError) => {
          streamRef.current = null;
          throw streamError;
        })
        .finally(() => {
          warmStreamPromiseRef.current = null;
        });
    }

    return warmStreamPromiseRef.current;
  }, []);

  useEffect(() => {
    if (!isOverlayOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCamera();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverlayOpen, closeCamera]);

  const openCamera = useCallback(() => {
    if (photosRemaining <= 0 || phase !== "idle") return;
    setError(null);
    setPhase("opening");
  }, [photosRemaining, phase]);

  useLayoutEffect(() => {
    if (phase !== "opening") return;

    let cancelled = false;

    async function bootCamera() {
      try {
        const video = await waitForVideoElement(videoRef);
        if (cancelled) return;

        const stream = await ensureStream();
        if (cancelled) {
          stopCamera();
          return;
        }

        video.srcObject = stream;
        await video.play();

        if (cancelled) {
          stopCamera();
          return;
        }

        setPhase("ready");
      } catch (openError) {
        if (cancelled) return;

        stopCamera();
        setPhase("idle");
        const message =
          openError instanceof Error ? openError.message : "";
        setError(
          message === "Camera not ready"
            ? "Camera is still loading. Tap again."
            : "Camera access denied. Allow camera permission and try again.",
        );
      }
    }

    void bootCamera();

    return () => {
      cancelled = true;
    };
  }, [ensureStream, phase, stopCamera]);

  const applyOptimisticPhotosTaken = useCallback(() => {
    if (!participant) return;

    onCaptured({
      ...participant,
      photosTaken: serverPhotosTakenRef.current + pendingUploadsRef.current,
    });
  }, [onCaptured, participant]);

  const enqueueUpload = useCallback(
    (blob: Blob) => {
      uploadQueueRef.current = uploadQueueRef.current
        .then(async () => {
          const { data, error: captureError } = await captureMemory({
            hangoutId,
            sessionToken,
            file: blob,
          });

          if (captureError || !data) {
            throw new Error(captureError ?? "Could not save photo");
          }

          pendingUploadsRef.current -= 1;
          setPendingUploads(pendingUploadsRef.current);
          onCaptured({
            ...data.participant,
            photosTaken:
              data.participant.photosTaken + pendingUploadsRef.current,
          });
        })
        .catch((uploadError) => {
          pendingUploadsRef.current -= 1;
          setPendingUploads(pendingUploadsRef.current);
          applyOptimisticPhotosTaken();
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not save photo",
          );
        });
    },
    [applyOptimisticPhotosTaken, hangoutId, onCaptured, sessionToken],
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || phase !== "ready") return;

    if (photosTaken + pendingUploadsRef.current >= maxPhotos) return;

    setPhase("capturing");
    setError(null);

    try {
      const blob = await encodeVideoFrameToJpeg(video);

      if (isSessionMode) {
        pendingUploadsRef.current += 1;
        setPendingUploads(pendingUploadsRef.current);
        applyOptimisticPhotosTaken();
        triggerFlash();
        setPhase("ready");
        enqueueUpload(blob);
        return;
      }

      const { data, error: captureError } = await captureMemory({
        hangoutId,
        sessionToken,
        file: blob,
      });

      if (captureError || !data) {
        throw new Error(captureError ?? "Could not save photo");
      }

      triggerFlash();
      onCaptured(data.participant);
      stopCamera();
      setPhase("idle");
    } catch (captureErr) {
      setPhase("ready");
      setError(
        captureErr instanceof Error
          ? captureErr.message
          : "Could not capture memory",
      );
    }
  }, [
    applyOptimisticPhotosTaken,
    enqueueUpload,
    hangoutId,
    isSessionMode,
    maxPhotos,
    onCaptured,
    phase,
    photosTaken,
    sessionToken,
    stopCamera,
    triggerFlash,
  ]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  const overlay =
    mounted && isOverlayOpen
      ? createPortal(
          <CaptureOverlay
            videoRef={videoRef}
            error={error}
            flash={flash}
            isCapturing={phase === "capturing"}
            isOpening={phase === "opening"}
            pendingUploads={pendingUploads}
            onClose={closeCamera}
            onCapture={() => void takePhoto()}
          />,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {error && !isOverlayOpen && (
          <p className="text-center text-sm text-pink-accent">{error}</p>
        )}
        <CameraTriggerButton
          disabled={isDisabled}
          onClick={openCamera}
          aria-label={
            photosRemaining <= 0 ? "No photos left" : "Capture memory"
          }
          appearance={appearance}
        />
        {appearance === "session" && povLabel ? (
          <p className="max-w-48 truncate text-center text-sm text-pink-muted sm:max-w-none">
            {povLabel}
          </p>
        ) : null}
      </div>
      {overlay}
    </>
  );
}

function CameraAmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-pink/15 blur-3xl" />
      <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-pink-highlight/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 translate-y-1/3 rounded-full bg-lavender/25 blur-3xl" />
    </div>
  );
}

function CameraTriggerButton({
  disabled,
  onClick,
  "aria-label": ariaLabel,
  size = "md",
  appearance = "default",
}: {
  disabled?: boolean;
  onClick: () => void;
  "aria-label": string;
  size?: "md" | "lg";
  appearance?: "default" | "session";
}) {
  const dimensions = size === "lg" ? "h-20 w-20" : "h-18 w-18";
  const iconSize =
    appearance === "session" ? 36 : size === "lg" ? 36 : 34;

  if (appearance === "session") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full border border-black bg-white",
          "active:scale-[0.97]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          "h-20 w-20 sm:h-24 sm:w-24",
        )}
      >
        <LuCamera
          size={iconSize}
          strokeWidth={1.75}
          className="text-pink-highlight"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 touch-manipulation rounded-full border border-lavender-deep/25 bg-gradient-pastel p-px shadow-soft",
        "transition-transform hover:scale-[1.03] active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100",
        dimensions,
      )}
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-white",
          size === "lg" && "shadow-glow",
        )}
      >
        <LuCamera
          size={iconSize}
          strokeWidth={1.75}
          className="text-ink"
          aria-hidden
        />
      </span>
    </button>
  );
}

const ShutterButton = forwardRef(function ShutterButton(
  {
    disabled,
    isCapturing,
    onClick,
  }: {
    disabled?: boolean;
    isCapturing?: boolean;
    onClick: () => void;
  },
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={isCapturing ? "Capturing photo" : "Take photo"}
      className={cn(
        "relative flex h-20 w-20 items-center justify-center rounded-full",
        "border-2 border-lavender-deep/35 bg-white shadow-glow",
        "transition-transform hover:scale-[1.03] active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        isCapturing && "animate-pulse",
      )}
    >
      <span className="sr-only">{isCapturing ? "Capturing…" : "Take photo"}</span>
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-pastel transition-all",
          isCapturing ? "h-8 w-8" : "h-13 w-13",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "rounded-full border-2 border-white/90 bg-white",
            isCapturing ? "h-3 w-3" : "h-11 w-11",
          )}
        />
      </span>
    </button>
  );
});

function CaptureOverlay({
  videoRef,
  error,
  flash,
  isCapturing,
  isOpening,
  pendingUploads,
  onClose,
  onCapture,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  error: string | null;
  flash: boolean;
  isCapturing: boolean;
  isOpening: boolean;
  pendingUploads: number;
  onClose: () => void;
  onCapture: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const helpId = useId();
  const shutterDisabled = isOpening || isCapturing;

  useLayoutEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTarget = shutterRef.current ?? panelRef.current;
    focusTarget?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-200 flex items-stretch justify-center bg-black/55 p-0 md:items-center md:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Capture memory"
      aria-describedby={helpId}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative flex h-full w-full min-h-0 max-w-full flex-col overflow-hidden bg-canvas text-ink",
          "md:max-h-[min(92dvh,840px)] md:max-w-2xl md:rounded-[1.75rem] md:border md:border-container-border md:bg-white md:shadow-soft",
          "lg:max-w-3xl",
        )}
      >
        <CameraAmbientBackground />

        <header
          className={cn(
            "relative z-10 shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
            "md:px-6 md:pb-4 md:pt-6",
          )}
        >
          <div className="relative flex w-full items-center justify-between gap-3">
            <AppBackButton onBack={onClose} backLabel="Close camera" />
            <p className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium uppercase tracking-overline text-pink-muted">
              Capture memory
            </p>
            <div className="h-9 w-9 shrink-0" aria-hidden />
          </div>
        </header>

        <div
          className={cn(
            "relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-2",
            "md:flex-none md:px-6 md:pb-4",
          )}
        >
          <div
            className={cn(
              "relative min-h-[min(42dvh,22rem)] flex-1 overflow-hidden rounded-3xl border border-container-border bg-ink shadow-soft",
              "md:aspect-4/3 md:h-auto md:min-h-0 md:max-h-[min(52vh,32rem)] md:w-full md:flex-none",
            )}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-b from-pink/10 via-transparent to-lavender/15"
              aria-hidden
            />
            {flash && <FlashOverlay />}
            {isOpening && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-lavender/50 backdrop-blur-[2px]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-highlight/25 border-t-pink-highlight" />
                <p className="text-sm font-medium text-pink-accent">
                  Opening camera…
                </p>
              </div>
            )}
          </div>
        </div>

        <footer
          className={cn(
            "relative z-10 flex shrink-0 flex-col items-center gap-3",
            "border-t border-container-border/60 bg-white/95 px-4 pt-4 backdrop-blur-sm",
            "pb-[max(1rem,env(safe-area-inset-bottom))]",
            "md:px-6 md:pb-6 md:pt-5",
          )}
        >
          {error && (
            <p className="max-w-sm rounded-2xl bg-pink/10 px-4 py-2 text-center text-sm text-pink-accent">
              {error}
            </p>
          )}
          {pendingUploads > 0 && !error && (
            <p className="text-center text-xs text-muted">
              Saving {pendingUploads === 1 ? "photo" : `${pendingUploads} photos`}…
            </p>
          )}
          <p id={helpId} className="text-center text-xs text-muted">
            Tap the shutter to capture · Use the back control or Esc to close
          </p>
          <ShutterButton
            ref={shutterRef}
            disabled={shutterDisabled}
            isCapturing={isCapturing}
            onClick={onCapture}
          />
        </footer>
      </div>
    </div>
  );
}

function FlashOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 animate-pulse bg-linear-to-br from-white/80 via-pink/30 to-lavender/20" />
  );
}
