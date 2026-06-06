const DEFAULT_MAX_EDGE = 1200;
const DEFAULT_JPEG_QUALITY = 0.78;

export async function encodeVideoFrameToJpeg(
  video: HTMLVideoElement,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight) {
    return Promise.reject(new Error("Camera not ready"));
  }

  const longest = Math.max(sourceWidth, sourceHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

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
    const bitmap = await createImageBitmap(video);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
  } else {
    context.drawImage(video, 0, 0, width, height);
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
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
};
