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
import { getCaptureOverlayHint } from "@/lib/hangout/camera-capture-hint";
import {
  CAMERA_VIDEO_CONSTRAINTS,
  encodeVideoFrameToJpeg,
} from "@/lib/hangout/camera-frame";
import {
  applyVideoTrackZoom,
  buildZoomPresets,
  getActiveZoomValue,
  isZoomPresetActive,
  readZoomCapabilities,
  type ZoomPreset,
  type ZoomRange,
} from "@/lib/hangout/camera-zoom";
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
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const zoomRangeRef = useRef<ZoomRange | null>(null);
  const warmStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const serverPhotosTakenRef = useRef(photosTaken);
  const pendingUploadsRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());

  const [phase, setPhase] = useState<CameraPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [zoomPresets, setZoomPresets] = useState<ZoomPreset[]>([]);
  const [activeZoom, setActiveZoom] = useState<number | null>(null);
  const [isApplyingZoom, setIsApplyingZoom] = useState(false);
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

  const resetZoomState = useCallback(() => {
    videoTrackRef.current = null;
    zoomRangeRef.current = null;
    setZoomPresets([]);
    setActiveZoom(null);
    setIsApplyingZoom(false);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    warmStreamPromiseRef.current = null;
    videoTrackRef.current = null;
    zoomRangeRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    resetZoomState();
    setPhase("idle");
    setError(null);
  }, [resetZoomState, stopCamera]);

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
    resetZoomState();
    setPhase("opening");
  }, [photosRemaining, phase, resetZoomState]);

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

        const track = stream.getVideoTracks()[0];
        videoTrackRef.current = track ?? null;
        const range = track ? readZoomCapabilities(track) : null;
        zoomRangeRef.current = range;
        const presets = range ? buildZoomPresets(range) : [];
        setZoomPresets(presets);
        setActiveZoom(
          track && presets.length ? getActiveZoomValue(track, presets) : null,
        );

        setPhase("ready");
      } catch (openError) {
        if (cancelled) return;

        stopCamera();
        resetZoomState();
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
  }, [ensureStream, phase, resetZoomState, stopCamera]);

  const handleSelectZoom = useCallback(async (value: number) => {
    const track = videoTrackRef.current;
    const range = zoomRangeRef.current;
    if (!track || !range) return;

    setIsApplyingZoom(true);
    try {
      const applied = await applyVideoTrackZoom(track, value, range);
      setActiveZoom(applied);
    } catch {
      // Zoom is optional; keep the current level on failure.
    } finally {
      setIsApplyingZoom(false);
    }
  }, []);

  const helpText = getCaptureOverlayHint(zoomPresets.length > 0);

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
      resetZoomState();
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
    resetZoomState,
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
            zoomPresets={zoomPresets}
            activeZoom={activeZoom}
            isApplyingZoom={isApplyingZoom}
            helpText={helpText}
            onClose={closeCamera}
            onCapture={() => void takePhoto()}
            onSelectZoom={(value) => void handleSelectZoom(value)}
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
          "inline-flex shrink-0 touch-manipulation rounded-full bg-gradient-pink-highlight p-0.5",
          "active:scale-[0.97]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          "h-20 w-20 sm:h-24 sm:w-24",
        )}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
          <LuCamera
            size={iconSize}
            strokeWidth={1.75}
            className="text-pink-highlight"
            aria-hidden
          />
        </span>
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

function CameraZoomControls({
  presets,
  activeZoom,
  disabled,
  onSelectZoom,
}: {
  presets: ZoomPreset[];
  activeZoom: number | null;
  disabled?: boolean;
  onSelectZoom: (value: number) => void;
}) {
  if (presets.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {presets.map((preset) => {
        const isActive = isZoomPresetActive(activeZoom, preset.value);

        return (
          <button
            key={String(preset.value)}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={`${preset.label} zoom`}
            onClick={() => onSelectZoom(preset.value)}
            className={cn(
              "inline-flex min-w-11 touch-manipulation items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "border-pink-highlight bg-pink/10 text-pink-accent"
                : "border-container-border bg-white text-muted hover:border-lavender-deep/35 hover:text-ink",
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

const ShutterButton = forwardRef(function ShutterButton(
  {
    disabled,
    isCapturing,
    isSaving,
    onClick,
  }: {
    disabled?: boolean;
    isCapturing?: boolean;
    isSaving?: boolean;
    onClick: () => void;
  },
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const isBusy = isCapturing || isSaving;
  const statusLabel = isCapturing
    ? "Capturing photo"
    : isSaving
      ? "Saving photo"
      : "Take photo";

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={isBusy}
      aria-label={statusLabel}
      className={cn(
        "relative flex h-20 w-20 items-center justify-center rounded-full",
        "border-2 bg-white shadow-glow transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        isBusy
          ? "border-pink-highlight/45"
          : "border-lavender-deep/35 hover:scale-[1.03] active:scale-[0.97]",
      )}
    >
      <span className="sr-only">
        {isCapturing ? "Capturing…" : isSaving ? "Saving…" : "Take photo"}
      </span>
      {isBusy ? (
        <>
          <span
            className="absolute inset-1 animate-spin rounded-full border-2 border-pink-highlight/20 border-t-pink-highlight"
            aria-hidden
          />
          <span
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-pastel"
            aria-hidden
          >
            <span className="h-3 w-3 rounded-full border border-white/90 bg-white" />
          </span>
        </>
      ) : (
        <span
          className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-pastel"
          aria-hidden
        >
          <span className="h-11 w-11 rounded-full border-2 border-white/90 bg-white" />
        </span>
      )}
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
  zoomPresets,
  activeZoom,
  isApplyingZoom,
  helpText,
  onClose,
  onCapture,
  onSelectZoom,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  error: string | null;
  flash: boolean;
  isCapturing: boolean;
  isOpening: boolean;
  pendingUploads: number;
  zoomPresets: ZoomPreset[];
  activeZoom: number | null;
  isApplyingZoom: boolean;
  helpText: string;
  onClose: () => void;
  onCapture: () => void;
  onSelectZoom: (value: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const helpId = useId();
  const shutterDisabled = isOpening || isCapturing;
  const zoomDisabled = isOpening || isCapturing || isApplyingZoom;

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
      aria-describedby={helpText ? helpId : undefined}
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
            {pendingUploads > 0 && !error && (
              <SavingOverlay pendingUploads={pendingUploads} />
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
          <CameraZoomControls
            presets={zoomPresets}
            activeZoom={activeZoom}
            disabled={zoomDisabled}
            onSelectZoom={onSelectZoom}
          />
          {helpText ? (
            <p id={helpId} className="text-center text-xs text-muted">
              {helpText}
            </p>
          ) : null}
          <ShutterButton
            ref={shutterRef}
            disabled={shutterDisabled}
            isCapturing={isCapturing}
            isSaving={pendingUploads > 0}
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

function SavingOverlay({ pendingUploads }: { pendingUploads: number }) {
  const label =
    pendingUploads === 1
      ? "Saving photo…"
      : `Saving ${pendingUploads} photos…`;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3 md:bottom-4">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 shadow-soft backdrop-blur-sm"
      >
        <div
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white"
          aria-hidden
        />
        <p className="text-xs font-medium text-white">{label}</p>
      </div>
    </div>
  );
}
