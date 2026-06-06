export const CAMERA_ASPECT_RATIO = 4 / 3;
export const CAMERA_MAX_EDGE = 1200;

const DEFAULT_JPEG_QUALITY = 0.78;

export type CenterCropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export function getCenterCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect = CAMERA_ASPECT_RATIO,
): CenterCropRect {
  const sourceAspect = sourceWidth / sourceHeight;

  let sw: number;
  let sh: number;

  if (sourceAspect > targetAspect) {
    sh = sourceHeight;
    sw = Math.round(sourceHeight * targetAspect);
  } else {
    sw = sourceWidth;
    sh = Math.round(sourceWidth / targetAspect);
  }

  return {
    sx: Math.round((sourceWidth - sw) / 2),
    sy: Math.round((sourceHeight - sh) / 2),
    sw,
    sh,
  };
}

export async function encodeVideoFrameToJpeg(
  video: HTMLVideoElement,
  maxEdge = CAMERA_MAX_EDGE,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight) {
    return Promise.reject(new Error("Camera not ready"));
  }

  const { sx, sy, sw, sh } = getCenterCropRect(sourceWidth, sourceHeight);
  const longest = Math.max(sw, sh);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.round(sw * scale);
  const height = Math.round(width / CAMERA_ASPECT_RATIO);

  const canvas:
    | HTMLCanvasElement
    | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = (canvas as HTMLCanvasElement | OffscreenCanvas)
    .getContext("2d") as CanvasRenderingContext2D | null;
  if (!context) {
    return Promise.reject(new Error("Could not capture frame"));
  }

  if (typeof createImageBitmap !== "undefined") {
    const bitmap = await createImageBitmap(video, sx, sy, sw, sh);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
  } else {
    context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  }

  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({
      type: "image/jpeg",
      quality,
    });
    if (!blob) {
      throw new Error("Could not encode photo");
    }
    return blob;
  }

  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not encode photo"));
      },
      "image/jpeg",
      quality,
    );
  });
}

export const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  aspectRatio: { ideal: CAMERA_ASPECT_RATIO },
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 960, max: 1440 },
};
